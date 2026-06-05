import { Canvas } from '@react-three/fiber'
import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'

import { useWASM } from '~/contexts/WASMContext'

import { VERTEX_SHADER, FRAGMENT_SHADER } from './shaders'
import { useStarfieldEvents } from './useStarfieldEvents'
import { useStarfieldFrame } from './useStarfieldFrame'
import { useStarfieldGeometry } from './useStarfieldGeometry'

const STARFIELD_CAMERA = { position: [0, 0, 50] as [number, number, number], fov: 75 } as const

function Stars() {
  const [screenDimensions, setScreenDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  })

  const { wasmModule } = useWASM()

  const starMeshRef = useRef<THREE.Points>(null)

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  )

  const starCount = useMemo(() => {
    const ultraStarDensity = 0.36 * 1.125
    const screenArea = screenDimensions.width * screenDimensions.height
    const rawCount = Math.floor((screenArea / 1000) * ultraStarDensity)
    return Math.ceil(rawCount / 8) * 8
  }, [screenDimensions])

  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  const handleResize = useCallback((width: number, height: number) => {
    setScreenDimensions({ width, height })
  }, [])

  const { sharedMemoryRef } = useStarfieldGeometry({
    wasmModule,
    starCount,
    starMeshRef,
  })

  const { isMovingRef, shouldBoostFromClick } = useStarfieldFrame({
    wasmModule,
    sharedMemoryRef,
    starMeshRef,
  })

  useStarfieldEvents(handleResize, isMovingRef, shouldBoostFromClick)

  return (
    // eslint-disable-next-line react-hooks-js/refs -- ref passed to Three.js element, not read during render
    <points ref={starMeshRef} material={material}>
      <bufferGeometry />
    </points>
  )
}

export default function OptimizedStarField() {
  if (typeof window === 'undefined') {
    return <div className="fixed inset-0" style={{ backgroundColor: '#000000', zIndex: 1 }} />
  }

  return (
    <div className="fixed inset-0" style={{ zIndex: 1 }} aria-hidden="true">
      <Canvas
        camera={STARFIELD_CAMERA}
        style={{ background: '#000000' }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement
          const handleContextLost = (e: Event) => {
            e.preventDefault()
          }
          const handleContextRestored = () => {
            // R3F handles re-render automatically
          }
          canvas.addEventListener('webglcontextlost', handleContextLost)
          canvas.addEventListener('webglcontextrestored', handleContextRestored)
        }}
      >
        <Stars />
      </Canvas>
    </div>
  )
}
