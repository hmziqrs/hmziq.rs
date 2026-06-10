import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'

import { loadWASM, type WASMModule } from '~/lib/wasm'

interface WASMContextType {
  wasmModule: WASMModule | null
  isLoading: boolean
  isError: boolean
  error?: Error | undefined
}

const WASMContext = createContext<WASMContextType | null>(null)

export function WASMProvider({ children }: { children: ReactNode }) {
  const [wasmModule, setWasmModule] = useState<WASMModule | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | undefined>(undefined)
  const loadingRef = useRef(false)

  useEffect(() => {
    if (loadingRef.current) return
    loadingRef.current = true
    let cancelled = false

    loadWASM()
      .then((module) => {
        if (cancelled) return
        setWasmModule(module)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        // WASM not available (files not built) — degrade gracefully
        const loadError = err instanceof Error ? err : new Error(String(err))
        setError(loadError)
        setIsError(true)
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return <WASMContext.Provider value={{ wasmModule, isLoading, isError, error }}>{children}</WASMContext.Provider>
}

export function useWASM() {
  const context = useContext(WASMContext)
  if (!context) {
    throw new Error('useWASM must be used within a WASMProvider')
  }
  return context
}
