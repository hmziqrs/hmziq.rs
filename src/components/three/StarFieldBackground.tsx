import { lazy, useEffect, useRef, useState } from 'react'

import { WASMCanvas } from '~/components/wasm/WASMCanvas'

import { CSSStarField } from './CSSStarField'

const StarField3D = lazy(() => import('./StarField'))

// Crossfade overlap before the CSS backdrop is unmounted (must exceed the
// 600ms opacity transition in CSSStarField / StarFieldCanvas).
const CROSSFADE_MS = 700

/**
 * Owns the decorative star background: a pure-CSS field paints instantly, and
 * the WebGL field (Three.js + WASM) crossfades in over it once it draws its
 * first frame. If WebGL/WASM never become ready, the CSS field simply stays.
 */
export function StarFieldBackground() {
  const [webglReady, setWebglReady] = useState(false)
  const [cssMounted, setCssMounted] = useState(true)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleReady = () => {
    setWebglReady(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setCssMounted(false), CROSSFADE_MS)
  }

  const handleContextLost = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    // Bring the CSS backdrop back during the WebGL recovery gap.
    setCssMounted(true)
    setWebglReady(false)
  }

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  return (
    <>
      {cssMounted && <CSSStarField fadeOut={webglReady} />}
      <WASMCanvas loadingFallback={null} errorFallback={null}>
        <StarField3D onReady={handleReady} onContextLost={handleContextLost} />
      </WASMCanvas>
    </>
  )
}
