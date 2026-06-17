import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import { useReducedMotion } from '~/hooks/useReducedMotion'
import type { StarFieldSharedMemory } from '~/lib/wasm/starfield'

import { bindStarfieldGeometry } from './useStarfieldGeometry'

interface UseStarfieldFrameOptions {
  sharedMemoryRef: React.RefObject<StarFieldSharedMemory | null>
  starMeshRef: React.RefObject<THREE.Points | null>
  onFirstFrame?: () => void
}

const BOOT_DURATION = 1.5
const MAX_DELTA = 0.1
const BASE_ROTATION_X = 0.02
const BASE_ROTATION_Y = 0.01

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export function useStarfieldFrame({
  sharedMemoryRef,
  starMeshRef,
  onFirstFrame,
}: UseStarfieldFrameOptions) {
  const prefersReducedMotion = useReducedMotion()
  const reducedMotionRef = useRef(prefersReducedMotion)
  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion
  })

  // Fed by useStarfieldEvents (DOM mouse/scroll/click).
  const isMovingRef = useRef(false)
  const shouldBoostFromClick = useRef(false)

  const clickTimeRef = useRef(-Infinity)
  const speedMultiplierRef = useRef(1)
  const rotationXRef = useRef(0)
  const rotationYRef = useRef(0)
  const lastFrameTimeRef = useRef(0)
  const bootStartRef = useRef(-1)
  const firstFrameFiredRef = useRef(false)

  useFrame((state) => {
    const mesh = starMeshRef.current
    const sharedMemory = sharedMemoryRef.current
    if (!mesh || !sharedMemory) return

    // Re-bind only if WASM memory was detached/grown (e.g. scatter-text allocations).
    if (mesh.geometry && sharedMemory.refreshViewsIfNeeded()) {
      bindStarfieldGeometry(mesh.geometry, sharedMemory)
    }

    const material = mesh.material as THREE.ShaderMaterial
    const uniforms = material.uniforms
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
  })

  return { isMovingRef, shouldBoostFromClick }
}
