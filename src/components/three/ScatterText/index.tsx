import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'

import { useWASM } from '~/contexts/WASMContext'
import { ScatterTextSharedMemory } from '~/lib/wasm/scatter-text'

import { CanvasContextEvents } from '../CanvasContextEvents'
import { fragmentShader, vertexShader } from './shaders'
import { ScatterTextProps, PixelData, PixelGeneratorProps, ScatterRendererProps } from './types'

function calculateFontSize(text: string, containerWidth: number, containerHeight: number): number {
  const baseSize = containerHeight * 0.85
  const textLengthFactor = Math.max(0.35, 1 - (text.length - 4) * 0.075)
  const widthConstraint = containerWidth / (text.length * 0.6)
  const fontSize = Math.min(baseSize * textLengthFactor, widthConstraint)

  return Math.max(40, Math.min(fontSize, 500))
}

const SCATTER_CAMERA = { position: [0, 0, 150] as [number, number, number], fov: 50 } as const

const SKIP = 3

function PixelGenerator({ text, width, height, onPixelsGenerated }: PixelGeneratorProps) {
  const wasmModule = useWASM().wasmModule
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runOnce = useRef(false)

  useEffect(() => {
    if (!canvasRef.current || !wasmModule) return
    if (runOnce.current) return
    runOnce.current = true

    try {
      const fontSize = calculateFontSize(text, width, height)

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to get 2D canvas context')

      canvas.width = width
      canvas.height = height

      ctx.font = `bold ${fontSize}px "Geist Mono"`
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = '#ffffff'
      ctx.fillText(text, canvas.width / 2, canvas.height / 2)

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
      aria-hidden="true"
      className="invisible opacity-0"
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  )
}

function ScatterRenderer({ pixelData }: ScatterRendererProps) {
  const { size } = useThree()
  const wasmModule = useWASM().wasmModule
  const [threeData] = useState(() => {
    const sharedMemory = ScatterTextSharedMemory.getInstance()

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('positionX', new THREE.BufferAttribute(sharedMemory.positions_x, 1))
    geometry.setAttribute('positionY', new THREE.BufferAttribute(sharedMemory.positions_y, 1))
    geometry.setAttribute('colorR', new THREE.BufferAttribute(sharedMemory.colors_r, 1))
    geometry.setAttribute('colorG', new THREE.BufferAttribute(sharedMemory.colors_g, 1))
    geometry.setAttribute('colorB', new THREE.BufferAttribute(sharedMemory.colors_b, 1))
    geometry.setAttribute('opacity', new THREE.BufferAttribute(sharedMemory.opacity, 1))

    geometry.setDrawRange(0, pixelData.particleCount)

    const material = new THREE.ShaderMaterial({
      uniforms: {
        screenSize: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    return { geometry, material }
  })

  useEffect(() => {
    return () => {
      threeData.geometry.dispose()
      threeData.material.dispose()
      ScatterTextSharedMemory.resetInstance()
    }
  }, [threeData])

  useEffect(() => {
    if (!wasmModule) return
    threeData.geometry.setDrawRange(0, pixelData.particleCount)
    wasmModule.start_forming()
  }, [wasmModule, threeData, pixelData.particleCount])

  useFrame((_, delta) => {
    const sharedMemory = ScatterTextSharedMemory.getInstance()
    const { geometry, material } = threeData

    try {
      if (!wasmModule) return
      sharedMemory.updateFrame(wasmModule, delta)

      material.uniforms.screenSize.value.set(size.width, size.height)

      const positionXAttr = geometry.attributes.positionX
      const positionYAttr = geometry.attributes.positionY
      const opacityAttr = geometry.attributes.opacity

      // eslint-disable-next-line react-hooks-js/immutability
      if (positionXAttr instanceof THREE.BufferAttribute) positionXAttr.needsUpdate = true
      if (positionYAttr instanceof THREE.BufferAttribute) positionYAttr.needsUpdate = true
      if (opacityAttr instanceof THREE.BufferAttribute) opacityAttr.needsUpdate = true

      geometry.setDrawRange(0, pixelData.particleCount)
    } catch (error) {
      console.error('Error updating ScatterText:', error)
    }
  })

  return <points geometry={threeData.geometry} material={threeData.material} />
}

export default function ScatterText({ text }: ScatterTextProps) {
  const [isGenerating, setIsGenerating] = useState(true)
  const [pixelData, setPixelData] = useState<PixelData | null>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [canvasVersion, setCanvasVersion] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setContainerSize({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        })
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const handlePixelsGenerated = useCallback((data: PixelData) => {
    setPixelData(data)
    setIsGenerating(false)
  }, [])

  const handleContextLost = useCallback(() => {
    setPixelData(null)
    setIsGenerating(true)
    setCanvasVersion((version) => version + 1)
  }, [])

  const markCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      canvas.dataset.webglCanvas = 'scatter-text'
    }
  }, [])

  if (typeof window === 'undefined') return null

  return (
    <div ref={containerRef} className="absolute min-h-full min-w-full">
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
      ) : pixelData ? (
        <Canvas
          key={canvasVersion}
          ref={markCanvas}
          camera={SCATTER_CAMERA}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: containerSize.width,
            height: containerSize.height,
          }}
        >
          <CanvasContextEvents onContextLost={handleContextLost} />
          <ScatterRenderer pixelData={pixelData} />
        </Canvas>
      ) : null}
    </div>
  )
}
