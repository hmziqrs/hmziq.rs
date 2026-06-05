import type { WASMModule } from './core'

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
}

export interface FrameUpdateResult {
  visible_count: number
  positions_dirty: boolean
  effects_dirty: boolean
  culling_dirty: boolean
}

export class StarFieldSharedMemory {
  private wasmMemory: WebAssembly.Memory
  private pointers: StarMemoryPointers
  private wasmModule: WASMModule
  private cameraMatrixPtr: number

  public positions_x: Float32Array | null
  public positions_y: Float32Array | null
  public positions_z: Float32Array | null
  public colors_r: Float32Array | null
  public colors_g: Float32Array | null
  public colors_b: Float32Array | null

  public sizes: Float32Array | null
  public twinkles: Float32Array | null
  public sparkles: Float32Array | null

  constructor(wasmModule: WASMModule, starCount: number) {
    this.wasmModule = wasmModule
    this.wasmMemory = wasmModule.memory
    this.pointers = wasmModule.initialize_star_memory_pool(starCount)
    this.cameraMatrixPtr = 0

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
  }

  get count(): number {
    return this.pointers.count
  }

  dispose(): void {
    this.positions_x = null
    this.positions_y = null
    this.positions_z = null
    this.colors_r = null
    this.colors_g = null
    this.colors_b = null
    this.sizes = null
    this.twinkles = null
    this.sparkles = null
    this.wasmModule.destroy_star_memory_pool()
  }

  updateFrame(
    wasmModule: WASMModule,
    time: number,
    deltaTime: number,
    cameraMatrix: Float32Array | null,
    isMoving: boolean,
    clickTime: number,
    currentSpeedMultiplier: number
  ): FrameUpdateResult {
    let cameraPtr = 0
    if (cameraMatrix) {
      // Allocate WASM buffer for camera matrix on first use
      if (this.cameraMatrixPtr === 0) {
        const matrixVec = new Float32Array(16)
        // Allocate in WASM memory by creating a view
        const wasmBuf = new Float32Array(wasmModule.memory.buffer)
        // Find space after the last known allocation
        const lastPtr = Math.max(
          this.pointers.sparkles_ptr + this.pointers.sparkles_length * 4,
          this.pointers.visibility_ptr + this.pointers.visibility_length * 8
        )
        this.cameraMatrixPtr = lastPtr + 16 // align to 64 bytes
      }
      // Copy camera matrix into WASM memory
      const dest = new Float32Array(wasmModule.memory.buffer, this.cameraMatrixPtr, 16)
      dest.set(cameraMatrix)
      cameraPtr = this.cameraMatrixPtr
    }

    const result = wasmModule.update_frame_simd(
      time,
      deltaTime,
      cameraPtr,
      isMoving,
      clickTime,
      currentSpeedMultiplier
    )

    return result
  }
}