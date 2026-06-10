import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import { useReducedMotion } from '~/hooks/useReducedMotion'
import type { WASMModule } from '~/lib/wasm/core'
import type { StarFieldSharedMemory } from '~/lib/wasm/starfield'

import { bindStarfieldGeometry } from './useStarfieldGeometry'

interface UseStarfieldFrameOptions {
  wasmModule: WASMModule | null
  sharedMemoryRef: React.RefObject<StarFieldSharedMemory | null>
  starMeshRef: React.RefObject<THREE.Points | null>
}

export function useStarfieldFrame({
  wasmModule,
  sharedMemoryRef,
  starMeshRef,
}: UseStarfieldFrameOptions) {
  const prefersReducedMotion = useReducedMotion()
  const reducedMotionRef = useRef(prefersReducedMotion)

  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion
  })

  const speedMultiplierRef = useRef(1)
  const rotationXRef = useRef(0)
  const rotationYRef = useRef(0)
  const lastFrameTimeRef = useRef(0)
  const clickBoostRef = useRef(0)
  const isMovingRef = useRef(false)
  const shouldBoostFromClick = useRef(false)
  const viewProjectionMatrixRef = useRef<THREE.Matrix4 | null>(null)
  const vpMatrixBufferRef = useRef<Float32Array | null>(null)
  const rotationDeltaViewRef = useRef<Float32Array | null>(null)

  useFrame((state) => {
    if (!wasmModule || !sharedMemoryRef.current) return

    try {
      const sharedMemory = sharedMemoryRef.current
      const geometry = starMeshRef.current?.geometry
      if (geometry && sharedMemory.refreshViewsIfNeeded()) {
        bindStarfieldGeometry(geometry, sharedMemory)
      }

      if (!(state.camera instanceof THREE.PerspectiveCamera)) return
      const camera = state.camera
      if (!viewProjectionMatrixRef.current) viewProjectionMatrixRef.current = new THREE.Matrix4()
      if (!vpMatrixBufferRef.current) vpMatrixBufferRef.current = new Float32Array(16)
      const viewProjectionMatrix = viewProjectionMatrixRef.current
      const vpMatrix = vpMatrixBufferRef.current
      viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)

      const currentFrameTime = state.clock.elapsedTime
      const deltaTime =
        lastFrameTimeRef.current === 0 ? 0.016 : currentFrameTime - lastFrameTimeRef.current
      lastFrameTimeRef.current = currentFrameTime

      if (shouldBoostFromClick.current) {
        clickBoostRef.current = currentFrameTime
        shouldBoostFromClick.current = false
      }

      speedMultiplierRef.current = wasmModule.calculate_speed_multiplier(
        isMovingRef.current,
        clickBoostRef.current,
        currentFrameTime,
        speedMultiplierRef.current
      )

      vpMatrix.set(viewProjectionMatrix.elements)

      const frameResult = sharedMemory.updateFrame(
        wasmModule,
        state.clock.elapsedTime,
        deltaTime,
        vpMatrix,
        isMovingRef.current,
        clickBoostRef.current,
        speedMultiplierRef.current
      )

      if (geometry && sharedMemory.refreshViewsIfNeeded()) {
        bindStarfieldGeometry(geometry, sharedMemory)
      }

      // Skip rotation, twinkle, and sparkle when reduced motion is preferred
      if (reducedMotionRef.current) return

      const baseRotationSpeedX = 0.02
      const baseRotationSpeedY = 0.01
      const rotationDeltaPtr = wasmModule.calculate_rotation_delta(
        baseRotationSpeedX,
        baseRotationSpeedY,
        speedMultiplierRef.current,
        deltaTime
      )

      // Read from pre-allocated WASM buffer (pointer to [f32; 2])
      if (
        !rotationDeltaViewRef.current ||
        rotationDeltaViewRef.current.buffer !== wasmModule.memory.buffer ||
        rotationDeltaViewRef.current.byteOffset !== rotationDeltaPtr
      ) {
        rotationDeltaViewRef.current = new Float32Array(
          wasmModule.memory.buffer,
          rotationDeltaPtr,
          2
        )
      }
      const rotView = rotationDeltaViewRef.current
      rotationXRef.current += rotView[0]
      rotationYRef.current += rotView[1]

      if (starMeshRef.current) {
        starMeshRef.current.rotation.x = rotationXRef.current
        starMeshRef.current.rotation.y = rotationYRef.current
      }

      if (starMeshRef.current?.geometry && frameResult.effects_dirty) {
        const geometry = starMeshRef.current.geometry
        const twinkleAttr = geometry.getAttribute('twinkle')
        const sparkleAttr = geometry.getAttribute('sparkle')

        if (twinkleAttr instanceof THREE.BufferAttribute) twinkleAttr.needsUpdate = true
        if (sparkleAttr instanceof THREE.BufferAttribute) sparkleAttr.needsUpdate = true
      }
    } catch (error) {
      console.error('StarField frame error:', error)
      return
    }
  })

  return { isMovingRef, shouldBoostFromClick }
}
