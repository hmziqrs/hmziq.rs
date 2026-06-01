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
          <div className="flex items-center justify-center">
            <div className="text-gray-500">Loading WASM module...</div>
          </div>
        )}
      </>
    )
  }

  return <>{children}</>
}
