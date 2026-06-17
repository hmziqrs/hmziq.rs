import { lazy, useEffect, useRef, useState } from 'react'

import { WASMCanvas } from '~/components/wasm/WASMCanvas'

const StarField3D = lazy(() => import('./StarField'))

// Crossfade overlap before the loader is unmounted (must exceed the 600ms opacity
// transitions on the loader / canvas wrapper).
const CROSSFADE_MS = 700

// Pulsing-core loader shown while the heavy WebGL field (Three.js + WASM) loads.
// Pure CSS, no client-only APIs — paints instantly, then fades out once the field draws.
function StarFieldLoader({ hidden }: { hidden: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 1,
        backgroundColor: '#000000',
        opacity: hidden ? 0 : 1,
        transition: 'opacity 600ms ease',
        pointerEvents: 'none',
      }}
    >
      <div className="star-loader">
        <span className="star-loader-ring" />
        <span className="star-loader-ring" style={{ animationDelay: '1.27s' }} />
        <span className="star-loader-ring" style={{ animationDelay: '2.53s' }} />
        <div className="star-loader-core" />
      </div>
    </div>
  )
}

/**
 * Owns the decorative star background: the loader paints immediately while the
 * WebGL field loads, then the field crossfades in once it draws its first frame.
 */
export function StarFieldBackground() {
  const [webglReady, setWebglReady] = useState(false)
  const [loaderMounted, setLoaderMounted] = useState(true)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleReady = () => {
    setWebglReady(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setLoaderMounted(false), CROSSFADE_MS)
  }

  const handleContextLost = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    // Bring the loader back during the WebGL recovery gap.
    setLoaderMounted(true)
    setWebglReady(false)
  }

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  return (
    <>
      {loaderMounted && <StarFieldLoader hidden={webglReady} />}
      <WASMCanvas loadingFallback={null} errorFallback={null}>
        <StarField3D onReady={handleReady} onContextLost={handleContextLost} />
      </WASMCanvas>
    </>
  )
}
