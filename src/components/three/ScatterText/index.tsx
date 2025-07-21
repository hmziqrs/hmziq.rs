'use client'

import { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { ScatterTextSharedMemory } from '@/lib/wasm/scatter-text'
import { useWASM } from '@/contexts/WASMContext'
import { fragmentShader, vertexShader } from './shaders'
import { ScatterTextProps, PixelData, PixelGeneratorProps, ScatterRendererProps } from './types'

function calculateFontSize(text: string, containerWidth: number, containerHeight: number): number {
  const baseSize = containerHeight * 0.85
  const textLengthFactor = Math.max(0.35, 1 - (text.length - 4) * 0.075)
  const widthConstraint = containerWidth / (text.length * 0.6)
  const fontSize = Math.min(baseSize * textLengthFactor, widthConstraint)

  return Math.max(40, Math.min(fontSize, 500))
}

// Component 1: Generate pixel data
function PixelGenerator({
  text,
  fontFamily,
  color,
  skip,
  containerWidth,
  containerHeight,
  onPixelsGenerated,
}: PixelGeneratorProps) {
  const { wasmModule } = useWASM()

  const generatePixels = () => {
    try {
      if (!wasmModule) return

      const memory = new ScatterTextSharedMemory(wasmModule, 10000)

      const fontSize = calculateFontSize(text, containerWidth, containerHeight)

      console.log(
        `Dynamic font size: ${fontSize}px for text: "${text}" (${containerWidth}x${containerHeight})`
      )

      // Generate text pixels
      const generated = memory.generateTextPixels(text, fontSize, fontFamily, color)

      // Ensure we have a Uint8ClampedArray for PixelData
      const pixelData =
        generated.pixelData instanceof Uint8ClampedArray
          ? generated.pixelData
          : new Uint8ClampedArray(generated.pixelData)

      // Set pixels in WASM with proper centering
      // Use container dimensions for proper centering
      const particleCount = wasmModule.set_text_pixels(
        generated.pixelData,
        generated.width,
        generated.height,
        containerWidth,
        containerHeight,
        skip
      )

      console.log(`Generated ${particleCount} particles for text: ${text}`)

      // Pass data to parent
      onPixelsGenerated(
        { pixelData, width: generated.width, height: generated.height, particleCount },
        wasmModule
      )
    } catch (error) {
      console.error('Failed to generate pixels:', error)
    }
  }

  useEffect(() => {
    generatePixels()
  }, [text, fontFamily, color, skip, containerWidth, containerHeight, onPixelsGenerated, wasmModule])

  return null
}

// Component 2: Render scatter text
function ScatterRenderer({ pixelData, wasmModule, autoAnimate }: ScatterRendererProps) {
  const { size } = useThree()
  const meshRef = useRef<THREE.Points>(null)
  const [sharedMemory, setSharedMemory] = useState<ScatterTextSharedMemory | null>(null)

  useEffect(() => {
    console.log('FIRST EFFECT')
    if (!wasmModule) return

    const memory = new ScatterTextSharedMemory(wasmModule, 10000)
    setSharedMemory(memory)

    // Update particle positions for the actual canvas size
    // Canvas size might differ from container size
    wasmModule.set_text_pixels(
      pixelData.pixelData,
      pixelData.width,
      pixelData.height,
      size.width,
      size.height,
      4 // skip
    )

    console.log(`Updated particles for canvas size: ${size.width}x${size.height}`)
  }, [wasmModule, pixelData, size.width, size.height])

  // Create geometry and material
  // Note: In development, React Strict Mode will cause this to run twice to detect side effects
  const { geometry, material } = useMemo(() => {
    console.log('MEMOIZING geometry')
    if (!sharedMemory) {
      return { geometry: null, material: null }
    }
    console.log('Creating geometry')

    const geometry = new THREE.BufferGeometry()
    const MAX_PARTICLES = 10000

    // Create buffer attributes with fixed sizes
    const positions = new Float32Array(MAX_PARTICLES * 3)
    const colors = new Float32Array(MAX_PARTICLES * 3)
    const opacities = new Float32Array(MAX_PARTICLES)

    // Fill with default values
    for (let i = 0; i < MAX_PARTICLES; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0
      colors[i * 3] = 1
      colors[i * 3 + 1] = 1
      colors[i * 3 + 2] = 1
      opacities[i] = 0
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1))

    // Create shader material
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    return { geometry, material }
  }, [sharedMemory])

  // Auto-animation effect (form once and stay)
  useEffect(() => {
    if (!autoAnimate || !wasmModule) return

    // Form the text and keep it formed
    wasmModule.start_forming()
  }, [autoAnimate, wasmModule])

  // Update particles
  useFrame((_, delta) => {
    if (!wasmModule || !sharedMemory || !geometry || !material) return

    try {
      // Update particles in WASM
      sharedMemory.updateFrame(wasmModule, delta)

      // Update Three.js geometry from shared memory
      const positionAttribute = geometry.attributes.position as THREE.BufferAttribute
      const colorAttribute = geometry.attributes.color as THREE.BufferAttribute
      const opacityAttribute = geometry.attributes.opacity as THREE.BufferAttribute

      // Get arrays
      const positions = positionAttribute.array as Float32Array
      const colors = colorAttribute.array as Float32Array
      const opacities = opacityAttribute.array as Float32Array

      const particleCount = Math.min(wasmModule.get_particle_count(), 10000)

      // Copy data from shared memory to Three.js buffers
      for (let i = 0; i < particleCount; i++) {
        // Ensure we don't exceed buffer bounds
        if (i >= sharedMemory.positions_x.length) break

        // Position (convert from screen space to world space)
        positions[i * 3] = sharedMemory.positions_x[i] - size.width / 2
        positions[i * 3 + 1] = -sharedMemory.positions_y[i] + size.height / 2
        positions[i * 3 + 2] = 0

        // Color
        colors[i * 3] = sharedMemory.colors_r[i]
        colors[i * 3 + 1] = sharedMemory.colors_g[i]
        colors[i * 3 + 2] = sharedMemory.colors_b[i]

        // Opacity
        opacities[i] = sharedMemory.opacity[i]
      }

      // Mark attributes as needing update
      positionAttribute.needsUpdate = true
      colorAttribute.needsUpdate = true
      opacityAttribute.needsUpdate = true

      // Update draw range to only render active particles
      geometry.setDrawRange(0, particleCount)
    } catch (error) {
      console.error('Error updating ScatterText:', error)
    }
  })

  if (!geometry || !material) return null

  return <points ref={meshRef} geometry={geometry} material={material} />
}

