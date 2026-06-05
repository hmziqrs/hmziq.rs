import { Suspense, type ReactNode } from 'react'

import { ErrorBoundary } from './ErrorBoundary'
import WASMLoader from './WASMLoader'

interface WASMCanvasProps {
  children: ReactNode
  loadingFallback?: ReactNode
  errorFallback?: ReactNode
}

export function WASMCanvas({ children, loadingFallback, errorFallback }: WASMCanvasProps) {
  return (
    <WASMLoader loadingFallback={loadingFallback}>
      <ErrorBoundary fallback={errorFallback}>
        <Suspense fallback={null}>{children}</Suspense>
      </ErrorBoundary>
    </WASMLoader>
  )
}
