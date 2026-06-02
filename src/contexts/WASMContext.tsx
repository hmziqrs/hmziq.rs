import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'

import { loadWASM, type WASMModule } from '~/lib/wasm'

interface WASMContextType {
  wasmModule: WASMModule | null
  isLoading: boolean
}

const WASMContext = createContext<WASMContextType | null>(null)

export function WASMProvider({ children }: { children: ReactNode }) {
  const [wasmModule, setWasmModule] = useState<WASMModule | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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
      .catch(() => {
        if (cancelled) return
        // WASM not available (files not built) — degrade gracefully
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return <WASMContext.Provider value={{ wasmModule, isLoading }}>{children}</WASMContext.Provider>
}

export function useWASM() {
  const context = useContext(WASMContext)
  if (!context) {
    throw new Error('useWASM must be used within a WASMProvider')
  }
  return context
}
