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
  const wasmModule = useWASM().wasmModule!

  const generatePixels = () => {
    try {
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
  }, [
    text,
    fontFamily,
    color,
    skip,
    containerWidth,
    containerHeight,
    onPixelsGenerated,
    wasmModule,
  ])

  return null
}

// Component 2: Render scatter text
function ScatterRenderer({ pixelData, autoAnimate }: ScatterRendererProps) {
  const { size } = useThree()
  const meshRef = useRef<THREE.Points>(null)
  const [sharedMemory, setSharedMemory] = useState<ScatterTextSharedMemory | null>(null)
  const wasmModule = useWASM().wasmModule!

  useEffect(() => {
    console.log('FIRST EFFECT')

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
  }, [wasmModule.set_text_pixels, pixelData, size.width, size.height])

  // Create geometry and material
  // Note: In development, React Strict Mode will cause this to run twice to detect side effects
  const { geometry, material } = useMemo(() => {
    console.log('MEMOIZING geometry')
    if (!sharedMemory) {
      return { geometry: null, material: null }
    }
    console.log('Creating geometry')

    const geometry = new THREE.BufferGeometry()

    // Set SoA attributes directly from shared memory
    geometry.setAttribute('positionX', new THREE.BufferAttribute(sharedMemory.positions_x, 1))
    geometry.setAttribute('positionY', new THREE.BufferAttribute(sharedMemory.positions_y, 1))
    geometry.setAttribute('colorR', new THREE.BufferAttribute(sharedMemory.colors_r, 1))
    geometry.setAttribute('colorG', new THREE.BufferAttribute(sharedMemory.colors_g, 1))
    geometry.setAttribute('colorB', new THREE.BufferAttribute(sharedMemory.colors_b, 1))
    geometry.setAttribute('opacity', new THREE.BufferAttribute(sharedMemory.opacity, 1))

    // Set draw range to max particles
    const MAX_PARTICLES = 10000
    geometry.setDrawRange(0, MAX_PARTICLES)

    // Create shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        screenSize: { value: new THREE.Vector2(1, 1) }, // Will be updated in useFrame
      },
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
    if (!autoAnimate) return

    // Form the text and keep it formed
    wasmModule.start_forming()
  }, [autoAnimate, wasmModule.start_forming])

  // Update particles
  useFrame((state, delta) => {
    if (!sharedMemory || !geometry || !material) return

    try {
      // Update particles in WASM
      sharedMemory.updateFrame(wasmModule, delta)

      // Update screen size uniform
      material.uniforms.screenSize.value.set(size.width, size.height)

      // Update attributes that change during animation
      // Position updates during scatter/form animation
      const positionXAttribute = geometry.attributes.positionX as THREE.BufferAttribute
      const positionYAttribute = geometry.attributes.positionY as THREE.BufferAttribute
      const opacityAttribute = geometry.attributes.opacity as THREE.BufferAttribute

      positionXAttribute.needsUpdate = true
      positionYAttribute.needsUpdate = true
      opacityAttribute.needsUpdate = true

      // Update draw range to only render active particles
      const particleCount = Math.min(wasmModule.get_particle_count(), 10000)
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
          <ScatterRenderer pixelData={pixelData!} autoAnimate={autoAnimate} />
        </Canvas>
      )}
    </div>
  )
}
