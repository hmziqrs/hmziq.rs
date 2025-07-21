'use client'

import { useWASM } from '@/contexts/WASMContext'

interface WASMLoaderProps {
  children: React.ReactNode
  loadingFallback?: React.ReactNode
  errorFallback?: (error: Error) => React.ReactNode
}

export default function WASMLoader({ 
  children, 
  loadingFallback,
  errorFallback 
}: WASMLoaderProps) {
  const { isLoading, error } = useWASM()

  if (isLoading) {
    return (
      <>
        {loadingFallback || (
          <div className="flex items-center justify-center">
            <div className="text-gray-500">Loading WASM module...</div>
          </div>
        )}
      </>
    )
  }

  if (error) {
    return (
      <>
        {errorFallback ? (
          errorFallback(error)
        ) : (
          <div className="flex items-center justify-center">
            <div className="text-red-500">Failed to load WASM module</div>
          </div>
        )}
      </>
    )
  }

  return <>{children}</>
}