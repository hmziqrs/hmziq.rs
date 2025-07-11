// Legacy WASM interfaces - moved from active codebase
// These interfaces are preserved for reference but not used in active code

// Bezier function interfaces - used only in legacy meteor system
export interface BezierWASMInterface {
  precalculate_bezier_path: (start_x: number, start_y: number, control_x: number, control_y: number, end_x: number, end_y: number, segments: number) => Float32Array;
  precalculate_bezier_paths_batch: (paths_data: Float32Array, segments: number) => Float32Array;
  interpolate_bezier_point: (points: Float32Array, t: number) => Float32Array;
  precalculate_cubic_bezier_path: (p0x: number, p0y: number, p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number, segments: number) => Float32Array;
  calculate_bezier_length: (points: Float32Array) => number;
  precalculate_bezier_path_uniform: (start_x: number, start_y: number, control_x: number, control_y: number, end_x: number, end_y: number, segments: number) => Float32Array;
}

// Memory management interfaces - not used in active codebase
export interface SharedBuffer {
  new (size: number): SharedBuffer;
  from_data(data: Float32Array): SharedBuffer;
  size: number;
  ptr: number;
  ptr_mut(): number;
  write(data: Float32Array, offset: number): void;
  read(): Float32Array;
  read_slice(start: number, length: number): Float32Array;
  apply_sin(): void;
  apply_cos(): void;
  apply_operation(op: string): void;
  free(): void;
}

export interface DirectMemory {
  allocate_f32_array(size: number): number;
  free_f32_array(ptr: number, size: number): void;
  copy_from_js(ptr: number, data: Float32Array): void;
  copy_to_js(ptr: number, size: number): Float32Array;
}

export interface MemoryPool {
  new (buffer_size: number, pool_size: number): MemoryPool;
  acquire(): number | undefined;
  release(index: number): void;
  write_to_buffer(index: number, data: Float32Array, offset: number): boolean;
  read_from_buffer(index: number): Float32Array;
  apply_operation_to_buffer(index: number, operation: string): boolean;
  free(): void;
}

// Spatial indexing interfaces - used only in legacy nebula
export interface SpatialGrid {
  new (cell_size: number, canvas_width: number, canvas_height: number): SpatialGrid;
  clear(): void;
  add_object(id: number, x: number, y: number, radius: number, is_visible: boolean): void;
  update_positions(positions: Float32Array, radii: Float32Array, visibilities: Uint8Array): void;
  find_overlaps(overlap_factor: number): Float32Array;
  get_stats(): Float32Array;
  get_cell_occupancy(): Float32Array;
  free?(): void;
}

// Particle system interfaces - used only in legacy nebula
export interface ParticlePool {
  new (): ParticlePool;
  allocate_block(count: number, system_id: number): number[] | undefined;
  allocate(system_id: number): number | undefined;
  free_block(indices: number[]): void;
  free(index: number): void;
  free_system(system_id: number): void;
  get_free_count(): number;
  get_allocated_count(): number;
  get_total_capacity(): number;
  is_allocated_to(index: number, system_id: number): boolean;
}

export interface NebulaSystem {
  new (canvas_width: number, canvas_height: number): NebulaSystem;
  update_canvas_size(width: number, height: number): void;
  init_particles(pool: ParticlePool, count: number): boolean;
  update(delta_time: number, pool: ParticlePool): void;
  get_render_data(): Float32Array;
  get_color_data(): Float32Array;
  find_overlaps(overlap_threshold: number): Float32Array;
  release(pool: ParticlePool): void;
  get_active_count(): number;
}

// Physics utilities interfaces - used only in legacy meteor system
export interface PhysicsUtils {
  apply_gravity: (velocity_y: number, gravity: number, delta_time: number) => number;
  apply_drag: (velocity_x: number, velocity_y: number, drag_coefficient: number, delta_time: number) => Float32Array;
  update_position: (position_x: number, position_y: number, velocity_x: number, velocity_y: number, delta_time: number) => Float32Array;
  calculate_fade: (life: number, max_life: number, fade_start: number) => number;
}

export interface Force {
  new (x: number, y: number): Force;
  x: number;
  y: number;
  apply_to_velocity: (velocity_x: number, velocity_y: number, delta_time: number) => Float32Array;
  combine_with: (other: Force) => Force;
  scale: (factor: number) => Force;
  normalize: () => Force;
  magnitude: () => number;
}

export interface FastRandom {
  new (seed: number): FastRandom;
  next: () => number;
  next_range: (min: number, max: number) => number;
  next_bool: () => boolean;
  next_vec2: () => Float32Array;
  next_color: () => Float32Array;
  reset: (seed: number) => void;
}

