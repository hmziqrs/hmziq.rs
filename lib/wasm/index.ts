// WASM SIMD module loader - mandatory WASM, no JavaScript fallbacks

let wasmModule: WASMModule | null = null
let loadPromise: Promise<WASMModule> | null = null

export interface WASMModule {
  add: (a: number, b: number) => number
  greet: (name: string) => string
  // Star field functions
  generate_star_positions: (
    count: number,
    start_index: number,
    min_radius: number,
    max_radius: number
  ) => Float32Array
  generate_star_colors: (count: number, start_index: number) => Float32Array
  generate_star_sizes: (count: number, start_index: number, size_multiplier: number) => Float32Array
  calculate_star_effects_arrays: (
    positions: Float32Array,
    count: number,
    time: number
  ) => Float32Array
  calculate_star_effects_with_temporal_coherence: (
    positions: Float32Array,
    previous_twinkles: Float32Array,
    previous_sparkles: Float32Array,
    count: number,
    time: number,
    threshold: number
  ) => Float32Array
  // Camera frustum culling
  get_visible_star_indices: (
    positions: Float32Array,
    count: number,
    camera_matrix: Float32Array,
    margin: number
  ) => Uint32Array
  cull_stars_by_frustum_simd: (
    positions: Float32Array,
    count: number,
    camera_matrix: Float32Array,
    margin: number
  ) => Uint8Array
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
  // Math utilities
  fast_sin: (x: number) => number
  fast_cos: (x: number) => number
  fast_sin_batch: (values: Float32Array) => Float32Array
  fast_cos_batch: (values: Float32Array) => Float32Array
  seed_random: (i: number) => number
  seed_random_batch: (start: number, count: number) => Float32Array
}

export async function loadWASM(): Promise<WASMModule> {
  // Return cached module if already loaded
  if (wasmModule) {
    return wasmModule
  }

  // Return existing load promise if loading is in progress
  if (loadPromise) {
    return await loadPromise
  }

  // Start mandatory WASM loading - fail if unavailable
  loadPromise = (async (): Promise<WASMModule> => {
    try {
      const wasmPath = '/wasm/pkg/hmziq_wasm_bg.wasm'
      const wasmModulePath = '/wasm/pkg/hmziq_wasm.js'
      
      const wasm = await import(/* webpackIgnore: true */ /* @ts-ignore */ wasmModulePath)
      await wasm.default(wasmPath)

      // Create WASM module with all SIMD functions
      wasmModule = {
        add: wasm.add,
        greet: wasm.greet,
        // Star field functions
        generate_star_positions: wasm.generate_star_positions,
        generate_star_colors: wasm.generate_star_colors,
        generate_star_sizes: wasm.generate_star_sizes,
        calculate_star_effects_arrays: wasm.calculate_star_effects_arrays,
        calculate_star_effects_with_temporal_coherence:
          wasm.calculate_star_effects_with_temporal_coherence,
        // Camera frustum culling
        get_visible_star_indices: wasm.get_visible_star_indices,
        cull_stars_by_frustum_simd: wasm.cull_stars_by_frustum_simd,
        // Animation functions
        calculate_speed_multiplier: wasm.calculate_speed_multiplier,
        calculate_rotation_delta: wasm.calculate_rotation_delta,
        // Math utilities
        fast_sin: wasm.fast_sin,
        fast_cos: wasm.fast_cos,
        fast_sin_batch: wasm.fast_sin_batch,
        fast_cos_batch: wasm.fast_cos_batch,
        seed_random: wasm.seed_random,
        seed_random_batch: wasm.seed_random_batch,
      }

      return wasmModule
    } catch (error) {
      throw new Error(`WASM SIMD module failed to load: ${error}`)
    }
  })()

  return await loadPromise
}

// Direct export - WASM SIMD is mandatory
export const getOptimizedFunctions = loadWASM

// Simple status check
export function isWASMLoaded(): boolean {
  return wasmModule !== null
}