import React, { createContext, useContext, useEffect, useState, useRef } from 'react'

import { loadWASM, type WASMModule } from '~/lib/wasm'

interface WASMContextType {
  wasmModule: WASMModule | null
  isLoading: boolean
}

const WASMContext = createContext<WASMContextType | null>(null)

export function WASMProvider({ children }: { children: React.ReactNode }) {
  const [wasmModule, setWasmModule] = useState<WASMModule | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const loadingRef = useRef(false)

  useEffect(() => {
    if (loadingRef.current) return
    loadingRef.current = true

    loadWASM()
      .then((module) => {
        setWasmModule(module)
        setIsLoading(false)
      })
      .catch(() => {
        // WASM not available (files not built) — degrade gracefully
        setIsLoading(false)
      })
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
