import { useWASM } from '~/contexts/WASMContext'

interface WASMLoaderProps {
  children: React.ReactNode
  loadingFallback?: React.ReactNode
}

export default function WASMLoader({ children, loadingFallback }: WASMLoaderProps) {
  const { isLoading } = useWASM()

  if (isLoading) {
    return (
      <>
        {loadingFallback || (
          <output className="flex items-center justify-center" aria-live="polite">
            <div className="text-gray-300">Loading WASM module…</div>
          </output>
        )}
      </>
    )
  }

  return <>{children}</>
}
