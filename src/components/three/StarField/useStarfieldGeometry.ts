import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import type { WASMModule } from '~/lib/wasm/core'
import { StarFieldSharedMemory } from '~/lib/wasm/starfield'

interface UseStarfieldGeometryOptions {
  wasmModule: WASMModule | null
  starCount: number
  starMeshRef: React.RefObject<THREE.Points | null>
}

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

export function bindStarfieldGeometry(
  geometry: THREE.BufferGeometry,
  sharedMem: StarFieldSharedMemory
) {
  const starCount = sharedMem.count

  for (const key of Object.keys(geometry.attributes)) {
    geometry.deleteAttribute(key)
  }

  for (const [attribute, bufferKey] of ATTRIBUTE_BINDINGS) {
    const buffer = sharedMem[bufferKey]
    if (!buffer) return
    geometry.setAttribute(attribute, new THREE.BufferAttribute(buffer, 1))
  }

  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), STAR_FIELD_RADIUS)
  geometry.setDrawRange(0, starCount)
}

export function useStarfieldGeometry({
  wasmModule,
  starCount,
  starMeshRef,
}: UseStarfieldGeometryOptions) {
  const sharedMemoryRef = useRef<StarFieldSharedMemory | null>(null)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    if (sharedMemoryRef.current) {
      sharedMemoryRef.current.dispose()
    }
    sharedMemoryRef.current = null

    if (starMeshRef.current?.geometry) {
      const geometry = starMeshRef.current.geometry
      for (const key of Object.keys(geometry.attributes)) {
        geometry.deleteAttribute(key)
      }
    }

    if (wasmModule && starCount > 0) {
      sharedMemoryRef.current = new StarFieldSharedMemory(wasmModule, starCount)

      if (starMeshRef.current?.geometry) {
        bindStarfieldGeometry(starMeshRef.current.geometry, sharedMemoryRef.current)
      }

      // Request a render so the field draws once bound — required under
      // frameloop="demand" (reduced motion), harmless under "always".
      invalidate()
    }

    return () => {
      sharedMemoryRef.current?.dispose()
      sharedMemoryRef.current = null
    }
  }, [wasmModule, starCount, starMeshRef, invalidate])

  return { sharedMemoryRef }
}
