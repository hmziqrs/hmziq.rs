import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { useWASM } from '~/contexts/WASMContext'
import { useReducedMotion } from '~/hooks/useReducedMotion'
import { ScatterTextSharedMemory } from '~/lib/wasm/scatter-text'

import { CanvasContextEvents } from '../CanvasContextEvents'
import { fragmentShader, vertexShader } from './shaders'
import { ScatterRendererProps, ScatterTextProps } from './types'

function calculateFontSize(text: string, containerWidth: number, containerHeight: number): number {
  const baseSize = containerHeight * 0.85
  const textLengthFactor = Math.max(0.35, 1 - (text.length - 4) * 0.075)
  const widthConstraint = containerWidth / (text.length * 0.6)
  const fontSize = Math.min(baseSize * textLengthFactor, widthConstraint)

  return Math.max(40, Math.min(fontSize, 500))
}

const SCATTER_CAMERA = { position: [0, 0, 150] as [number, number, number], fov: 50 } as const

const SKIP = 3

function markWebGLCanvas(canvas: HTMLCanvasElement | null) {
  if (canvas) canvas.dataset.webglCanvas = 'scatter-text'
}

function generateParticles(
  text: string,
  width: number,
  height: number,
  wasmModule: NonNullable<ReturnType<typeof useWASM>['wasmModule']>
) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return null

  canvas.width = width
  canvas.height = height
  context.font = `bold ${calculateFontSize(text, width, height)}px "Geist Mono"`
  context.fillStyle = '#ffffff'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, width / 2, height / 2)

  const imageData = context.getImageData(0, 0, width, height)
  const particleCount = wasmModule.set_text_pixels(
    new Uint8Array(imageData.data),
    width,
    height,
    width,
    height,
    SKIP
  )
  ScatterTextSharedMemory.setInstance(wasmModule)
  return particleCount
}

function ScatterRenderer({ particleCount, prefersReducedMotion }: ScatterRendererProps) {
  const { size } = useThree()
  const wasmModule = useWASM().wasmModule
  const hasSnapped = useRef(false)
  const geometryRef = useRef<THREE.BufferGeometry>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const sharedMemory = ScatterTextSharedMemory.getInstance()
  const [uniforms] = useState(() => ({ screenSize: { value: new THREE.Vector2(1, 1) } }))

  useEffect(() => {
    return () => ScatterTextSharedMemory.resetInstance()
  }, [])

  useEffect(() => {
    if (!wasmModule || !geometryRef.current) return
    geometryRef.current.setDrawRange(0, particleCount)
    wasmModule.start_forming()
  }, [wasmModule, particleCount])

  useFrame((_, delta) => {
    const geometry = geometryRef.current
    const material = materialRef.current
    if (!geometry || !material) return

    try {
      if (!wasmModule) return

      const frameMemory = ScatterTextSharedMemory.getInstance()

      if (prefersReducedMotion) {
        if (!hasSnapped.current) {
          hasSnapped.current = true
          frameMemory.snapToFinalPositions()

          material.uniforms.screenSize.value.set(size.width, size.height)

          const positionXAttr = geometry.attributes.positionX
          const positionYAttr = geometry.attributes.positionY
          const opacityAttr = geometry.attributes.opacity

          if (positionXAttr instanceof THREE.BufferAttribute) positionXAttr.needsUpdate = true
          if (positionYAttr instanceof THREE.BufferAttribute) positionYAttr.needsUpdate = true
          if (opacityAttr instanceof THREE.BufferAttribute) opacityAttr.needsUpdate = true

          geometry.setDrawRange(0, particleCount)
        }
        return
      }

      frameMemory.updateFrame(wasmModule, delta)

      material.uniforms.screenSize.value.set(size.width, size.height)

      const positionXAttr = geometry.attributes.positionX
      const positionYAttr = geometry.attributes.positionY
      const opacityAttr = geometry.attributes.opacity

      if (positionXAttr instanceof THREE.BufferAttribute) positionXAttr.needsUpdate = true
      if (positionYAttr instanceof THREE.BufferAttribute) positionYAttr.needsUpdate = true
      if (opacityAttr instanceof THREE.BufferAttribute) opacityAttr.needsUpdate = true

      geometry.setDrawRange(0, particleCount)
    } catch (error) {
      console.error('Error updating ScatterText:', error)
    }
  })

  return (
    <points>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-positionX" args={[sharedMemory.positions_x, 1]} />
        <bufferAttribute attach="attributes-positionY" args={[sharedMemory.positions_y, 1]} />
        <bufferAttribute attach="attributes-colorR" args={[sharedMemory.colors_r, 1]} />
        <bufferAttribute attach="attributes-colorG" args={[sharedMemory.colors_g, 1]} />
        <bufferAttribute attach="attributes-colorB" args={[sharedMemory.colors_b, 1]} />
        <bufferAttribute attach="attributes-opacity" args={[sharedMemory.opacity, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function ScatterText({ text }: ScatterTextProps) {
  const wasmModule = useWASM().wasmModule
  const [particleCount, setParticleCount] = useState<number | null>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [canvasVersion, setCanvasVersion] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

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

  useEffect(() => {
    if (!wasmModule || !containerSize.width || !containerSize.height) return

    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return

      try {
        setParticleCount(
          generateParticles(text, containerSize.width, containerSize.height, wasmModule)
        )
      } catch (error) {
        console.error('Failed to generate pixels:', error)
      }
    })

    return () => {
      cancelled = true
    }
  }, [canvasVersion, containerSize.height, containerSize.width, text, wasmModule])

  const handleContextLost = () => {
    setParticleCount(null)
    setCanvasVersion((version) => version + 1)
  }

  if (typeof window === 'undefined') return null

  return (
    <div
      // Decorative particle text — hidden from assistive technology (sr-only h1 in Hero section provides the accessible text)
      ref={containerRef}
      className="absolute min-h-full min-w-full"
      aria-hidden="true"
    >
      {particleCount !== null ? (
        <Canvas
          key={canvasVersion}
          ref={markWebGLCanvas}
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
          <ScatterRenderer
            particleCount={particleCount}
            prefersReducedMotion={prefersReducedMotion}
          />
        </Canvas>
      ) : null}
    </div>
  )
}
