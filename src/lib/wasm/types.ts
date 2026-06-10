/**
 * Shared pointer fields common to both StarMemoryPointers and ScatterTextPointers.
 * Every WASM memory layout that represents positioned, colored particles
 * exposes at least these five pointer slots.
 */
export interface PointerBase {
  positions_x_ptr: number
  positions_y_ptr: number
  colors_r_ptr: number
  colors_g_ptr: number
  colors_b_ptr: number
}
