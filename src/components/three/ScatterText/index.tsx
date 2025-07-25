'use client'

import { useRef, useEffect, useState } from 'react'
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

// const MAX_PARTICLES = 1000
const SKIP = 3

function PixelGenerator({ text, width, height, onPixelsGenerated }: PixelGeneratorProps) {
  const wasmModule = useWASM().wasmModule!
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runOnce = useRef(false)

  useEffect(() => {
    if (runOnce.current) return
    runOnce.current = true

    if (!canvasRef.current) return

    try {
      const fontSize = calculateFontSize(text, width, height)

      console.log(`Dynamic font size: ${fontSize}px for text: "${text}" (${width}x${height})`)

      // Use the mounted canvas for text rendering
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!

      // Set canvas size
      canvas.width = width
      canvas.height = height

      // Configure text rendering
      ctx.font = `bold 100px GeistMono`
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw text in white
      ctx.fillStyle = '#ffffff'
      ctx.fillText(text, canvas.width / 2, canvas.height / 2)

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const pixelData = new Uint8Array(imageData.data)

      const particleCount = wasmModule.set_text_pixels(
        pixelData,
        canvas.width,
        canvas.height,
        width,
        height,
        SKIP
      )

      ScatterTextSharedMemory.setInstance(wasmModule)

      console.log(`Generated ${particleCount} particles for text: ${text}`)

      onPixelsGenerated({
        pixelData,
        particleCount,
      })
    } catch (error) {
      console.error('Failed to generate pixels:', error)
    }
  }, [text, width, height, wasmModule, onPixelsGenerated])

  return (
    <canvas
      ref={canvasRef}
      className="opacity-0 invisible"
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  )
}

function ScatterRenderer({ pixelData }: ScatterRendererProps) {
  const { size } = useThree()
  const meshRef = useRef<THREE.Points>(null)
  const wasmModule = useWASM().wasmModule!
  const [threeData, setThreeData] = useState<{
    geometry: THREE.BufferGeometry
    material: THREE.ShaderMaterial
  } | null>()

  useEffect(() => {
    console.log('Creating geometry')

    const sharedMemory = ScatterTextSharedMemory.getInstance()

    const geometry = new THREE.BufferGeometry()

    // Set SoA attributes directly from shared memory
    geometry.setAttribute('positionX', new THREE.BufferAttribute(sharedMemory.positions_x, 1))
    geometry.setAttribute('positionY', new THREE.BufferAttribute(sharedMemory.positions_y, 1))
    geometry.setAttribute('colorR', new THREE.BufferAttribute(sharedMemory.colors_r, 1))
    geometry.setAttribute('colorG', new THREE.BufferAttribute(sharedMemory.colors_g, 1))
    geometry.setAttribute('colorB', new THREE.BufferAttribute(sharedMemory.colors_b, 1))
    geometry.setAttribute('opacity', new THREE.BufferAttribute(sharedMemory.opacity, 1))

    // Set draw range to max particles
    geometry.setDrawRange(0, pixelData.particleCount)

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

    setThreeData({ geometry, material })
  }, [])

  useEffect(() => {
    if (!threeData) return
    wasmModule.start_forming()
  }, [wasmModule, threeData])

  // Update particles
  useFrame((state, delta) => {
    const sharedMemory = ScatterTextSharedMemory.getInstance()
    if (!threeData) return
    const { geometry, material } = threeData

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
      // const particleCount = Math.min(wasmModule.get_particle_count(), MAX_PARTICLES)
      geometry.setDrawRange(0, pixelData.particleCount)
    } catch (error) {
      console.error('Error updating ScatterText:', error)
    }
  })

  if (!threeData) return null

  return <points ref={meshRef} geometry={threeData.geometry} material={threeData.material} />
}

// Main component
export default function ScatterText({ text }: ScatterTextProps) {
  const [isGenerating, setIsGenerating] = useState(true)
  const [pixelData, setPixelData] = useState<PixelData | null>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setContainerSize({ width: rect.width, height: rect.height })
    }
  }, [])

  const handlePixelsGenerated = (data: PixelData) => {
    setPixelData(data)
    setIsGenerating(false)
  }

  return (
    <div ref={containerRef} className="absolute min-w-full min-h-full">
      {isGenerating ? (
        <>
          {!!containerSize.width && (
            <PixelGenerator
              text={text}
              width={containerSize.width}
              height={containerSize.height}
              onPixelsGenerated={handlePixelsGenerated}
            />
          )}
        </>
      ) : (
        <>
          {/* <div /> */}
          <Canvas
            camera={{ position: [0, 0, 150], fov: 50 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: containerSize.width,
              height: containerSize.height,
              // backgroundColor: 'red',
            }}
          >
            <ScatterRenderer pixelData={pixelData!} />
          </Canvas>
        </>
      )}
    </div>
  )
}
