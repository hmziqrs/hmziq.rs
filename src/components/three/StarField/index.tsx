import { useEffect, useRef, useState } from 'react'

import { useWASM } from '~/contexts/WASMContext'
import { useReducedMotion } from '~/hooks/useReducedMotion'
import type { WASMModule } from '~/lib/wasm/core'

import { useStarfield } from './useStarfield'

interface StarfieldCanvasProps {
  wasmModule: WASMModule | null
  onFirstFrame?: () => void
  onContextLost?: () => void
}

function StarfieldCanvas({ wasmModule, onFirstFrame, onContextLost }: StarfieldCanvasProps) {
  const canvasRef = useStarfield({ wasmModule, onFirstFrame, onContextLost })

  return <canvas ref={canvasRef} data-webgl-canvas="starfield" className="block h-full w-full" />
}

interface StarFieldCanvasProps {
  onReady?: () => void
  onContextLost?: () => void
}

function StarFieldCanvas({ onReady, onContextLost }: StarFieldCanvasProps) {
  const { wasmModule } = useWASM()
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
      <StarfieldCanvas
        key={canvasVersion}
        wasmModule={wasmModule}
        onFirstFrame={handleFirstFrame}
        onContextLost={recoverContext}
      />
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
