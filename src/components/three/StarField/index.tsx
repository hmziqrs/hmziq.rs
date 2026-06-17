import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

import { useWASM } from '~/contexts/WASMContext'
import { useReducedMotion } from '~/hooks/useReducedMotion'

import { CanvasContextEvents } from '../CanvasContextEvents'
import { VERTEX_SHADER, FRAGMENT_SHADER } from './shaders'
import { useStarfield } from './useStarfield'

const STARFIELD_CAMERA = { position: [0, 0, 50] as [number, number, number], fov: 75 } as const

function markStarfieldCanvas(canvas: HTMLCanvasElement | null) {
  if (canvas) canvas.dataset.webglCanvas = 'starfield'
}

interface StarsProps {
  onFirstFrame?: () => void
}

function Stars({ onFirstFrame }: StarsProps) {
  const { wasmModule } = useWASM()
  const starMeshRef = useRef<THREE.Points>(null)

  // Stable uniforms object — its identity must not change or R3F rebuilds the material.
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uBoot: { value: 0 } }), [])

  useStarfield({ wasmModule, starMeshRef, onFirstFrame })

  return (
    // eslint-disable-next-line react-hooks-js/refs -- ref passed to Three.js element, not read during render
    <points ref={starMeshRef}>
      <bufferGeometry />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

interface StarFieldCanvasProps {
  onReady?: () => void
  onContextLost?: () => void
}

function StarFieldCanvas({ onReady, onContextLost }: StarFieldCanvasProps) {
  const prefersReducedMotion = useReducedMotion()
  const [canvasVersion, setCanvasVersion] = useState(0)
  const [visible, setVisible] = useState(false)
  const recoveryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleFirstFrame = () => {
    setVisible(true)
    onReady?.()
  }

  const recoverContext = () => {
    setVisible(false)
    onContextLost?.()
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
      style={{
        zIndex: 1,
        opacity: visible ? 1 : 0,
        transition: prefersReducedMotion ? undefined : 'opacity 600ms ease',
      }}
      aria-hidden="true"
    >
      <Canvas
        key={canvasVersion}
        ref={markStarfieldCanvas}
        camera={STARFIELD_CAMERA}
        frameloop={prefersReducedMotion ? 'demand' : 'always'}
        style={{ background: '#000000' }}
      >
        <CanvasContextEvents onContextLost={recoverContext} />
        <Stars onFirstFrame={handleFirstFrame} />
      </Canvas>
    </div>
  )
}

interface OptimizedStarFieldProps {
  onReady?: () => void
  onContextLost?: () => void
}

export default function OptimizedStarField({ onReady, onContextLost }: OptimizedStarFieldProps) {
  if (typeof window === 'undefined') return null

  return <StarFieldCanvas onReady={onReady} onContextLost={onContextLost} />
}
