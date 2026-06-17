import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { useReducedMotion } from '~/hooks/useReducedMotion'

import { CanvasContextEvents } from '../CanvasContextEvents'
import { fragmentShader, vertexShader } from './shaders'

interface ScatterTextProps {
  text: string
}

// Orthographic so the particle field is rendered in pixel space (1 world unit = 1 CSS px),
// immune to the aspect/fov stretching a perspective camera introduces on resize. R3F keeps
// the ortho frustum in sync with the canvas size for us.
// manual: true — R3F does not auto-update the ortho frustum on resize (it only sets it at
// init), which would leave a stale frustum on a resized buffer and stretch the text. We drive
// left/right/top/bottom ourselves from the same R3F size that feeds screenSize, keeping them in sync.
const SCATTER_CAMERA = {
  position: [0, 0, 100] as [number, number, number],
  near: 0.1,
  far: 1000,
  manual: true,
} as const

// Particle spacing (1 particle per SKIP px of the source text).
const SKIP = 3
// Upper bound on grid cells; covers very wide containers. Drives the (constant) geometry size.
const MAX_PARTICLES = 40000
// Formation easing settles well within this (exp(-5·2) ≈ 4.5e-5); afterwards rendering idles.
const FORM_DURATION = 2.0

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

interface ScatterParticlesProps {
  text: string
  prefersReducedMotion: boolean
}

function ScatterParticles({ text, prefersReducedMotion }: ScatterParticlesProps) {
  // R3F's size is the single source of truth: it stays in sync with the drawing buffer and the
  // orthographic camera frustum, so deriving the texture/grid/screenSize from it keeps the
  // layout consistent across resizes (no stretch, no drift).
  const width = useThree((state) => Math.floor(state.size.width))
  const height = useThree((state) => Math.floor(state.size.height))
  const invalidate = useThree((state) => state.invalidate)
  const getThree = useThree((state) => state.get)

  const geometryRef = useRef<THREE.BufferGeometry>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const textureRef = useRef<THREE.CanvasTexture | null>(null)
  const textureDimsRef = useRef({ w: 0, h: 0 })

  const reducedMotionRef = useRef(prefersReducedMotion)
  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion
  })

  const formStartRef = useRef(-1)
  const [uniforms] = useState(() => ({
    uText: { value: null as THREE.Texture | null },
    uGrid: { value: new THREE.Vector2(1, 1) },
    screenSize: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
  }))

  // (Re)rasterize the text into a small offscreen canvas (1 texel per particle cell) and upload
  // it as a GPU texture — no getImageData, no pixel loop, no per-particle CPU arrays. Runs on
  // mount and whenever the canvas size or text changes; the formed text simply re-lays-out.
  useEffect(() => {
    if (!width || !height) return

    let cancelled = false
    const fontSpec = `bold ${calculateFontSize(text, width, height) / SKIP}px "Geist Mono"`

    const build = () => {
      if (cancelled) return
      const material = materialRef.current
      if (!material) return

      if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas')
      const canvas = offscreenRef.current
      const gridW = Math.max(1, Math.round(width / SKIP))
      const gridH = Math.max(1, Math.round(height / SKIP))
      canvas.width = gridW
      canvas.height = gridH

      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, gridW, gridH)
      ctx.font = fontSpec
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, gridW / 2, gridH / 2)

      // A resized canvas needs a fresh GPU texture — reusing one and only flagging needsUpdate
      // keeps the old allocation/dimensions and samples a stale glyph (stretched on resize).
      const dims = textureDimsRef.current
      if (!textureRef.current || dims.w !== gridW || dims.h !== gridH) {
        textureRef.current?.dispose()
        const texture = new THREE.CanvasTexture(canvas)
        texture.minFilter = THREE.NearestFilter
        texture.magFilter = THREE.NearestFilter
        texture.generateMipmaps = false
        texture.flipY = false // match cell.y → screen.y so glyphs render upright
        textureRef.current = texture
        textureDimsRef.current = { w: gridW, h: gridH }
      }
      textureRef.current.needsUpdate = true

      material.uniforms.uText.value = textureRef.current
      material.uniforms.uGrid.value.set(gridW, gridH)
      material.uniforms.screenSize.value.set(width, height)

      // Map the (manual) ortho frustum exactly onto the pixel rect — same width/height as
      // screenSize — so particle pixel positions render 1:1 and centered at any size.
      const camera = getThree().camera
      if (camera instanceof THREE.OrthographicCamera) {
        camera.left = -width / 2
        camera.right = width / 2
        camera.top = height / 2
        camera.bottom = -height / 2
        camera.updateProjectionMatrix()
      }

      geometryRef.current?.setDrawRange(0, Math.min(gridW * gridH, MAX_PARTICLES))
      invalidate()
    }

    // Don't sample until the real "Geist Mono" face is available — otherwise the canvas
    // rasterizes a fallback glyph (font-display: swap) and the particles form the wrong shape.
    const fonts = document.fonts
    if (fonts && !fonts.check(fontSpec)) {
      fonts.load(fontSpec).then(build, build)
    } else {
      build()
    }

    return () => {
      cancelled = true
    }
  }, [text, width, height, invalidate, getThree])

  useEffect(() => {
    return () => {
      textureRef.current?.dispose()
      textureRef.current = null
    }
  }, [])

  useFrame((state) => {
    const material = materialRef.current
    if (!material || !material.uniforms.uText.value) return
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
  const [canvasVersion, setCanvasVersion] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  const handleContextLost = () => {
    setCanvasVersion((version) => version + 1)
  }

  if (typeof window === 'undefined') return null

  return (
    <div
      // Decorative particle text — hidden from assistive technology (sr-only h1 in Hero section provides the accessible text)
      className="absolute inset-0"
      aria-hidden="true"
    >
      <Canvas
        key={canvasVersion}
        ref={markWebGLCanvas}
        orthographic
        camera={SCATTER_CAMERA}
        frameloop="demand"
        dpr={[1, 1.5]}
      >
        <CanvasContextEvents onContextLost={handleContextLost} />
        <ScatterParticles text={text} prefersReducedMotion={prefersReducedMotion} />
      </Canvas>
    </div>
  )
}
