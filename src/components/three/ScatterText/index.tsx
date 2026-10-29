import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { useReducedMotion } from '~/hooks/useReducedMotion'

import { fragmentShader, vertexShader } from './shaders'

interface ScatterTextProps {
  text: string
}

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

export default function ScatterText({ text }: ScatterTextProps) {
  const prefersReducedMotion = useReducedMotion()
  const reducedMotionRef = useRef(prefersReducedMotion)
  const [canvasVersion, setCanvasVersion] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion
  }, [prefersReducedMotion])

  const handleContextLost = useCallback(() => {
    setCanvasVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
    camera.position.z = 100

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(PARTICLE_POSITIONS, 3))

    const uniforms = {
      uText: { value: null as THREE.Texture | null },
      uGrid: { value: new THREE.Vector2(1, 1) },
      screenSize: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
    }

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    scene.add(points)

    const offscreen = document.createElement('canvas')
    let texture: THREE.CanvasTexture | null = null
    let textureDims = { w: 0, h: 0 }
    let width = 1
    let height = 1
    let disposed = false
    let raf = 0
    let formStart = -1

    const render = () => {
      if (!disposed) renderer.render(scene, camera)
    }

    const applySize = () => {
      const rect = container.getBoundingClientRect()
      width = Math.max(1, Math.floor(rect.width))
      height = Math.max(1, Math.floor(rect.height))
      renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 1), 1.5))
      renderer.setSize(width, height, false)
      camera.left = -width / 2
      camera.right = width / 2
      camera.top = height / 2
      camera.bottom = -height / 2
      camera.updateProjectionMatrix()
    }

    const tick = (now: number) => {
      if (disposed) return
      if (!uniforms.uText.value) return

      if (reducedMotionRef.current) {
        uniforms.uTime.value = 1000
        render()
        return
      }

      if (formStart < 0) formStart = now
      const elapsed = (now - formStart) / 1000
      uniforms.uTime.value = elapsed
      render()
      // Keep rendering only while the text is still forming, then idle.
      if (elapsed < FORM_DURATION) raf = requestAnimationFrame(tick)
    }

    const startFormation = () => {
      cancelAnimationFrame(raf)
      if (reducedMotionRef.current) {
        uniforms.uTime.value = 1000
        render()
        return
      }
      formStart = performance.now()
      raf = requestAnimationFrame(tick)
    }

    const rasterize = () => {
      if (disposed) return
      const fontSpec = `bold ${calculateFontSize(text, width, height) / SKIP}px "Geist Mono"`

      const build = () => {
        if (disposed) return

        const gridW = Math.max(1, Math.round(width / SKIP))
        const gridH = Math.max(1, Math.round(height / SKIP))
        offscreen.width = gridW
        offscreen.height = gridH

        const ctx = offscreen.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, gridW, gridH)
        ctx.font = fontSpec
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, gridW / 2, gridH / 2)

        // A resized canvas needs a fresh GPU texture — reusing one and only flagging needsUpdate
        // keeps the old allocation/dimensions and samples a stale glyph (stretched on resize).
        if (!texture || textureDims.w !== gridW || textureDims.h !== gridH) {
          texture?.dispose()
          texture = new THREE.CanvasTexture(offscreen)
          texture.minFilter = THREE.NearestFilter
          texture.magFilter = THREE.NearestFilter
          texture.generateMipmaps = false
          texture.flipY = false // match cell.y → screen.y so glyphs render upright
          textureDims = { w: gridW, h: gridH }
        }
        texture.needsUpdate = true

        uniforms.uText.value = texture
        uniforms.uGrid.value.set(gridW, gridH)
        uniforms.screenSize.value.set(width, height)
        geometry.setDrawRange(0, Math.min(gridW * gridH, MAX_PARTICLES))

        startFormation()
      }

      // Don't sample until the real "Geist Mono" face is available — otherwise the canvas
      // rasterizes a fallback glyph (font-display: swap) and the particles form the wrong shape.
      const fonts = document.fonts
      if (fonts && !fonts.check(fontSpec)) {
        fonts.load(fontSpec).then(build, build)
      } else {
        build()
      }
    }

    applySize()
    rasterize()

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        applySize()
        rasterize()
      }, 50)
    })
    resizeObserver.observe(container)

    const onContextLost = (event: Event) => {
      event.preventDefault()
      handleContextLost()
    }
    canvas.addEventListener('webglcontextlost', onContextLost, false)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      if (resizeTimeout) clearTimeout(resizeTimeout)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      texture?.dispose()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [text, canvasVersion, handleContextLost])

  return (
    <div
      ref={containerRef}
      // Decorative particle text — hidden from assistive technology (sr-only h1 in Hero section provides the accessible text)
      className="absolute inset-0"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} data-webgl-canvas="scatter-text" className="block h-full w-full" />
    </div>
  )
}
