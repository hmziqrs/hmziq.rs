// ScatterText WASM memory management

import type { WASMModule } from './core'

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

// Scatter text shared memory wrapper
export class ScatterTextSharedMemory {
  private static instance: ScatterTextSharedMemory | null = null
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

  private constructor(wasmModule: WASMModule, maxParticles: number) {
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
    this.opacity = new Float32Array(this.wasmMemory.buffer, this.pointers.opacity_ptr, alignedCount)
    this.scattered_flags = new BigUint64Array(
      this.wasmMemory.buffer,
      this.pointers.scattered_flags_ptr,
      flagCount
    )
  }

  get particleCount(): number {
    return this.pointers.particle_count
  }

  // Get singleton instance
  static getInstance(): ScatterTextSharedMemory {
    return ScatterTextSharedMemory.instance!
  }

  static setInstance(wasmModule: WASMModule, maxParticles: number): void {
    ScatterTextSharedMemory.instance = new ScatterTextSharedMemory(wasmModule, maxParticles)
  }

  // Reset singleton instance (useful for cleanup or testing)
  static resetInstance(): void {
    ScatterTextSharedMemory.instance = null
  }

  // Update particles using WASM
  updateFrame(wasmModule: WASMModule, deltaTime: number): void {
    wasmModule.update_particles(deltaTime)
    // Arrays auto-updated (shared memory)
  }
}

// Re-export WASMModule type that ScatterText components need
export type { WASMModule } from './core'
