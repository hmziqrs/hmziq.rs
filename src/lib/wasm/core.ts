import type { StarMemoryPointers, FrameUpdateResult } from './starfield'
import type { ScatterTextPointers } from './scatter-text'

let wasmModule: WASMModule | null = null
let loadPromise: Promise<WASMModule> | null = null

export interface WASMModule {
  memory: WebAssembly.Memory
  initialize_star_memory_pool: (count: number) => StarMemoryPointers
  update_frame_simd: (
    time: number,
    delta_time: number,
    camera_matrix_ptr: number,
    is_moving: boolean,
    click_time: number,
    current_speed_multiplier: number
  ) => FrameUpdateResult
  calculate_speed_multiplier: (
    is_moving: boolean,
    click_time: number,
    current_time: number,
    current_multiplier: number
  ) => number
  calculate_rotation_delta: (
    base_speed_x: number,
    base_speed_y: number,
    speed_multiplier: number,
    delta_time: number
  ) => Float32Array
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

interface WasmGlueModule {
  default: (opts: { module_or_path: string }) => Promise<void>
  get_wasm_memory: () => WebAssembly.Memory
  initialize_star_memory_pool: (count: number) => StarMemoryPointers
  update_frame_simd: WASMModule['update_frame_simd']
  calculate_speed_multiplier: WASMModule['calculate_speed_multiplier']
  calculate_rotation_delta: WASMModule['calculate_rotation_delta']
  set_text_pixels: WASMModule['set_text_pixels']
  get_scatter_text_pointers: () => ScatterTextPointers
  start_forming: () => void
  update_particles: (delta_time: number) => void
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
        update_frame_simd: wasmImport.update_frame_simd,
        calculate_speed_multiplier: wasmImport.calculate_speed_multiplier,
        calculate_rotation_delta: wasmImport.calculate_rotation_delta,
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
