// WASM SIMD module loader - mandatory WASM, no JavaScript fallbacks

let wasmModule: WASMModule | null = null
let loadPromise: Promise<WASMModule> | null = null

// Shared memory pointer structure
export interface StarMemoryPointers {
  positions_ptr: number
  colors_ptr: number
  sizes_ptr: number
  twinkles_ptr: number
  sparkles_ptr: number
  visibility_ptr: number
  count: number
  positions_length: number
  colors_length: number
  sizes_length: number
  twinkles_length: number
  sparkles_length: number
  visibility_length: number
}

// Frame update result structure
export interface FrameUpdateResult {
  visible_count: number
  positions_dirty: boolean
  effects_dirty: boolean
  culling_dirty: boolean
}

export interface WASMModule {
  add: (a: number, b: number) => number
  greet: (name: string) => string
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
      
      const wasmImport = await import(/* webpackIgnore: true */ /* @ts-ignore */ wasmModulePath)
      await wasmImport.default(wasmPath)

      // Create WASM module with all SIMD functions
      wasmModule = {
        add: wasmImport.add,
        greet: wasmImport.greet,
        // Shared memory management
        memory: wasmImport.get_wasm_memory(),
        initialize_star_memory_pool: wasmImport.initialize_star_memory_pool,
        update_frame_simd: wasmImport.update_frame_simd,
        // Star field functions
        generate_star_positions: wasmImport.generate_star_positions,
        generate_star_colors: wasmImport.generate_star_colors,
        generate_star_sizes: wasmImport.generate_star_sizes,
        calculate_star_effects_arrays: wasmImport.calculate_star_effects_arrays,
        calculate_star_effects_with_temporal_coherence:
          wasmImport.calculate_star_effects_with_temporal_coherence,
        // Camera frustum culling
        get_visible_star_indices: wasmImport.get_visible_star_indices,
        cull_stars_by_frustum_simd: wasmImport.cull_stars_by_frustum_simd,
        // Animation functions
        calculate_speed_multiplier: wasmImport.calculate_speed_multiplier,
        calculate_rotation_delta: wasmImport.calculate_rotation_delta,
        // Math utilities
        fast_sin: wasmImport.fast_sin,
        fast_cos: wasmImport.fast_cos,
        fast_sin_batch: wasmImport.fast_sin_batch,
        fast_cos_batch: wasmImport.fast_cos_batch,
        seed_random: wasmImport.seed_random,
        seed_random_batch: wasmImport.seed_random_batch,
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

// Zero-copy shared memory wrapper for star field
export class StarFieldSharedMemory {
  private wasmMemory: WebAssembly.Memory
  private pointers: StarMemoryPointers
  
  // Direct views into WASM linear memory
  public positions: Float32Array
  public colors: Float32Array
  public sizes: Float32Array
  public twinkles: Float32Array
  public sparkles: Float32Array
  public visibilityMask: Uint8Array
  
  constructor(wasmModule: WASMModule, starCount: number) {
    this.wasmMemory = wasmModule.memory
    this.pointers = wasmModule.initialize_star_memory_pool(starCount)
    
    // Create direct views into WASM memory (zero-copy!)
    this.positions = new Float32Array(
      this.wasmMemory.buffer, 
      this.pointers.positions_ptr, 
      this.pointers.positions_length
    )
    
    this.colors = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.colors_ptr,
      this.pointers.colors_length
    )
    
    this.sizes = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.sizes_ptr,
      this.pointers.sizes_length
    )
    
    this.twinkles = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.twinkles_ptr,
      this.pointers.twinkles_length
    )
    
    this.sparkles = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.sparkles_ptr,
      this.pointers.sparkles_length
    )
    
    this.visibilityMask = new Uint8Array(
      this.wasmMemory.buffer,
      this.pointers.visibility_ptr,
      this.pointers.visibility_length
    )
  }
  
  get count(): number {
    return this.pointers.count
  }
  
  // Zero-copy frame update
  updateFrame(
    wasmModule: WASMModule,
    time: number, 
    deltaTime: number, 
    cameraMatrix: Float32Array | null,
    isMoving: boolean,
    clickTime: number,
    currentSpeedMultiplier: number
  ): FrameUpdateResult {
    // For now, pass 0 for camera matrix pointer
    // TODO: Implement proper camera matrix handling in WASM
    const cameraPtr = 0
    
    // All computation happens in WASM, modifies shared memory directly
    const result = wasmModule.update_frame_simd(
      time, 
      deltaTime, 
      cameraPtr,
      isMoving,
      clickTime,
      currentSpeedMultiplier
    )
    
    // JavaScript arrays are automatically updated (shared memory!)
    return result
  }
}