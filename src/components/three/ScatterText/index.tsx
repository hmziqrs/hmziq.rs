import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import { useReducedMotion } from '~/hooks/useReducedMotion'

import { CanvasContextEvents } from '../CanvasContextEvents'
import { fragmentShader, vertexShader } from './shaders'

interface ScatterTextProps {
  text: string
}

const SCATTER_CAMERA = { position: [0, 0, 150] as [number, number, number], fov: 50 } as const

// Particle spacing (1 particle per SKIP px of the source text).
const SKIP = 3
// Upper bound on grid cells; covers very wide containers. Drives the (constant) geometry size.
const MAX_PARTICLES = 40000
// Formation easing settles well within this (exp(-5·2) ≈ 4.5e-5); afterwards rendering idles.
const FORM_DURATION = 2.0
const RESIZE_DEBOUNCE_MS = 150

// Constant geometry: the particle id is packed into position.x (y,z unused). Three derives
// the point draw-count from this attribute; real screen positions are computed in the shader,
// so the points are rendered with frustumCulled disabled. Built once.
const PARTICLE_POSITIONS = (() => {
  const array = new Float32Array(MAX_PARTICLES * 3)
  for (let i = 0; i < MAX_PARTICLES; i++) array[i * 3] = i
  return array
})()

function calculateFontSize(text: string, containerWidth: number, containerHeight: number): number {
  const baseSize = containerHeight * 0.85
  const textLengthFactor = Math.max(0.35, 1 - (text.length - 4) * 0.075)
  const widthConstraint = containerWidth / (text.length * 0.6)
  const fontSize = Math.min(baseSize * textLengthFactor, widthConstraint)

  return Math.max(40, Math.min(fontSize, 500))
}

function markWebGLCanvas(canvas: HTMLCanvasElement | null) {
  if (canvas) canvas.dataset.webglCanvas = 'scatter-text'
}

interface Generation {
  texture: THREE.CanvasTexture
  gridW: number
  gridH: number
  width: number
  height: number
  version: number
}

interface ScatterRendererProps {
  generation: Generation
  prefersReducedMotion: boolean
}

function ScatterRenderer({ generation, prefersReducedMotion }: ScatterRendererProps) {
  const geometryRef = useRef<THREE.BufferGeometry>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const invalidate = useThree((state) => state.invalidate)

  const reducedMotionRef = useRef(prefersReducedMotion)
  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion
  })

  const formStartRef = useRef(-1)
  // Stable initial uniforms; kept in sync via the material ref in the effect below.
  const uniforms = useMemo(
    () => ({
      uText: { value: null as THREE.Texture | null },
      uGrid: { value: new THREE.Vector2(1, 1) },
      screenSize: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
    }),
    []
  )

  // Apply a (re)generation: point uniforms at the fresh texture/grid, set the draw range,
  // and restart the formation. Kicks one frame so demand-mode renders the new state.
  useEffect(() => {
    const material = materialRef.current
    if (!material) return
    material.uniforms.uText.value = generation.texture
    material.uniforms.uGrid.value.set(generation.gridW, generation.gridH)
    material.uniforms.screenSize.value.set(generation.width, generation.height)
    const count = Math.min(generation.gridW * generation.gridH, MAX_PARTICLES)
    geometryRef.current?.setDrawRange(0, count)
    formStartRef.current = -1
    invalidate()
  }, [generation, invalidate])

  useFrame((state) => {
    const material = materialRef.current
    if (!material) return
    if (reducedMotionRef.current) {
      material.uniforms.uTime.value = 1000 // settled (exp(-5000) → at target)
      return
    }
    if (formStartRef.current < 0) formStartRef.current = state.clock.elapsedTime
    const elapsed = state.clock.elapsedTime - formStartRef.current
    material.uniforms.uTime.value = elapsed
    // Keep rendering only while the text is still forming, then idle.
    if (elapsed < FORM_DURATION) state.invalidate()
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[PARTICLE_POSITIONS, 3]} />
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
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [generation, setGeneration] = useState<Generation | null>(null)
  const [canvasVersion, setCanvasVersion] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const textureRef = useRef<THREE.CanvasTexture | null>(null)
  const versionRef = useRef(0)

  useEffect(() => {
    if (!containerRef.current) return
    let timeout: ReturnType<typeof setTimeout> | null = null
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        setContainerSize({ width: Math.floor(width), height: Math.floor(height) })
      }, RESIZE_DEBOUNCE_MS)
    })
    observer.observe(containerRef.current)
    return () => {
      observer.disconnect()
      if (timeout) clearTimeout(timeout)
    }
  }, [])

  // Rasterize the text into a small offscreen canvas (1 texel per particle cell) and upload
  // it as a GPU texture — no getImageData, no pixel loop, no per-particle CPU arrays.
  useEffect(() => {
    const { width, height } = containerSize
    if (!width || !height) return

    if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas')
    const canvas = offscreenRef.current
    const gridW = Math.max(1, Math.round(width / SKIP))
    const gridH = Math.max(1, Math.round(height / SKIP))
    canvas.width = gridW
    canvas.height = gridH

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, gridW, gridH)
    ctx.font = `bold ${calculateFontSize(text, width, height) / SKIP}px "Geist Mono"`
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, gridW / 2, gridH / 2)

    if (!textureRef.current) {
      const texture = new THREE.CanvasTexture(canvas)
      texture.minFilter = THREE.NearestFilter
      texture.magFilter = THREE.NearestFilter
      texture.generateMipmaps = false
      texture.flipY = false // match cell.y → screen.y so glyphs render upright
      textureRef.current = texture
    }
    textureRef.current.needsUpdate = true

    versionRef.current += 1
    setGeneration({
      texture: textureRef.current,
      gridW,
      gridH,
      width,
      height,
      version: versionRef.current,
    })
  }, [text, containerSize, canvasVersion])

  useEffect(() => {
    return () => {
      textureRef.current?.dispose()
      textureRef.current = null
    }
  }, [])

  const handleContextLost = () => {
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
      {generation ? (
        <Canvas
          key={canvasVersion}
          ref={markWebGLCanvas}
          camera={SCATTER_CAMERA}
          frameloop="demand"
          dpr={[1, 1.5]}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: containerSize.width,
            height: containerSize.height,
          }}
        >
          <CanvasContextEvents onContextLost={handleContextLost} />
          <ScatterRenderer generation={generation} prefersReducedMotion={prefersReducedMotion} />
        </Canvas>
      ) : null}
    </div>
  )
}
