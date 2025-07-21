'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { loadWASM, type WASMModule } from '@/lib/wasm'

interface WASMContextType {
  wasmModule: WASMModule | null
  isLoading: boolean
  error: Error | null
}

const WASMContext = createContext<WASMContextType | null>(null)

export function WASMProvider({ children }: { children: React.ReactNode }) {
  const [wasmModule, setWasmModule] = useState<WASMModule | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const loadingRef = useRef(false)

  useEffect(() => {
    // Prevent multiple loads
    if (loadingRef.current) return
    loadingRef.current = true

    loadWASM()
      .then((module) => {
        setWasmModule(module)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load WASM module:', err)
        setError(err instanceof Error ? err : new Error('Failed to load WASM'))
        setIsLoading(false)
      })
  }, [])

  return (
    <WASMContext.Provider value={{ wasmModule, isLoading, error }}>{children}</WASMContext.Provider>
  )
}

export function useWASM() {
  const context = useContext(WASMContext)
  if (!context) {
    throw new Error('useWASM must be used within a WASMProvider')
  }
  return context!
}
