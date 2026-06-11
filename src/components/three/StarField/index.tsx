import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import { useWASM } from '~/contexts/WASMContext'

import { CanvasContextEvents } from '../CanvasContextEvents'
import { VERTEX_SHADER, FRAGMENT_SHADER } from './shaders'
import { useStarfieldEvents } from './useStarfieldEvents'
import { useStarfieldFrame } from './useStarfieldFrame'
import { useStarfieldGeometry } from './useStarfieldGeometry'

const STARFIELD_CAMERA = { position: [0, 0, 50] as [number, number, number], fov: 75 } as const

function getStarCount(width: number, height: number) {
  const rawCount = Math.floor(((width * height) / 1000) * 0.36 * 1.125)
  return Math.ceil(rawCount / 8) * 8
}

function markStarfieldCanvas(canvas: HTMLCanvasElement | null) {
  if (canvas) canvas.dataset.webglCanvas = 'starfield'
}

function Stars() {
  const [starCount, setStarCount] = useState(() =>
    getStarCount(
      typeof window !== 'undefined' ? window.innerWidth : 1920,
      typeof window !== 'undefined' ? window.innerHeight : 1080
    )
  )
  const { wasmModule } = useWASM()
  const starMeshRef = useRef<THREE.Points>(null)

  const handleResize = (width: number, height: number) => setStarCount(getStarCount(width, height))

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
    <points ref={starMeshRef}>
      <bufferGeometry />
      <shaderMaterial
        uniforms={{}}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

function StarFieldCanvas() {
  const [canvasVersion, setCanvasVersion] = useState(0)
  const recoveryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const recoverContext = () => {
    if (recoveryTimeoutRef.current) return

    recoveryTimeoutRef.current = setTimeout(() => {
      setCanvasVersion((version) => version + 1)
      recoveryTimeoutRef.current = null
    }, 100)
  }

  useEffect(() => {
    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      // Decorative background canvas — hidden from assistive technology (sr-only heading in Hero provides accessible text)
      className="fixed inset-0"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    >
      <Canvas
        key={canvasVersion}
        ref={markStarfieldCanvas}
        camera={STARFIELD_CAMERA}
        style={{ background: '#000000' }}
      >
        <CanvasContextEvents onContextLost={recoverContext} />
        <Stars />
      </Canvas>
    </div>
  )
}

export default function OptimizedStarField() {
  if (typeof window === 'undefined') {
    return <div className="fixed inset-0" style={{ backgroundColor: '#000000', zIndex: 1 }} />
  }

  return <StarFieldCanvas />
}
