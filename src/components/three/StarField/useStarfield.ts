import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { useReducedMotion } from '~/hooks/useReducedMotion'
import type { WASMModule } from '~/lib/wasm/core'
import { StarFieldSharedMemory } from '~/lib/wasm/starfield'

import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders'

// Stars are generated in a shell of max radius 150 (see initialize_star_memory_pool).
// The field only rotates about the origin, so a fixed bounding sphere is exact and
// avoids an O(n) bounds scan on every (re)bind.
const STAR_FIELD_RADIUS = 150

// Geometry attribute name -> shared-memory buffer key.
const ATTRIBUTE_BINDINGS = [
  ['positionX', 'positions_x'],
  ['positionY', 'positions_y'],
  ['positionZ', 'positions_z'],
  ['colorR', 'colors_r'],
  ['colorG', 'colors_g'],
  ['colorB', 'colors_b'],
  ['size', 'sizes'],
] as const

function bindStarfieldGeometry(geometry: THREE.BufferGeometry, sharedMem: StarFieldSharedMemory) {
  for (const key of Object.keys(geometry.attributes)) {
    geometry.deleteAttribute(key)
  }

  for (const [attribute, bufferKey] of ATTRIBUTE_BINDINGS) {
    const buffer = sharedMem[bufferKey]
    if (!buffer) return
    geometry.setAttribute(attribute, new THREE.BufferAttribute(buffer, 1))
  }

  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), STAR_FIELD_RADIUS)
  geometry.setDrawRange(0, sharedMem.count)
}

const BOOT_DURATION = 1.5
const MAX_DELTA = 0.1
const BASE_ROTATION_X = 0.02
const BASE_ROTATION_Y = 0.01

// Scroll-driven camera dolly: top of page sits at the base distance; scrolling
// down eases the camera toward the field (zoom in), scrolling back up pulls out.
const CAMERA_Z_BASE = 50
const CAMERA_Z_ZOOMED = 28
const CAMERA_ZOOM_LERP = 0.08

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

function getStarCount(width: number, height: number) {
  const rawCount = Math.floor(((width * height) / 1000) * 0.36 * 1.125)
  return Math.ceil(rawCount / 8) * 8
}

function initialStarCount() {
  if (typeof window === 'undefined') return 0
  return getStarCount(window.innerWidth, window.innerHeight)
}

interface UseStarfieldOptions {
  wasmModule: WASMModule | null
  onFirstFrame?: () => void
  onContextLost?: () => void
}

/**
 * Drives the whole star field with plain Three.js: renderer lifecycle, responsive
 * density, geometry binding over the WASM-generated buffers, DOM interaction
 * (movement/click boosts), and the per-frame loop (radial-expand boot + rotation,
 * with twinkle/sparkle in the shader).
 */
