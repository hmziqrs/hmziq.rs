import type { WASMModule } from './core'
import type { PointerBase } from './types'

export interface StarMemoryPointers extends PointerBase {
  positions_z_ptr: number
  sizes_ptr: number
  count: number
  positions_x_length: number
  positions_y_length: number
  positions_z_length: number
  colors_r_length: number
  colors_g_length: number
  colors_b_length: number
  sizes_length: number
}

// Buffer views exposed for binding to the Three.js geometry. Names match the
// `<attr>_ptr` / `<attr>_length` pairs returned by the WASM pool.
const VIEW_KEYS = [
  'positions_x',
  'positions_y',
  'positions_z',
  'colors_r',
  'colors_g',
  'colors_b',
  'sizes',
] as const

/**
 * Thin holder over the WASM-owned star buffers. Stars are generated once on
 * construction; positions/colors/sizes are static afterwards, so there is no
 * per-frame interaction with WASM — the geometry is bound a single time.
 */
export class StarFieldSharedMemory {
  private wasmMemory: WebAssembly.Memory
  private pointers: StarMemoryPointers
  private wasmModule: WASMModule

  public positions_x: Float32Array | null = null
  public positions_y: Float32Array | null = null
  public positions_z: Float32Array | null = null
  public colors_r: Float32Array | null = null
  public colors_g: Float32Array | null = null
  public colors_b: Float32Array | null = null
  public sizes: Float32Array | null = null

  constructor(wasmModule: WASMModule, starCount: number) {
    this.wasmModule = wasmModule
    this.wasmMemory = wasmModule.memory
    this.pointers = wasmModule.initialize_star_memory_pool(starCount)
    this.refreshViews()
  }

  private refreshViews(): void {
    for (const key of VIEW_KEYS) {
      this[key] = new Float32Array(
        this.wasmMemory.buffer,
        this.pointers[`${key}_ptr`],
        this.pointers[`${key}_length`]
      )
    }
  }

  /**
   * Re-create the typed-array views if WASM linear memory was detached (grown).
   * Returns true when views were rebuilt so the caller can re-bind geometry.
   */
  refreshViewsIfNeeded(): boolean {
    if (this.positions_x?.buffer === this.wasmMemory.buffer) {
      return false
    }
    this.refreshViews()
    return true
  }

  get count(): number {
    return this.pointers.count
  }

  dispose(): void {
    for (const key of VIEW_KEYS) {
      this[key] = null
    }
    this.wasmModule.destroy_star_memory_pool()
  }
}
