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

export interface FrameUpdateResult {
  visible_count: number
  positions_dirty: boolean
  effects_dirty: boolean
  culling_dirty: boolean
}

export class StarFieldSharedMemory {
  private wasmMemory: WebAssembly.Memory
  private pointers: StarMemoryPointers

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

  isStarVisible(starIndex: number): boolean {
    const wordIndex = Math.floor(starIndex / 64)
    const bitIndex = starIndex % 64
    
    if (wordIndex >= this.visibilityMask.length) {
      return false
    }
    
    const word = this.visibilityMask[wordIndex]
    return (word & (1n << BigInt(bitIndex))) !== 0n
  }

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

  countVisibleStars(): number {
    let visibleCount = 0
    const completeWords = Math.floor(this.count / 64)

    for (let i = 0; i < completeWords; i++) {
      const word = this.visibilityMask[i]
      visibleCount += this.popCount64(word)
    }

    const remainingBits = this.count % 64
    if (remainingBits > 0 && completeWords < this.visibilityMask.length) {
      const mask = (1n << BigInt(remainingBits)) - 1n
      const maskedWord = this.visibilityMask[completeWords] & mask
      visibleCount += this.popCount64(maskedWord)
    }
    
    return visibleCount
  }

  private popCount64(n: bigint): number {
    let count = 0
    while (n !== 0n) {
      count++
      n &= n - 1n // Clear the lowest set bit
    }
    return count
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
    // TODO: Implement proper camera matrix handling in WASM
    const cameraPtr = 0

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

export type { WASMModule } from './core'