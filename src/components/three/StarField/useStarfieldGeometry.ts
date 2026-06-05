import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import type { WASMModule } from '~/lib/wasm/core'
import { StarFieldSharedMemory } from '~/lib/wasm/starfield'

interface UseStarfieldGeometryOptions {
  wasmModule: WASMModule | null
  starCount: number
  starMeshRef: React.RefObject<THREE.Points | null>
}

export function bindStarfieldGeometry(
  geometry: THREE.BufferGeometry,
  sharedMem: StarFieldSharedMemory
) {
  const starCount = sharedMem.count
  const positionsX = sharedMem.positions_x
  const positionsY = sharedMem.positions_y
  const positionsZ = sharedMem.positions_z
  const colorsR = sharedMem.colors_r
  const colorsG = sharedMem.colors_g
  const colorsB = sharedMem.colors_b
  const sizes = sharedMem.sizes
  const twinkles = sharedMem.twinkles
  const sparkles = sharedMem.sparkles

  if (
    !positionsX ||
    !positionsY ||
    !positionsZ ||
    !colorsR ||
    !colorsG ||
    !colorsB ||
    !sizes ||
    !twinkles ||
    !sparkles
  ) {
    return
  }

  for (const key of Object.keys(geometry.attributes)) {
    geometry.deleteAttribute(key)
  }

  geometry.setAttribute('positionX', new THREE.BufferAttribute(positionsX, 1))
  geometry.setAttribute('positionY', new THREE.BufferAttribute(positionsY, 1))
  geometry.setAttribute('positionZ', new THREE.BufferAttribute(positionsZ, 1))
  geometry.setAttribute('colorR', new THREE.BufferAttribute(colorsR, 1))
  geometry.setAttribute('colorG', new THREE.BufferAttribute(colorsG, 1))
  geometry.setAttribute('colorB', new THREE.BufferAttribute(colorsB, 1))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('twinkle', new THREE.BufferAttribute(twinkles, 1))
  geometry.setAttribute('sparkle', new THREE.BufferAttribute(sparkles, 1))

  let minX = Infinity,
    maxX = -Infinity
  let minY = Infinity,
    maxY = -Infinity
  let minZ = Infinity,
    maxZ = -Infinity
  for (let i = 0; i < starCount; i++) {
    if (positionsX[i] < minX) minX = positionsX[i]
    if (positionsX[i] > maxX) maxX = positionsX[i]
    if (positionsY[i] < minY) minY = positionsY[i]
    if (positionsY[i] > maxY) maxY = positionsY[i]
    if (positionsZ[i] < minZ) minZ = positionsZ[i]
    if (positionsZ[i] > maxZ) maxZ = positionsZ[i]
  }

  geometry.boundingBox = new THREE.Box3(
    new THREE.Vector3(minX, minY, minZ),
    new THREE.Vector3(maxX, maxY, maxZ)
  )

  geometry.boundingSphere = new THREE.Sphere()
  geometry.boundingBox.getBoundingSphere(geometry.boundingSphere)

  geometry.setDrawRange(0, starCount)
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
        bindStarfieldGeometry(starMeshRef.current.geometry, sharedMemoryRef.current)
      }
    }

    return () => {
      sharedMemoryRef.current?.dispose()
      sharedMemoryRef.current = null
    }
  }, [wasmModule, starCount, starMeshRef])

  return { sharedMemoryRef }
}
