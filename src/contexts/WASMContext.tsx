import { createContext, use, useEffect, useState, type ReactNode } from 'react'

import { loadWASM, type WASMModule } from '~/lib/wasm'

interface WASMContextType {
  wasmModule: WASMModule | null
  isLoading: boolean
}

const WASMContext = createContext<WASMContextType | null>(null)

export function WASMProvider({ children }: { children: ReactNode }) {
  const [wasmModule, setWasmModule] = useState<WASMModule | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadWASM()
      .then((module) => {
        setWasmModule(module)
        setIsLoading(false)
      })
      .catch(console.error)
  }, [])

  return <WASMContext.Provider value={{ wasmModule, isLoading }}>{children}</WASMContext.Provider>
}

export function useWASM() {
  const context = use(WASMContext)
  if (!context) {
    throw new Error('useWASM must be used within a WASMProvider')
  }
  return context
}
