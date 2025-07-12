// WASM SIMD module loader - mandatory WASM, no JavaScript fallbacks

let wasmModule: WASMModule | null = null
let loadPromise: Promise<WASMModule> | null = null

// Structure-of-Arrays memory pointer structure
export interface StarMemoryPointers {
  // Separate pointers for SoA layout
  positions_x_ptr: number
  positions_y_ptr: number
  positions_z_ptr: number
  colors_r_ptr: number
  colors_g_ptr: number
  colors_b_ptr: number
  sizes_ptr: number
  twinkles_ptr: number
  sparkles_ptr: number
  visibility_ptr: number
  count: number
  // Separate lengths for each SoA array
  positions_x_length: number
  positions_y_length: number
  positions_z_length: number
  colors_r_length: number
  colors_g_length: number
  colors_b_length: number
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

      // Create WASM module with essential functions only
      wasmModule = {
        // Shared memory management
        memory: wasmImport.get_wasm_memory(),
        initialize_star_memory_pool: wasmImport.initialize_star_memory_pool,
        update_frame_simd: wasmImport.update_frame_simd,
        // Animation functions
        calculate_speed_multiplier: wasmImport.calculate_speed_multiplier,
        calculate_rotation_delta: wasmImport.calculate_rotation_delta,
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

  // Structure-of-Arrays for positions and colors (optimal for SIMD)
  public positions_x: Float32Array
  public positions_y: Float32Array
  public positions_z: Float32Array
  public colors_r: Float32Array
  public colors_g: Float32Array
  public colors_b: Float32Array

  // Other attributes (already optimal)
  public sizes: Float32Array
  public twinkles: Float32Array
  public sparkles: Float32Array
  public visibilityMask: BigUint64Array

  constructor(wasmModule: WASMModule, starCount: number) {
    this.wasmMemory = wasmModule.memory
    this.pointers = wasmModule.initialize_star_memory_pool(starCount)

    // Create direct views into WASM memory for SoA layout (zero-copy!)
    this.positions_x = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.positions_x_ptr,
      this.pointers.positions_x_length
    )
    this.positions_y = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.positions_y_ptr,
      this.pointers.positions_y_length
    )
    this.positions_z = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.positions_z_ptr,
      this.pointers.positions_z_length
    )

    this.colors_r = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.colors_r_ptr,
      this.pointers.colors_r_length
    )
    this.colors_g = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.colors_g_ptr,
      this.pointers.colors_g_length
    )
    this.colors_b = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.colors_b_ptr,
      this.pointers.colors_b_length
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

    this.visibilityMask = new BigUint64Array(
      this.wasmMemory.buffer,
      this.pointers.visibility_ptr,
      this.pointers.visibility_length
    )
  }

  get count(): number {
    return this.pointers.count
  }

  // Phase 5: Bitpacked visibility utilities for JavaScript
  // Check if a specific star is visible (star_index in 0..count)
  isStarVisible(starIndex: number): boolean {
    const wordIndex = Math.floor(starIndex / 64)
    const bitIndex = starIndex % 64
    
    if (wordIndex >= this.visibilityMask.length) {
      return false
    }
    
    const word = this.visibilityMask[wordIndex]
    return (word & (1n << BigInt(bitIndex))) !== 0n
  }

  // Set visibility for a specific star
  setStarVisible(starIndex: number, visible: boolean): void {
    const wordIndex = Math.floor(starIndex / 64)
    const bitIndex = starIndex % 64
    
    if (wordIndex >= this.visibilityMask.length) {
      return
    }
    
    const mask = 1n << BigInt(bitIndex)
    if (visible) {
      this.visibilityMask[wordIndex] |= mask
    } else {
      this.visibilityMask[wordIndex] &= ~mask
    }
  }

  // Count total visible stars using efficient bit counting
  countVisibleStars(): number {
    let visibleCount = 0
    const completeWords = Math.floor(this.count / 64)
    
    // Count bits in complete u64 words
    for (let i = 0; i < completeWords; i++) {
      // Use built-in bit counting (fast on modern browsers)
      const word = this.visibilityMask[i]
      visibleCount += this.popCount64(word)
    }
    
    // Handle remaining bits in the last partial word
    const remainingBits = this.count % 64
    if (remainingBits > 0 && completeWords < this.visibilityMask.length) {
      const mask = (1n << BigInt(remainingBits)) - 1n
      const maskedWord = this.visibilityMask[completeWords] & mask
      visibleCount += this.popCount64(maskedWord)
    }
    
    return visibleCount
  }

  // Efficient 64-bit population count (count set bits)
  private popCount64(n: bigint): number {
    let count = 0
    while (n !== 0n) {
      count++
      n &= n - 1n // Clear the lowest set bit
    }
    return count
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
