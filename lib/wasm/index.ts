// WASM SIMD loader

let wasmModule: WASMModule | null = null
let loadPromise: Promise<WASMModule> | null = null

// SoA memory pointers
export interface StarMemoryPointers {
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

export interface ScatterTextPointers {
  positions_x_ptr: number
  positions_y_ptr: number
  target_x_ptr: number
  target_y_ptr: number
  scatter_vx_ptr: number
  scatter_vy_ptr: number
  colors_r_ptr: number
  colors_g_ptr: number
  colors_b_ptr: number
  opacity_ptr: number
  scattered_flags_ptr: number
  particle_count: number
}

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
  
  // Skill system functions
  initialize_skill_system: (count: number, particle_count: number, connection_count: number) => any
  update_skill_system: (time: number, delta_time: number, mouse_x: number, mouse_y: number) => any
  set_skill_hover_state: (skill_index: number, is_hovered: boolean) => void
  get_skill_hover_state: (skill_index: number) => boolean
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
        
        // Skill system functions
        initialize_skill_system: wasmImport.initialize_skill_system,
        update_skill_system: wasmImport.update_skill_system,
        set_skill_hover_state: wasmImport.set_skill_hover_state,
        get_skill_hover_state: wasmImport.get_skill_hover_state,
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

// Shared memory wrapper
export class StarFieldSharedMemory {
  private wasmMemory: WebAssembly.Memory
  private pointers: StarMemoryPointers

  // SoA arrays
  public positions_x: Float32Array
  public positions_y: Float32Array
  public positions_z: Float32Array
  public colors_r: Float32Array
  public colors_g: Float32Array
  public colors_b: Float32Array

  public sizes: Float32Array
  public twinkles: Float32Array
  public sparkles: Float32Array
  public visibilityMask: BigUint64Array

  constructor(wasmModule: WASMModule, starCount: number) {
    this.wasmMemory = wasmModule.memory
    this.pointers = wasmModule.initialize_star_memory_pool(starCount)

    // Direct WASM memory views
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

  // Bitpacked visibility utils
  // Check star visibility
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

  // Count visible stars
  countVisibleStars(): number {
    let visibleCount = 0
    const completeWords = Math.floor(this.count / 64)
    
    // Count complete u64 words
    for (let i = 0; i < completeWords; i++) {
      // Use built-in bit counting
      const word = this.visibilityMask[i]
      visibleCount += this.popCount64(word)
    }
    
    // Handle remaining bits
    const remainingBits = this.count % 64
    if (remainingBits > 0 && completeWords < this.visibilityMask.length) {
      const mask = (1n << BigInt(remainingBits)) - 1n
      const maskedWord = this.visibilityMask[completeWords] & mask
      visibleCount += this.popCount64(maskedWord)
    }
    
    return visibleCount
  }

  // 64-bit population count
  private popCount64(n: bigint): number {
    let count = 0
    while (n !== 0n) {
      count++
      n &= n - 1n // Clear the lowest set bit
    }
    return count
  }

  // Frame update
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

    // WASM computation, shared memory
    const result = wasmModule.update_frame_simd(
      time,
      deltaTime,
      cameraPtr,
      isMoving,
      clickTime,
      currentSpeedMultiplier
    )

    // Arrays auto-updated (shared memory)
    return result
  }
}

// Scatter text shared memory wrapper
export class ScatterTextSharedMemory {
  private wasmMemory: WebAssembly.Memory
  private pointers: ScatterTextPointers

  // SoA arrays for particles
  public positions_x: Float32Array
  public positions_y: Float32Array
  public target_x: Float32Array
  public target_y: Float32Array
  public scatter_vx: Float32Array
  public scatter_vy: Float32Array
  public colors_r: Float32Array
  public colors_g: Float32Array
  public colors_b: Float32Array
  public opacity: Float32Array
  public scattered_flags: BigUint64Array

  constructor(wasmModule: WASMModule, maxParticles: number) {
    this.wasmMemory = wasmModule.memory
    this.pointers = wasmModule.initialize_scatter_text(maxParticles)

    // Calculate aligned sizes
    const SIMD_BATCH_SIZE = 16
    const alignedCount = Math.ceil(maxParticles / SIMD_BATCH_SIZE) * SIMD_BATCH_SIZE
    const flagCount = Math.ceil(alignedCount / 64)

    // Direct WASM memory views
    this.positions_x = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.positions_x_ptr,
      alignedCount
    )
    this.positions_y = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.positions_y_ptr,
      alignedCount
    )
    this.target_x = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.target_x_ptr,
      alignedCount
    )
    this.target_y = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.target_y_ptr,
      alignedCount
    )
    this.scatter_vx = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.scatter_vx_ptr,
      alignedCount
    )
    this.scatter_vy = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.scatter_vy_ptr,
      alignedCount
    )
    this.colors_r = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.colors_r_ptr,
      alignedCount
    )
    this.colors_g = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.colors_g_ptr,
      alignedCount
    )
    this.colors_b = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.colors_b_ptr,
      alignedCount
    )
    this.opacity = new Float32Array(
      this.wasmMemory.buffer,
      this.pointers.opacity_ptr,
      alignedCount
    )
    this.scattered_flags = new BigUint64Array(
      this.wasmMemory.buffer,
      this.pointers.scattered_flags_ptr,
      flagCount
    )
  }

  get particleCount(): number {
    return this.pointers.particle_count
  }

  // Helper to create text pixel data from canvas
  generateTextPixels(
    text: string,
    fontSize: number = 100,
    fontFamily: string = 'Arial',
    color: string = 'white'
  ): { 
    pixelData: Uint8Array, 
    width: number, 
    height: number 
  } {
    // Create offscreen canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    // Set canvas size
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    
    // Configure text rendering
    ctx.font = `bold ${fontSize}px ${fontFamily}`
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw text in the center
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    return {
      pixelData: new Uint8Array(imageData.data),
      width: canvas.width,
      height: canvas.height
    }
  }

  // Update particles using WASM
  updateFrame(wasmModule: WASMModule, deltaTime: number): void {
    wasmModule.update_particles(deltaTime)
    // Arrays auto-updated (shared memory)
  }
}
