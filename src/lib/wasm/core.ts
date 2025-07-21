// WASM SIMD loader core

import type { StarMemoryPointers, FrameUpdateResult } from './starfield'
import type { ScatterTextPointers } from './scatter-text'

let wasmModule: WASMModule | null = null
let loadPromise: Promise<WASMModule> | null = null

export interface WASMModule {
  // Shared memory management
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
  // Animation functions
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
  // Scatter text functions
  initialize_scatter_text: (max_particles: number) => ScatterTextPointers
  set_text_pixels: (
    pixel_data: Uint8Array,
    width: number,
    height: number,
    canvas_width: number,
    canvas_height: number,
    skip: number
  ) => number
  start_forming: () => void
  start_scattering: () => void
  update_particles: (delta_time: number) => void
  set_easing_factor: (factor: number) => void
  set_fade_rate: (rate: number) => void
  set_scatter_speed: (speed: number) => void
  get_particle_count: () => number
  is_forming: () => boolean
}

export async function loadWASM(): Promise<WASMModule> {
  // Return cached module
  if (wasmModule) {
    return wasmModule
  }

  // Return load promise
  if (loadPromise) {
    return await loadPromise
  }

  // Load WASM module
  loadPromise = (async (): Promise<WASMModule> => {
    try {
      const wasmPath = '/wasm/pkg/hmziq_wasm_bg.wasm'
      const wasmModulePath = '/wasm/pkg/hmziq_wasm.js'

      const wasmImport = await import(/* webpackIgnore: true */ /* @ts-ignore */ wasmModulePath)
      await wasmImport.default(wasmPath)

      // Create WASM module
      wasmModule = {
        // Shared memory management
        memory: wasmImport.get_wasm_memory(),
        initialize_star_memory_pool: wasmImport.initialize_star_memory_pool,
        update_frame_simd: wasmImport.update_frame_simd,
        // Animation functions
        calculate_speed_multiplier: wasmImport.calculate_speed_multiplier,
        calculate_rotation_delta: wasmImport.calculate_rotation_delta,
        // Scatter text functions
        initialize_scatter_text: wasmImport.initialize_scatter_text,
        set_text_pixels: wasmImport.set_text_pixels,
        start_forming: wasmImport.start_forming,
        start_scattering: wasmImport.start_scattering,
        update_particles: wasmImport.update_particles,
        set_easing_factor: wasmImport.set_easing_factor,
        set_fade_rate: wasmImport.set_fade_rate,
        set_scatter_speed: wasmImport.set_scatter_speed,
        get_particle_count: wasmImport.get_particle_count,
        is_forming: wasmImport.is_forming,
      }

      return wasmModule
    } catch (error) {
      throw new Error(`WASM SIMD module failed to load: ${error}`)
    }
  })()

  return await loadPromise
}

export const getOptimizedFunctions = loadWASM

export function isWASMLoaded(): boolean {
  return wasmModule !== null
}