// Batch transfer interfaces - not used anywhere
export interface BatchTransfer {
  transfer_particle_data: (positions: Float32Array, velocities: Float32Array, colors: Float32Array, life_values: Float32Array) => Float32Array;
  transfer_meteor_data: (positions: Float32Array, velocities: Float32Array, colors: Float32Array, life_values: Float32Array, trail_data: Float32Array) => Float32Array;
  transfer_render_data_optimized: (data: Float32Array, offset: number, stride: number) => Float32Array;
}

export interface TypedBatchTransfer {
  transfer_f32_batch: (data: Float32Array) => Float32Array;
  transfer_u8_batch: (data: Uint8Array) => Uint8Array;
  transfer_u32_batch: (data: Uint32Array) => Uint32Array;
  transfer_mixed_batch: (f32_data: Float32Array, u8_data: Uint8Array, u32_data: Uint32Array) => Float32Array;
}

export interface ViewTransfer {
  new (size: number): ViewTransfer;
  write_f32: (data: Float32Array, offset: number) => void;
  write_u8: (data: Uint8Array, offset: number) => void;
  write_u32: (data: Uint32Array, offset: number) => void;
  read_f32: (offset: number, length: number) => Float32Array;
  read_u8: (offset: number, length: number) => Uint8Array;
  read_u32: (offset: number, length: number) => Uint32Array;
  clear: () => void;
  free: () => void;
}

// Vec2 utility interface
export interface Vec2 {
  new (x: number, y: number): Vec2;
  x: number;
  y: number;
}

// LOD and Quality functions - no longer used since StarField was simplified to ultra-only
export interface LODWASMInterface {
  // Enhanced SIMD batch processing for LOD groups
  calculate_star_effects_by_lod: (near_positions: Float32Array, near_count: number, medium_positions: Float32Array, medium_count: number, far_positions: Float32Array, far_count: number, time: number, quality_tier: number) => Float32Array;
  // LOD distribution calculations
  calculate_lod_distribution: (total_count: number, quality_tier: number) => Uint32Array;
  // Temporal coherence optimization
  get_stars_needing_update: (positions: Float32Array, previous_twinkles: Float32Array, previous_sparkles: Float32Array, count: number, time: number, threshold: number) => Uint32Array;
  calculate_star_effects_temporal_simd?: (positions: Float32Array, previous_twinkles: Float32Array, previous_sparkles: Float32Array, count: number, time: number, threshold: number) => Float32Array;
}

// Performance monitoring functions - moved to legacy with performance monitor
export interface PerformanceWASMInterface {
  // Frame rate calculation
  calculate_fps: (frame_count: number, current_time: number, last_time: number) => Float32Array;
}

// Individual star effect functions - replaced by batch array processing
export interface IndividualStarEffectsInterface {
  calculate_star_effects: (positions_ptr: number, count: number, time: number) => Float32Array;
  calculate_star_effects_into_buffers: (positions_ptr: number, twinkles_ptr: number, sparkles_ptr: number, count: number, time: number) => void;
  calculate_twinkle_effects: (positions_ptr: number, count: number, time: number) => Float32Array;
  calculate_sparkle_effects: (positions_ptr: number, count: number, time: number) => Float32Array;
}

// Memory batch processing functions - not used anywhere
export interface MemoryBatchInterface {
  batch_process_sin: (input: Float32Array) => Float32Array;
  batch_process_cos: (input: Float32Array) => Float32Array;
  batch_process_with_operation: (input: Float32Array, operation: string) => Float32Array;
}

// Unified legacy WASM interface combining all unused functions
export interface LegacyWASMInterface extends 
  BezierWASMInterface,
  LODWASMInterface,
  PerformanceWASMInterface,
  IndividualStarEffectsInterface,
  MemoryBatchInterface {
  
  // Memory management
  SharedBuffer: any;
  DirectMemory: any;
  MemoryPool: any;
  
  // Spatial indexing system
  SpatialGrid: any;
  
  // Particle pool and utilities
  ParticlePool: any;
  PhysicsUtils: any;
  Force: any;
  FastRandom: any;
  BatchTransfer: any;
  TypedBatchTransfer: any;
  ViewTransfer: any;
  NebulaSystem: any;
  
  // Memory exports
  __wbindgen_export_0?: WebAssembly.Memory;
  __wbg_memory?: WebAssembly.Memory;
  memory?: WebAssembly.Memory;
}