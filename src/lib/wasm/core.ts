import type { StarMemoryPointers } from './starfield'
import type { ScatterTextPointers } from './scatter-text'

let wasmModule: WASMModule | null = null
let loadPromise: Promise<WASMModule> | null = null

export interface WASMModule {
  memory: WebAssembly.Memory
  initialize_star_memory_pool: (count: number) => StarMemoryPointers
  destroy_star_memory_pool: () => void
  set_text_pixels: (
    pixel_data: Uint8Array,
    width: number,
    height: number,
    canvas_width: number,
    canvas_height: number,
    skip: number
  ) => number
  get_scatter_text_pointers: () => ScatterTextPointers
  start_forming: () => void
  update_particles: (delta_time: number) => void
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
        set_text_pixels: wasmImport.set_text_pixels,
        get_scatter_text_pointers: wasmImport.get_scatter_text_pointers,
        start_forming: wasmImport.start_forming,
        update_particles: wasmImport.update_particles,
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