// Main component
export default function ScatterText({
  text,
  fontFamily = 'Arial',
  color = 'white',
  skip = 4,
  autoAnimate = true,
  height = '200px',
}: ScatterTextProps) {
  const [isGenerating, setIsGenerating] = useState(true)
  const [pixelData, setPixelData] = useState<PixelData | null>(null)
  const [wasmModule, setWasmModule] = useState<any>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }

    updateSize()
  }, [])

  const handlePixelsGenerated = (data: PixelData, module: any) => {
    setPixelData(data)
    setWasmModule(module)
    setIsGenerating(false) // Switch to render mode
  }

  return (
    <div ref={containerRef} className="relative" style={{ height }}>
      {isGenerating ? (
        <>
          {containerSize.width > 0 && containerSize.height > 0 && (
            <PixelGenerator
              text={text}
              fontFamily={fontFamily}
              color={color}
              skip={skip}
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
              onPixelsGenerated={handlePixelsGenerated}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            Generating...
          </div>
        </>
      ) : (
        <Canvas
          camera={{ position: [0, 0, 600], fov: 50 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          <ScatterRenderer
            pixelData={pixelData!}
            wasmModule={wasmModule}
            autoAnimate={autoAnimate}
          />
        </Canvas>
      )}
    </div>
  )
}
