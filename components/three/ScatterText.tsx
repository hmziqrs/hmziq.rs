'use client'

import { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { loadWASM, ScatterTextSharedMemory } from '@/lib/wasm'

interface ScatterTextProps {
  text: string
  fontSize?: number
  fontFamily?: string
  color?: string
  skip?: number
  autoAnimate?: boolean
  animationDelay?: number
  height?: string
}

interface PixelData {
  pixelData: Uint8ClampedArray
  width: number
  height: number
  particleCount: number
}

interface PixelGeneratorProps {
  text: string
  fontSize: number
  fontFamily: string
  color: string
  skip: number
  onPixelsGenerated: (data: PixelData, wasmModule: any) => void
}

interface ScatterRendererProps {
  pixelData: PixelData
  wasmModule: any
  autoAnimate: boolean
  animationDelay: number
}

// Vertex shader
const vertexShader = `
  attribute float opacity;
  attribute vec3 color;

  varying float vOpacity;
  varying vec3 vColor;

  void main() {
    vOpacity = opacity;
    vColor = color;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = 2.0;
  }
`

// Fragment shader
const fragmentShader = `
  varying float vOpacity;
  varying vec3 vColor;

  void main() {
    if (vOpacity <= 0.0) discard;

    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;

    gl_FragColor = vec4(vColor, vOpacity);
  }
`

// Component 1: Generate pixel data
function PixelGenerator({
  text,
  fontSize,
  fontFamily,
  color,
  skip,
  onPixelsGenerated,
}: PixelGeneratorProps) {
  useEffect(() => {
    const generatePixels = async () => {
      try {
        const module = await loadWASM()

        // Initialize scatter text with max particles
        const memory = new ScatterTextSharedMemory(module, 10000)

        // Generate text pixels
        const {
          pixelData: rawPixelData,
          width,
          height,
        } = memory.generateTextPixels(text, fontSize, fontFamily, color)

        // Ensure we have a Uint8ClampedArray for PixelData
        const pixelData =
          rawPixelData instanceof Uint8ClampedArray
            ? rawPixelData
            : new Uint8ClampedArray(rawPixelData)

        // Set pixels in WASM with proper centering
        // Use window dimensions for initial setup
        const initialWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
        const initialHeight = typeof window !== 'undefined' ? window.innerHeight : 800

        const particleCount = module.set_text_pixels(
          rawPixelData,
          width,
          height,
          initialWidth,
          initialHeight,
          skip
        )

        console.log(`Generated ${particleCount} particles for text: ${text}`)

        // Pass data to parent
        onPixelsGenerated({ pixelData, width, height, particleCount }, module)
      } catch (error) {
        console.error('Failed to generate pixels:', error)
      }
    }

    generatePixels()
  }, [text, fontSize, fontFamily, color, skip, onPixelsGenerated])

  return null
}

// Component 2: Render scatter text
function ScatterRenderer({
  pixelData,
  wasmModule,
  autoAnimate,
  animationDelay,
}: ScatterRendererProps) {
  const { size } = useThree()
  const meshRef = useRef<THREE.Points>(null)
  const [sharedMemory, setSharedMemory] = useState<ScatterTextSharedMemory | null>(null)
  const animationTimerRef = useRef<number | null>(null)

  // Initialize shared memory and update particle positions
  useEffect(() => {
    if (!wasmModule) return

    const memory = new ScatterTextSharedMemory(wasmModule, 10000)
    setSharedMemory(memory)

    // Update with actual canvas size to properly center particles
    // This ensures particles are positioned correctly for the current viewport
    wasmModule.set_text_pixels(
      pixelData.pixelData,
      pixelData.width,
      pixelData.height,
      size.width,
      size.height,
      4 // skip
    )

    console.log(`Recentered particles for canvas size: ${size.width}x${size.height}`)
  }, [wasmModule, pixelData, size.width, size.height])

  // Create geometry and material
  const { geometry, material } = useMemo(() => {
    if (!sharedMemory) {
      return { geometry: null, material: null }
    }

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

  // Auto-animation effect
  useEffect(() => {
    if (!autoAnimate || !wasmModule) return

    // Initial form
    wasmModule.start_forming()

    // Set up animation cycle
    animationTimerRef.current = window.setInterval(() => {
      if (wasmModule.is_forming()) {
        wasmModule.start_scattering()
      } else {
        wasmModule.start_forming()
      }
    }, animationDelay)

    return () => {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
      }
    }
  }, [autoAnimate, animationDelay, wasmModule])

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
  fontSize = 100,
  fontFamily = 'Arial',
  color = 'white',
  skip = 4,
  autoAnimate = true,
  animationDelay = 3000,
  height = '200px',
}: ScatterTextProps) {
  const [isGenerating, setIsGenerating] = useState(true)
  const [pixelData, setPixelData] = useState<PixelData | null>(null)
  const [wasmModule, setWasmModule] = useState<any>(null)

  const handlePixelsGenerated = (data: PixelData, module: any) => {
    setPixelData(data)
    setWasmModule(module)
    setIsGenerating(false) // Switch to render mode
  }

  return (
    <div className="relative" style={{ height }}>
      {isGenerating ? (
        <>
          <PixelGenerator
            text={text}
            fontSize={fontSize}
            fontFamily={fontFamily}
            color={color}
            skip={skip}
            onPixelsGenerated={handlePixelsGenerated}
          />
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            Generating...
          </div>
        </>
      ) : (
        pixelData &&
        wasmModule && (
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
              pixelData={pixelData}
              wasmModule={wasmModule}
              autoAnimate={autoAnimate}
              animationDelay={animationDelay}
            />
          </Canvas>
        )
      )}
    </div>
  )
}
