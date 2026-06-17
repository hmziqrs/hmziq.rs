import type { StarMemoryPointers } from './starfield'

let wasmModule: WASMModule | null = null
let loadPromise: Promise<WASMModule> | null = null

export interface WASMModule {
  memory: WebAssembly.Memory
  initialize_star_memory_pool: (count: number) => StarMemoryPointers
  destroy_star_memory_pool: () => void
}

type WasmFunctions = Omit<WASMModule, 'memory'>

interface WasmGlueModule extends WasmFunctions {
  default: (opts: { module_or_path: string }) => Promise<void>
  get_wasm_memory: () => WebAssembly.Memory
}

export async function loadWASM(): Promise<WASMModule> {
  if (wasmModule) {
    return wasmModule
  }

  if (loadPromise) {
    return await loadPromise
  }

  loadPromise = (async (): Promise<WASMModule> => {
    try {
      const wasmPath = '/wasm/pkg/hmziq_wasm_bg.wasm'
      const wasmModulePath = '/wasm/pkg/hmziq_wasm.js'

      const wasmImport: WasmGlueModule = await import(
        /* @vite-ignore */ wasmModulePath
      )
      await wasmImport.default({ module_or_path: wasmPath })

      wasmModule = {
        memory: wasmImport.get_wasm_memory(),
        initialize_star_memory_pool: wasmImport.initialize_star_memory_pool,
        destroy_star_memory_pool: wasmImport.destroy_star_memory_pool,
      }

      return wasmModule
    } catch (error) {
      loadPromise = null
      console.warn('WASM module not available:', error instanceof Error ? error.message : error)
      throw error
    }
  })()

  return await loadPromise
}
