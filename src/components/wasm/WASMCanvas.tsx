import { Suspense, type ReactNode } from 'react'

import { ErrorBoundary } from '~/components/ui/ErrorBoundary'
import { useWASM } from '~/contexts/WASMContext'

interface WASMCanvasProps {
  children: ReactNode
  loadingFallback?: ReactNode
  errorFallback?: ReactNode
}

export function WASMCanvas({ children, loadingFallback, errorFallback }: WASMCanvasProps) {
  const { isLoading } = useWASM()

  if (isLoading) {
    // Distinguish an explicit `null` (render nothing — caller supplies its own
    // backdrop) from an omitted prop (show the default loading indicator).
    if (loadingFallback !== undefined) {
      return loadingFallback
    }
    return (
      <output className="flex items-center justify-center" aria-live="polite">
        <div className="text-gray-300">Loading WASM module…</div>
      </output>
    )
  }

  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={null}>{children}</Suspense>
    </ErrorBoundary>
  )
}
