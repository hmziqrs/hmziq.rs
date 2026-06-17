import type { WASMModule } from './core'
import type { PointerBase } from './types'

export interface ScatterTextPointers extends PointerBase {
  target_x_ptr: number
  target_y_ptr: number
  scatter_vx_ptr: number
  scatter_vy_ptr: number
  opacity_ptr: number
  scattered_flags_ptr: number
  particle_count: number
}

// All eight attributes exposed to Three.js.
const SCATTER_VIEW_KEYS = [
  'positions_x',
  'positions_y',
  'target_x',
  'target_y',
  'colors_r',
  'colors_g',
  'colors_b',
  'opacity',
] as const

// Subset that WASM mutates every frame (update_particles / snapToFinalPositions).
// These are re-copied into the owned bound buffers after each WASM write; the
// remaining keys are seeded once at construction and are effectively read-only.
const DYNAMIC_KEYS = ['positions_x', 'positions_y', 'opacity'] as const

export type ScatterViewKey = (typeof SCATTER_VIEW_KEYS)[number]

export class ScatterTextSharedMemory {
  private static instance: ScatterTextSharedMemory | null = null
  private wasmMemory: WebAssembly.Memory
  private pointers: ScatterTextPointers
  private alignedCount: number

  // WASM-backed source views: the live linear-memory windows Rust writes into.
  // These may detach when memory grows; the bound copies below never do.
  private sourceViews: Record<ScatterViewKey, Float32Array>

  // Independent, non-WASM Float32Array copies handed to Three.js. Because their
  // ArrayBuffers are not aliased by WebAssembly.Memory, an implicit memory.grow
  // (which detaches the WASM buffer) cannot invalidate a buffer that
  // WebGLAttributes has cached by object identity — the size-mismatch throw at
  // WebGLAttributes.js:212 is unreachable for these.
  public positions_x!: Float32Array
  public positions_y!: Float32Array
  public target_x!: Float32Array
  public target_y!: Float32Array
  public colors_r!: Float32Array
  public colors_g!: Float32Array
  public colors_b!: Float32Array
  public opacity!: Float32Array

  private constructor(wasmModule: WASMModule, pointers: ScatterTextPointers) {
    this.wasmMemory = wasmModule.memory
    this.pointers = pointers

    const SIMD_BATCH_SIZE = 16
    this.alignedCount = Math.ceil(pointers.particle_count / SIMD_BATCH_SIZE) * SIMD_BATCH_SIZE

    this.sourceViews = this.buildSourceViews()
    // Allocate independent copies and seed them once. Their byteLength is now
    // fixed for the lifetime of this instance.
    this.positions_x = this.sourceViews.positions_x.slice()
    this.positions_y = this.sourceViews.positions_y.slice()
    this.target_x = this.sourceViews.target_x.slice()
    this.target_y = this.sourceViews.target_y.slice()
    this.colors_r = this.sourceViews.colors_r.slice()
    this.colors_g = this.sourceViews.colors_g.slice()
    this.colors_b = this.sourceViews.colors_b.slice()
    this.opacity = this.sourceViews.opacity.slice()
  }

  private buildSourceViews(): Record<ScatterViewKey, Float32Array> {
    const views = {} as Record<ScatterViewKey, Float32Array>
    for (const key of SCATTER_VIEW_KEYS) {
      views[key] = new Float32Array(
        this.wasmMemory.buffer,
        this.pointers[`${key}_ptr`],
        this.alignedCount
      )
    }
    return views
  }

  /**
   * Rebuild the WASM-backed source views if linear memory grew (which detaches
   * the previous ArrayBuffer). Bound copies are untouched — their byteLength is
   * fixed, so growth never produces a size-mismatched cached WebGLAttributes
   * entry. Returns true when the source views were rebuilt.
   */
  private refreshSourceViewsIfNeeded(): boolean {
    if (this.sourceViews.positions_x.buffer === this.wasmMemory.buffer) {
      return false
    }
    this.sourceViews = this.buildSourceViews()
    return true
  }

  /**
   * Copy WASM-mutated attributes into the owned bound buffers. Runs after any
   * WASM write (update_particles / snapToFinalPositions) and after a source-view
   * rebuild, before Three.js renders. The bound buffer's length is unchanged, so
   * WebGLAttributes.update takes the updateBuffer path instead of throwing.
   */
  syncBoundBuffers(): void {
    this.refreshSourceViewsIfNeeded()
    for (const key of DYNAMIC_KEYS) {
      this[key].set(this.sourceViews[key])
    }
  }

  get particleCount(): number {
    return this.pointers.particle_count
  }

  static getInstance(): ScatterTextSharedMemory {
    if (!ScatterTextSharedMemory.instance) {
      throw new Error('ScatterTextSharedMemory not initialized. Call setInstance() first.')
    }
    return ScatterTextSharedMemory.instance
  }

  static setInstance(wasmModule: WASMModule): void {
    const pointers = wasmModule.get_scatter_text_pointers()
    ScatterTextSharedMemory.instance = new ScatterTextSharedMemory(wasmModule, pointers)
  }

  static resetInstance(): void {
    ScatterTextSharedMemory.instance = null
  }

  updateFrame(wasmModule: WASMModule, deltaTime: number): void {
    wasmModule.update_particles(deltaTime)
  }

  snapToFinalPositions(): void {
    this.refreshSourceViewsIfNeeded()
    this.sourceViews.positions_x.set(this.sourceViews.target_x)
    this.sourceViews.positions_y.set(this.sourceViews.target_y)
    this.sourceViews.opacity.fill(1.0)
    this.syncBoundBuffers()
  }
}