export function useStarfield({ wasmModule, onFirstFrame, onContextLost }: UseStarfieldOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const reducedMotionRef = useRef(prefersReducedMotion)

  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion
  }, [prefersReducedMotion])

  const [starCount, setStarCount] = useState(initialStarCount)

  const sharedMemoryRef = useRef<StarFieldSharedMemory | null>(null)
  const geometryRef = useRef<THREE.BufferGeometry | null>(null)
  const needsRenderRef = useRef(true)

  const onFirstFrameRef = useRef(onFirstFrame)
  const onContextLostRef = useRef(onContextLost)

  useEffect(() => {
    onFirstFrameRef.current = onFirstFrame
    onContextLostRef.current = onContextLost
  }, [onFirstFrame, onContextLost])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    renderer.setClearColor(0x000000, 1)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    camera.position.z = CAMERA_Z_BASE

    const geometry = new THREE.BufferGeometry()
    const uniforms = { uTime: { value: 0 }, uBoot: { value: 0 } }
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const points = new THREE.Points(geometry, material)
    scene.add(points)

    geometryRef.current = geometry

    const resizeRenderer = () => {
      const width = canvas.clientWidth || window.innerWidth
      const height = canvas.clientHeight || window.innerHeight
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
      needsRenderRef.current = true
    }

    resizeRenderer()

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null
    const handleResize = () => {
      resizeRenderer()
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        setStarCount(getStarCount(window.innerWidth, window.innerHeight))
      }, 150)
    }
    window.addEventListener('resize', handleResize)

    const handleContextLost = (event: Event) => {
      event.preventDefault()
      onContextLostRef.current?.()
    }
    canvas.addEventListener('webglcontextlost', handleContextLost, false)

    // Interaction state.
    let isMoving = false
    let moveTimeout: ReturnType<typeof setTimeout> | null = null
    let shouldBoostFromClick = false
    let scrollProgress = 0

    const markMoving = () => {
      isMoving = true
      if (moveTimeout) clearTimeout(moveTimeout)
      moveTimeout = setTimeout(() => {
        isMoving = false
      }, 100)
    }

    const handleClick = () => {
      shouldBoostFromClick = true
    }

    const handleScroll = () => {
      markMoving()
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      scrollProgress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0
    }

    window.addEventListener('mousemove', markMoving)
    window.addEventListener('click', handleClick)
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Frame state.
    let clickTime = -Infinity
    let speedMultiplier = 1
    let rotationX = 0
    let rotationY = 0
    let bootStart = -1
    let firstFrame = false
    let raf = 0
    const start = performance.now()
    let lastFrame = start

    const render = () => {
      renderer.render(scene, camera)
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const time = (now - start) / 1000
      const deltaTime = Math.min((now - lastFrame) / 1000, MAX_DELTA)
      lastFrame = now

      const sharedMemory = sharedMemoryRef.current
      if (!sharedMemory) return
      if (sharedMemory.refreshViewsIfNeeded()) {
        bindStarfieldGeometry(geometry, sharedMemory)
        needsRenderRef.current = true
      }

      const reducedMotion = reducedMotionRef.current

      if (reducedMotion) {
        uniforms.uBoot.value = 1
        uniforms.uTime.value = 0
        if (needsRenderRef.current) {
          render()
          needsRenderRef.current = false
        }
        if (!firstFrame) {
          firstFrame = true
          onFirstFrameRef.current?.()
        }
        return
      }

      // Radial-expand boot.
      if (bootStart < 0) bootStart = time
      uniforms.uBoot.value = easeOutCubic(Math.min(1, (time - bootStart) / BOOT_DURATION))
      uniforms.uTime.value = time

      // Click boost records the most recent click time.
      if (shouldBoostFromClick) {
        clickTime = time
        shouldBoostFromClick = false
      }

      // Speed multiplier: movement (8x) and decaying click (+8x) boosts, clamped + eased.
      const movementBoost = isMoving ? 8 : 1
      const timeSinceClick = time - clickTime
      const clickBoost = timeSinceClick < 0.5 ? 1 + 8 * (1 - timeSinceClick / 0.5) : 1
      const target = Math.min(movementBoost * clickBoost, 15)
      speedMultiplier += (target - speedMultiplier) * 0.2

      rotationX += BASE_ROTATION_X * speedMultiplier * deltaTime
      rotationY += BASE_ROTATION_Y * speedMultiplier * deltaTime
      points.rotation.x = rotationX
      points.rotation.y = rotationY

      // Scroll-driven zoom: ease the camera toward the scroll-mapped distance.
      const targetZ = CAMERA_Z_BASE + (CAMERA_Z_ZOOMED - CAMERA_Z_BASE) * scrollProgress
      camera.position.z += (targetZ - camera.position.z) * CAMERA_ZOOM_LERP

      render()

      if (!firstFrame) {
        firstFrame = true
        onFirstFrameRef.current?.()
      }
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', markMoving)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', handleScroll)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      if (resizeTimeout) clearTimeout(resizeTimeout)
      if (moveTimeout) clearTimeout(moveTimeout)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      geometryRef.current = null
    }
  }, [])

  // Geometry lifecycle: (re)generate the WASM pool and bind it when density changes.
  useEffect(() => {
    const geometry = geometryRef.current
    if (!geometry) return

    sharedMemoryRef.current?.dispose()
    sharedMemoryRef.current = null

    for (const key of Object.keys(geometry.attributes)) {
      geometry.deleteAttribute(key)
    }

    if (wasmModule && starCount > 0) {
      sharedMemoryRef.current = new StarFieldSharedMemory(wasmModule, starCount)
      bindStarfieldGeometry(geometry, sharedMemoryRef.current)
      needsRenderRef.current = true
    }

    return () => {
      sharedMemoryRef.current?.dispose()
      sharedMemoryRef.current = null
    }
  }, [wasmModule, starCount])

  return canvasRef
}
