import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { useReducedMotion } from '~/hooks/useReducedMotion'
import type { WASMModule } from '~/lib/wasm/core'
import { StarFieldSharedMemory } from '~/lib/wasm/starfield'

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

interface UseStarfieldOptions {
  wasmModule: WASMModule | null
  starMeshRef: React.RefObject<THREE.Points | null>
  onFirstFrame?: () => void
}

/**
 * Drives the whole star field: density (responsive), geometry lifecycle over the
 * WASM-generated buffers, DOM interaction (movement/click boosts), and the
 * per-frame loop (radial-expand boot + rotation, with twinkle/sparkle in the shader).
 */
export function useStarfield({ wasmModule, starMeshRef, onFirstFrame }: UseStarfieldOptions) {
  const prefersReducedMotion = useReducedMotion()
  const reducedMotionRef = useRef(prefersReducedMotion)
  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion
  })

  const invalidate = useThree((state) => state.invalidate)

  const [starCount, setStarCount] = useState(() =>
    getStarCount(window.innerWidth, window.innerHeight)
  )

  const sharedMemoryRef = useRef<StarFieldSharedMemory | null>(null)

  // Interaction state.
  const isMovingRef = useRef(false)
  const shouldBoostFromClick = useRef(false)
  const scrollProgressRef = useRef(0)

  // Frame state.
  const clickTimeRef = useRef(-Infinity)
  const speedMultiplierRef = useRef(1)
  const rotationXRef = useRef(0)
  const rotationYRef = useRef(0)
  const lastFrameTimeRef = useRef(0)
  const bootStartRef = useRef(-1)
  const firstFrameFiredRef = useRef(false)

  // Geometry lifecycle: (re)generate the WASM pool and bind it when density changes.
  useEffect(() => {
    sharedMemoryRef.current?.dispose()
    sharedMemoryRef.current = null

    const geometry = starMeshRef.current?.geometry
    if (geometry) {
      for (const key of Object.keys(geometry.attributes)) {
        geometry.deleteAttribute(key)
      }
    }

    if (wasmModule && starCount > 0) {
      sharedMemoryRef.current = new StarFieldSharedMemory(wasmModule, starCount)
      if (geometry) bindStarfieldGeometry(geometry, sharedMemoryRef.current)
      // Request a render so the field draws once bound — required under
      // frameloop="demand" (reduced motion), harmless under "always".
      invalidate()
    }

    return () => {
      sharedMemoryRef.current?.dispose()
      sharedMemoryRef.current = null
    }
  }, [wasmModule, starCount, starMeshRef, invalidate])

  // DOM interaction: responsive density + movement/click speed boosts.
  useEffect(() => {
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null
    let moveTimeout: ReturnType<typeof setTimeout> | null = null

    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        setStarCount(getStarCount(window.innerWidth, window.innerHeight))
      }, 150)
    }

    const markMoving = () => {
      isMovingRef.current = true
      if (moveTimeout) clearTimeout(moveTimeout)
      moveTimeout = setTimeout(() => {
        isMovingRef.current = false
      }, 100)
    }

    // Decorative easter-egg interaction — pointer-only by design (no keyboard
    // equivalent needed for non-essential visual feedback).
    const handleClick = () => {
      shouldBoostFromClick.current = true
    }

    const handleScroll = () => {
      markMoving()
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      scrollProgressRef.current =
        maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', markMoving)
    window.addEventListener('click', handleClick)
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', markMoving)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', handleScroll)
      if (resizeTimeout) clearTimeout(resizeTimeout)
      if (moveTimeout) clearTimeout(moveTimeout)
    }
  }, [])

  useFrame((state) => {
    const mesh = starMeshRef.current
    const sharedMemory = sharedMemoryRef.current
    if (!mesh || !sharedMemory) return

    // Re-bind only if WASM memory was detached/grown (e.g. scatter-text allocations).
    if (mesh.geometry && sharedMemory.refreshViewsIfNeeded()) {
      bindStarfieldGeometry(mesh.geometry, sharedMemory)
    }

    const uniforms = (mesh.material as THREE.ShaderMaterial).uniforms
    if (!uniforms?.uBoot || !uniforms?.uTime) return

    const time = state.clock.elapsedTime
    const rawDelta = lastFrameTimeRef.current === 0 ? 0.016 : time - lastFrameTimeRef.current
    lastFrameTimeRef.current = time
    const deltaTime = Math.min(rawDelta, MAX_DELTA)

    const reducedMotion = reducedMotionRef.current

    // Radial-expand boot. Reduced motion jumps straight to the settled field.
    if (reducedMotion) {
      uniforms.uBoot.value = 1
    } else {
      if (bootStartRef.current < 0) bootStartRef.current = time
      uniforms.uBoot.value = easeOutCubic(
        Math.min(1, (time - bootStartRef.current) / BOOT_DURATION)
      )
    }

    // Twinkle/sparkle advance with time; frozen for reduced motion.
    uniforms.uTime.value = reducedMotion ? 0 : time

    if (!firstFrameFiredRef.current) {
      firstFrameFiredRef.current = true
      onFirstFrame?.()
    }

    if (reducedMotion) return

    // Click boost records the most recent click time.
    if (shouldBoostFromClick.current) {
      clickTimeRef.current = time
      shouldBoostFromClick.current = false
    }

    // Speed multiplier: movement (8x) and decaying click (+8x) boosts, clamped + eased.
    const movementBoost = isMovingRef.current ? 8 : 1
    const timeSinceClick = time - clickTimeRef.current
    const clickBoost = timeSinceClick < 0.5 ? 1 + 8 * (1 - timeSinceClick / 0.5) : 1
    const target = Math.min(movementBoost * clickBoost, 15)
    speedMultiplierRef.current += (target - speedMultiplierRef.current) * 0.2

    rotationXRef.current += BASE_ROTATION_X * speedMultiplierRef.current * deltaTime
    rotationYRef.current += BASE_ROTATION_Y * speedMultiplierRef.current * deltaTime
    mesh.rotation.x = rotationXRef.current
    mesh.rotation.y = rotationYRef.current

    // Scroll-driven zoom: ease the camera toward the scroll-mapped distance.
    const targetZ = CAMERA_Z_BASE + (CAMERA_Z_ZOOMED - CAMERA_Z_BASE) * scrollProgressRef.current
    state.camera.position.z += (targetZ - state.camera.position.z) * CAMERA_ZOOM_LERP
  })
}
