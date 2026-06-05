import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

import type { WASMModule } from '~/lib/wasm/core'
import type { StarFieldSharedMemory } from '~/lib/wasm/starfield'

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
  const speedMultiplierRef = useRef(1)
  const rotationXRef = useRef(0)
  const rotationYRef = useRef(0)
  const lastFrameTimeRef = useRef(0)
  const clickBoostRef = useRef(0)
  const isMovingRef = useRef(false)
  const shouldBoostFromClick = useRef(false)
  const viewProjectionMatrixRef = useRef<THREE.Matrix4 | null>(null)
  const vpMatrixBufferRef = useRef<Float32Array | null>(null)

  useFrame((state) => {
    if (!wasmModule || !sharedMemoryRef.current) return

    try {
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

      const frameResult = sharedMemoryRef.current.updateFrame(
        wasmModule,
        state.clock.elapsedTime,
        deltaTime,
        vpMatrix,
        isMovingRef.current,
        clickBoostRef.current,
        speedMultiplierRef.current
      )

      const baseRotationSpeedX = 0.02
      const baseRotationSpeedY = 0.01
      const rotationDelta = wasmModule.calculate_rotation_delta(
        baseRotationSpeedX,
        baseRotationSpeedY,
        speedMultiplierRef.current,
        deltaTime
      )

      rotationXRef.current += rotationDelta[0]
      rotationYRef.current += rotationDelta[1]

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
