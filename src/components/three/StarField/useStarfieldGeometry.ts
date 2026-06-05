import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import type { WASMModule } from '~/lib/wasm/core'
import { StarFieldSharedMemory } from '~/lib/wasm/starfield'

interface UseStarfieldGeometryOptions {
  wasmModule: WASMModule | null
  starCount: number
  starMeshRef: React.RefObject<THREE.Points | null>
}

export function useStarfieldGeometry({
  wasmModule,
  starCount,
  starMeshRef,
}: UseStarfieldGeometryOptions) {
  const sharedMemoryRef = useRef<StarFieldSharedMemory | null>(null)

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
        const geometry = starMeshRef.current.geometry
        const sharedMem = sharedMemoryRef.current

        geometry.setAttribute('positionX', new THREE.BufferAttribute(sharedMem.positions_x!, 1))
        geometry.setAttribute('positionY', new THREE.BufferAttribute(sharedMem.positions_y!, 1))
        geometry.setAttribute('positionZ', new THREE.BufferAttribute(sharedMem.positions_z!, 1))
        geometry.setAttribute('colorR', new THREE.BufferAttribute(sharedMem.colors_r!, 1))
        geometry.setAttribute('colorG', new THREE.BufferAttribute(sharedMem.colors_g!, 1))
        geometry.setAttribute('colorB', new THREE.BufferAttribute(sharedMem.colors_b!, 1))
        geometry.setAttribute('size', new THREE.BufferAttribute(sharedMem.sizes!, 1))
        geometry.setAttribute('twinkle', new THREE.BufferAttribute(sharedMem.twinkles!, 1))
        geometry.setAttribute('sparkle', new THREE.BufferAttribute(sharedMem.sparkles!, 1))

        let minX = Infinity,
          maxX = -Infinity
        let minY = Infinity,
          maxY = -Infinity
        let minZ = Infinity,
          maxZ = -Infinity
        const px = sharedMem.positions_x!
        const py = sharedMem.positions_y!
        const pz = sharedMem.positions_z!
        for (let i = 0; i < starCount; i++) {
          if (px[i] < minX) minX = px[i]
          if (px[i] > maxX) maxX = px[i]
          if (py[i] < minY) minY = py[i]
          if (py[i] > maxY) maxY = py[i]
          if (pz[i] < minZ) minZ = pz[i]
          if (pz[i] > maxZ) maxZ = pz[i]
        }

        geometry.boundingBox = new THREE.Box3(
          new THREE.Vector3(minX, minY, minZ),
          new THREE.Vector3(maxX, maxY, maxZ)
        )

        geometry.boundingSphere = new THREE.Sphere()
        geometry.boundingBox.getBoundingSphere(geometry.boundingSphere)

        // CRITICAL: Set vertex count for custom attributes
        geometry.setDrawRange(0, starCount)
      }
    }

    return () => {
      sharedMemoryRef.current?.dispose()
      sharedMemoryRef.current = null
    }
  }, [wasmModule, starCount, starMeshRef])

  return { sharedMemoryRef }
}
