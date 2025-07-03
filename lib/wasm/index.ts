// WASM module loader with graceful fallback
import { DebugConfigManager } from '@/lib/performance/debug-config'

let wasmModule: any = null;
let loadPromise: Promise<void> | null = null;
let isUsingFallback = false;

export interface WASMModule {
  add: (a: number, b: number) => number;
  greet: (name: string) => string;
  // Star field functions
  generate_star_positions: (count: number, start_index: number, min_radius: number, max_radius: number) => Float32Array;
  generate_star_colors: (count: number, start_index: number) => Float32Array;
  generate_star_sizes: (count: number, start_index: number, size_multiplier: number) => Float32Array;
  calculate_star_effects: (positions_ptr: number, count: number, time: number) => Float32Array;
  calculate_star_effects_into_buffers: (positions_ptr: number, twinkles_ptr: number, sparkles_ptr: number, count: number, time: number) => void;
  calculate_star_effects_arrays: (positions: Float32Array, count: number, time: number) => Float32Array;
  calculate_twinkle_effects: (positions_ptr: number, count: number, time: number) => Float32Array;
  calculate_sparkle_effects: (positions_ptr: number, count: number, time: number) => Float32Array;
  calculate_rotation_delta: (base_speed_x: number, base_speed_y: number, speed_multiplier: number, delta_time: number) => Float32Array;
  calculate_speed_multiplier: (is_moving: boolean, click_time: number, current_time: number, current_multiplier: number) => number;
  // Camera frustum culling
  cull_stars_by_frustum: (positions: Float32Array, count: number, camera_matrix: Float32Array, fov: number, aspect_ratio: number, near: number, far: number) => Uint8Array;
  get_visible_star_indices: (positions: Float32Array, count: number, camera_matrix: Float32Array, margin: number) => Uint32Array;
  cull_stars_by_frustum_simd?: (positions: Float32Array, count: number, camera_matrix: Float32Array, margin: number) => Uint8Array;
  // Enhanced SIMD batch processing for LOD groups
  calculate_star_effects_by_lod: (near_positions: Float32Array, near_count: number, medium_positions: Float32Array, medium_count: number, far_positions: Float32Array, far_count: number, time: number, quality_tier: number) => Float32Array;
  // Temporal coherence optimization
  calculate_star_effects_with_temporal_coherence: (positions: Float32Array, previous_twinkles: Float32Array, previous_sparkles: Float32Array, count: number, time: number, threshold: number) => Float32Array;
  get_stars_needing_update: (positions: Float32Array, previous_twinkles: Float32Array, previous_sparkles: Float32Array, count: number, time: number, threshold: number) => Uint32Array;
  calculate_star_effects_temporal_simd?: (positions: Float32Array, previous_twinkles: Float32Array, previous_sparkles: Float32Array, count: number, time: number, threshold: number) => Float32Array;
  // LOD distribution calculations
  calculate_lod_distribution: (total_count: number, quality_tier: number) => Uint32Array;
  // Frame rate calculation
  calculate_fps: (frame_count: number, current_time: number, last_time: number) => Float32Array;
  // Math utilities
  fast_sin: (x: number) => number;
  fast_cos: (x: number) => number;
  fast_sin_batch: (values: Float32Array) => Float32Array;
  fast_cos_batch: (values: Float32Array) => Float32Array;
  seed_random: (i: number) => number;
  seed_random_batch: (start: number, count: number) => Float32Array;
  // Bezier functions
  precalculate_bezier_path: (start_x: number, start_y: number, control_x: number, control_y: number, end_x: number, end_y: number, segments: number) => Float32Array;
  precalculate_bezier_paths_batch: (paths_data: Float32Array, segments: number) => Float32Array;
  interpolate_bezier_point: (points: Float32Array, t: number) => Float32Array;
  precalculate_cubic_bezier_path: (p0x: number, p0y: number, p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number, segments: number) => Float32Array;
  calculate_bezier_length: (points: Float32Array) => number;
  // Memory management
  SharedBuffer: any; // Constructor type
  DirectMemory: any; // Static methods type
  MemoryPool: any; // Constructor type
  batch_process_sin: (input: Float32Array) => Float32Array;
  batch_process_cos: (input: Float32Array) => Float32Array;
  batch_process_with_operation: (input: Float32Array, operation: string) => Float32Array;
  // Meteor particle system
  MeteorSystem: any; // Constructor type
  Vec2: any; // Constructor type
  batch_interpolate_meteor_positions: (life_values: Float32Array, max_life_values: Float32Array, path_data: Float32Array, path_stride: number) => Float32Array;
  // Spatial indexing system
  SpatialGrid: any; // Constructor type
  // Particle pool and utilities
  ParticlePool: any; // Constructor type
  PhysicsUtils: any; // Static methods type
  Force: any; // Constructor type
  FastRandom: any; // Constructor type
  BatchTransfer: any; // Static methods type
  TypedBatchTransfer: any; // Static methods type
  ViewTransfer: any; // Constructor type
  NebulaSystem: any; // Constructor type
}

// Memory management classes interfaces
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

export interface Vec2 {
  new (x: number, y: number): Vec2;
  x: number;
  y: number;
}

export interface MeteorSystem {
  new (canvas_width: number, canvas_height: number): MeteorSystem;
  update_canvas_size(width: number, height: number): void;
  init_meteor(
    index: number,
    start_x: number,
    start_y: number,
    control_x: number,
    control_y: number,
    end_x: number,
    end_y: number,
    size: number,
    speed: number,
    max_life: number,
    meteor_type: number,
    color_r: number,
    color_g: number,
    color_b: number,
    glow_r: number,
    glow_g: number,
    glow_b: number,
    glow_intensity: number,
  ): void;
  update_meteors(speed_multiplier: number, quality_tier: number): number;
  update_particles(speed_multiplier: number): void;
  spawn_particle(meteor_index: number, spawn_rate: number, max_particles: number): boolean;
  get_meteor_positions(): Float32Array;
  get_meteor_properties(): Float32Array;
  get_particle_data(): Float32Array;
  get_particle_colors(): Uint8Array;
  get_active_meteor_count(): number;
  get_active_particle_count(): number;
  free(): void;
}

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

export async function loadWASM(): Promise<WASMModule | null> {
  // Return cached module if already loaded
  if (wasmModule) {
    return wasmModule;
  }

  // Return existing load promise if loading is in progress
  if (loadPromise) {
    await loadPromise;
    return wasmModule;
  }

  // Start loading process
  loadPromise = (async () => {
    try {
      // Dynamic import to avoid build-time errors
      const wasmPath = '/wasm/pkg/hmziq_wasm_bg.wasm';
      const wasm = await import(
        /* webpackIgnore: true */ '/wasm/pkg/hmziq_wasm.js'
      );
      
      // Initialize WASM module
      await wasm.default(wasmPath);
      
      // Store module functions
      wasmModule = {
        add: wasm.add,
        greet: wasm.greet,
        // Star field functions
        generate_star_positions: wasm.generate_star_positions,
        generate_star_colors: wasm.generate_star_colors,
        generate_star_sizes: wasm.generate_star_sizes,
        calculate_star_effects: wasm.calculate_star_effects,
        calculate_star_effects_into_buffers: wasm.calculate_star_effects_into_buffers,
        calculate_star_effects_arrays: wasm.calculate_star_effects_arrays,
        calculate_twinkle_effects: wasm.calculate_twinkle_effects,
        calculate_sparkle_effects: wasm.calculate_sparkle_effects,
        calculate_rotation_delta: wasm.calculate_rotation_delta,
        calculate_speed_multiplier: wasm.calculate_speed_multiplier,
        // Camera frustum culling
        cull_stars_by_frustum: wasm.cull_stars_by_frustum,
        get_visible_star_indices: wasm.get_visible_star_indices,
        cull_stars_by_frustum_simd: wasm.cull_stars_by_frustum_simd,
        // Enhanced SIMD batch processing for LOD groups
        calculate_star_effects_by_lod: wasm.calculate_star_effects_by_lod,
        // Temporal coherence optimization
        calculate_star_effects_with_temporal_coherence: wasm.calculate_star_effects_with_temporal_coherence,
        get_stars_needing_update: wasm.get_stars_needing_update,
        calculate_star_effects_temporal_simd: wasm.calculate_star_effects_temporal_simd,
        // LOD distribution calculations
        calculate_lod_distribution: wasm.calculate_lod_distribution,
        // Math utilities
        fast_sin: wasm.fast_sin,
        fast_cos: wasm.fast_cos,
        fast_sin_batch: wasm.fast_sin_batch,
        fast_cos_batch: wasm.fast_cos_batch,
        seed_random: wasm.seed_random,
        seed_random_batch: wasm.seed_random_batch,
        // Bezier functions
        precalculate_bezier_path: wasm.precalculate_bezier_path,
        precalculate_bezier_paths_batch: wasm.precalculate_bezier_paths_batch,
        interpolate_bezier_point: wasm.interpolate_bezier_point,
        precalculate_cubic_bezier_path: wasm.precalculate_cubic_bezier_path,
        calculate_bezier_length: wasm.calculate_bezier_length,
        // Memory management
        SharedBuffer: wasm.SharedBuffer,
        DirectMemory: wasm.DirectMemory,
        MemoryPool: wasm.MemoryPool,
        batch_process_sin: wasm.batch_process_sin,
        batch_process_cos: wasm.batch_process_cos,
        batch_process_with_operation: wasm.batch_process_with_operation,
        // Meteor particle system
        MeteorSystem: wasm.MeteorSystem,
        Vec2: wasm.Vec2,
        batch_interpolate_meteor_positions: wasm.batch_interpolate_meteor_positions,
        // Spatial indexing system
        SpatialGrid: wasm.SpatialGrid,
        // Particle pool and utilities
        ParticlePool: wasm.ParticlePool,
        PhysicsUtils: wasm.PhysicsUtils,
        Force: wasm.Force,
        FastRandom: wasm.FastRandom,
        BatchTransfer: wasm.BatchTransfer,
        TypedBatchTransfer: wasm.TypedBatchTransfer,
        ViewTransfer: wasm.ViewTransfer,
        NebulaSystem: wasm.NebulaSystem,
      };
      
      const debugConfig = DebugConfigManager.getInstance();
      if (debugConfig.isEnabled('enableConsoleLogs')) {
        console.log('WASM module loaded successfully with star field, meteor optimizations, and unified particle manager');
      }
    } catch (error) {
      isUsingFallback = true;
      const debugConfig = DebugConfigManager.getInstance();
      if (debugConfig.isEnabled('enableConsoleLogs')) {
        console.warn('Failed to load WASM module, falling back to JS:', error);
      }
      wasmModule = null;
    }
  })();

  await loadPromise;
  return wasmModule;
}

// Helper to log fallback usage
function logFallback(functionName: string, message?: string) {
  const debugConfig = DebugConfigManager.getInstance();
  if (debugConfig.isEnabled('enableConsoleLogs')) {
    console.log(`Using JS fallback for ${functionName}()${message ? `: ${message}` : ''}`);
  }
}

// JavaScript fallback implementations
export const jsFallbacks: WASMModule = {
  add: (a: number, b: number): number => {
    logFallback('add');
    return a + b;
  },
  greet: (name: string): string => {
    logFallback('greet');
    return `Hello from JS fallback, ${name}!`;
  },
  // Star field fallbacks (simplified versions)
  generate_star_positions: (count: number, start_index: number, min_radius: number, max_radius: number): Float32Array => {
    logFallback('generate_star_positions');
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const globalIndex = start_index + i;
      const seed = (x: number) => {
        const val = Math.sin(x * 12.9898 + 78.233) * 43758.5453;
        return val - Math.floor(val);
      };
      
      const radius = min_radius + seed(globalIndex) * (max_radius - min_radius);
      const theta = seed(globalIndex + 1000) * Math.PI * 2;
      const phi = Math.acos(2 * seed(globalIndex + 2000) - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    return positions;
  },
  generate_star_colors: (count: number, start_index: number): Float32Array => {
    logFallback('generate_star_colors');
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const globalIndex = start_index + i;
      const seed = (x: number) => {
        const val = Math.sin(x * 12.9898 + 78.233) * 43758.5453;
        return val - Math.floor(val);
      };
      const colorChoice = seed(globalIndex + 3000);
      
      let r, g, b;
      if (colorChoice < 0.5) {
        r = g = b = 1;
      } else if (colorChoice < 0.7) {
        r = 0.6; g = 0.8; b = 1;
      } else if (colorChoice < 0.85) {
        r = 1; g = 0.8; b = 0.4;
      } else {
        r = 0.8; g = 0.6; b = 1;
      }
      
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    return colors;
  },
  generate_star_sizes: (count: number, start_index: number, size_multiplier: number): Float32Array => {
    logFallback('generate_star_sizes');
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const globalIndex = start_index + i;
      const seed = (x: number) => {
        const val = Math.sin(x * 12.9898 + 78.233) * 43758.5453;
        return val - Math.floor(val);
      };
      const sizeRandom = seed(globalIndex + 4000);
      const baseSize = sizeRandom < 0.7 
        ? 1 + seed(globalIndex + 5000) * 1.5
        : 2.5 + seed(globalIndex + 6000) * 2;
      sizes[i] = baseSize * size_multiplier;
    }
    return sizes;
  },
  calculate_star_effects: (): Float32Array => {
    logFallback('calculate_star_effects', 'not implemented');
    return new Float32Array(0);
  },
  calculate_star_effects_into_buffers: (positions_ptr: number, twinkles_ptr: number, sparkles_ptr: number, count: number, time: number): void => {
    logFallback('calculate_star_effects_into_buffers', 'not implemented - using manual update');
    // This is a void function, so we don't need to return anything
    // In the actual component, we'll fall back to the manual calculation
  },
  calculate_star_effects_arrays: (positions: Float32Array, count: number, time: number): Float32Array => {
    logFallback('calculate_star_effects_arrays');
    const effects = new Float32Array(count * 2);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const x = positions[i3];
      const y = positions[i3 + 1];
      
      // Twinkle calculation
      const twinkleBase = Math.sin(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;
      
      // Sparkle calculation
      const sparklePhase = Math.sin(time * 15.0 + x * 20.0 + y * 30.0);
      const sparkle = sparklePhase > 0.98 ? (sparklePhase - 0.98) / 0.02 : 0;
      
      effects[i * 2] = twinkleBase + sparkle;
      effects[i * 2 + 1] = sparkle;
    }
    
    return effects;
  },
  calculate_twinkle_effects: (): Float32Array => {
    logFallback('calculate_twinkle_effects', 'not implemented');
    return new Float32Array(0);
  },
  calculate_sparkle_effects: (): Float32Array => {
    logFallback('calculate_sparkle_effects', 'not implemented');
    return new Float32Array(0);
  },
  calculate_rotation_delta: (base_speed_x: number, base_speed_y: number, speed_multiplier: number, delta_time: number): Float32Array => {
    return new Float32Array([
      base_speed_x * speed_multiplier * delta_time,
      base_speed_y * speed_multiplier * delta_time
    ]);
  },
  calculate_speed_multiplier: (is_moving: boolean, click_time: number, current_time: number, current_multiplier: number): number => {
    logFallback('calculate_speed_multiplier');
    let speed_multiplier = 1.0;
    
    // Apply movement boost
    if (is_moving) {
      speed_multiplier *= 4.5;
    }
    
    // Apply click boost with decay
    const time_since_click = current_time - click_time;
    if (time_since_click < 1200) {
      const click_decay = 1 - time_since_click / 1200;
      const click_boost = 1 + 4.3 * click_decay;
      speed_multiplier *= click_boost;
    }
    
    // Apply smoothing (lerp with factor 0.2)
    return current_multiplier + (speed_multiplier - current_multiplier) * 0.2;
  },
  // Camera frustum culling fallbacks
  cull_stars_by_frustum: (positions: Float32Array, count: number, camera_matrix: Float32Array, fov: number, aspect_ratio: number, near: number, far: number): Uint8Array => {
    logFallback('cull_stars_by_frustum');
    
    if (camera_matrix.length !== 16) {
      return new Uint8Array(count).fill(1);
    }
    
    const visibility_mask = new Uint8Array(count);
    
    // Extract frustum planes from view projection matrix
    const m = camera_matrix;
    const planes = [
      [m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]], // Left
      [m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]], // Right
      [m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]], // Bottom
      [m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]], // Top
      [m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]], // Near
      [m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]], // Far
    ];
    
    // Normalize planes
    const normalized_planes = planes.map(plane => {
      const length = Math.sqrt(plane[0] * plane[0] + plane[1] * plane[1] + plane[2] * plane[2]);
      return length > 0 ? plane.map(v => v / length) : plane;
    });
    
    // Check each star
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];
      
      let inside = true;
      
      for (const plane of normalized_planes) {
        const distance = plane[0] * x + plane[1] * y + plane[2] * z + plane[3];
        
        if (distance < -2.0) {
          inside = false;
          break;
        }
      }
      
      visibility_mask[i] = inside ? 1 : 0;
    }
    
    return visibility_mask;
  },
  get_visible_star_indices: (positions: Float32Array, count: number, camera_matrix: Float32Array, margin: number): Uint32Array => {
    logFallback('get_visible_star_indices');
    
    if (camera_matrix.length !== 16) {
      return new Uint32Array(Array.from({length: count}, (_, i) => i));
    }
    
    const visible_indices: number[] = [];
    
    // Extract frustum planes
    const m = camera_matrix;
    const planes = [
      [m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]],
      [m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]],
      [m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]],
      [m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]],
      [m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]],
      [m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]],
    ];
    
    // Normalize planes
    const normalized_planes = planes.map(plane => {
      const length = Math.sqrt(plane[0] * plane[0] + plane[1] * plane[1] + plane[2] * plane[2]);
      return length > 0 ? plane.map(v => v / length) : plane;
    });
    
    // Check each star
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];
      
      let inside = true;
      
      for (const plane of normalized_planes) {
        const distance = plane[0] * x + plane[1] * y + plane[2] * z + plane[3];
        
        if (distance < -margin) {
          inside = false;
          break;
        }
      }
      
      if (inside) {
        visible_indices.push(i);
      }
    }
    
    return new Uint32Array(visible_indices);
  },
  cull_stars_by_frustum_simd: undefined, // No SIMD fallback
  // Enhanced SIMD batch processing for LOD groups
  calculate_star_effects_by_lod: (
    near_positions: Float32Array,
    near_count: number,
    medium_positions: Float32Array,
    medium_count: number,
    far_positions: Float32Array,
    far_count: number,
    time: number,
    quality_tier: number
  ): Float32Array => {
    logFallback('calculate_star_effects_by_lod');
    
    const total_count = near_count + medium_count + far_count;
    const effects = new Float32Array(total_count * 2);
    let offset = 0;
    
    // Helper function for full effects
    const processFullEffects = (positions: Float32Array, count: number, startOffset: number) => {
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const x = positions[i3];
        const y = positions[i3 + 1];
        
        const twinkle_base = Math.sin(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;
        const sparkle_phase = Math.sin(time * 15.0 + x * 20.0 + y * 30.0);
        const sparkle = sparkle_phase > 0.98 ? (sparkle_phase - 0.98) / 0.02 : 0.0;
        
        const idx = (startOffset + i) * 2;
        effects[idx] = twinkle_base + sparkle;
        effects[idx + 1] = sparkle;
      }
    };
    
    // Helper function for simple effects
    const processSimpleEffects = (positions: Float32Array, count: number, startOffset: number) => {
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const x = positions[i3];
        const y = positions[i3 + 1];
        
        const twinkle = Math.sin(time * 2.0 + x * 5.0 + y * 5.0) * 0.2 + 0.8;
        
        const idx = (startOffset + i) * 2;
        effects[idx] = twinkle;
        effects[idx + 1] = 0.0;
      }
    };
    
    // Helper function for no effects
    const processNoEffects = (count: number, startOffset: number) => {
      for (let i = 0; i < count; i++) {
        const idx = (startOffset + i) * 2;
        effects[idx] = 1.0;
        effects[idx + 1] = 0.0;
      }
    };
    
    // Process based on quality tier
    switch (quality_tier) {
      case 0: // Performance
        processSimpleEffects(near_positions, near_count, offset);
        offset += near_count;
        processSimpleEffects(medium_positions, medium_count, offset);
        offset += medium_count;
        processNoEffects(far_count, offset);
        break;
      case 1: // Balanced
        processFullEffects(near_positions, near_count, offset);
        offset += near_count;
        processSimpleEffects(medium_positions, medium_count, offset);
        offset += medium_count;
        processNoEffects(far_count, offset);
        break;
      default: // Ultra
        processFullEffects(near_positions, near_count, offset);
        offset += near_count;
        processFullEffects(medium_positions, medium_count, offset);
        offset += medium_count;
        processSimpleEffects(far_positions, far_count, offset);
        break;
    }
    
    return effects;
  },
  // Temporal coherence optimization fallbacks
  calculate_star_effects_with_temporal_coherence: (
    positions: Float32Array,
    previous_twinkles: Float32Array,
    previous_sparkles: Float32Array,
    count: number,
    time: number,
    threshold: number
  ): Float32Array => {
    logFallback('calculate_star_effects_with_temporal_coherence');
    
    // Result format: [need_update_flag, twinkle, sparkle] triplets
    const results = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const x = positions[i3];
      const y = positions[i3 + 1];
      
      // Calculate new effects
      const twinkle_base = Math.sin(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;
      const sparkle_phase = Math.sin(time * 15.0 + x * 20.0 + y * 30.0);
      const sparkle = sparkle_phase > 0.98 ? (sparkle_phase - 0.98) / 0.02 : 0.0;
      const twinkle = twinkle_base + sparkle;
      
      // Check if update is needed
      const twinkle_diff = Math.abs(twinkle - previous_twinkles[i]);
      const sparkle_diff = Math.abs(sparkle - previous_sparkles[i]);
      
      const needs_update = twinkle_diff > threshold || sparkle_diff > threshold;
      
      const idx = i * 3;
      results[idx] = needs_update ? 1.0 : 0.0;
      results[idx + 1] = twinkle;
      results[idx + 2] = sparkle;
    }
    
    return results;
  },
  get_stars_needing_update: (
    positions: Float32Array,
    previous_twinkles: Float32Array,
    previous_sparkles: Float32Array,
    count: number,
    time: number,
    threshold: number
  ): Uint32Array => {
    logFallback('get_stars_needing_update');
    
    const indices: number[] = [];
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const x = positions[i3];
      const y = positions[i3 + 1];
      
      // Calculate new effects
      const twinkle_base = Math.sin(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;
      const sparkle_phase = Math.sin(time * 15.0 + x * 20.0 + y * 30.0);
      const sparkle = sparkle_phase > 0.98 ? (sparkle_phase - 0.98) / 0.02 : 0.0;
      const twinkle = twinkle_base + sparkle;
      
      // Check if update is needed
      const twinkle_diff = Math.abs(twinkle - previous_twinkles[i]);
      const sparkle_diff = Math.abs(sparkle - previous_sparkles[i]);
      
      if (twinkle_diff > threshold || sparkle_diff > threshold) {
        indices.push(i);
      }
    }
    
    return new Uint32Array(indices);
  },
  calculate_star_effects_temporal_simd: undefined, // No SIMD fallback
  // LOD distribution calculations
  calculate_lod_distribution: (total_count: number, quality_tier: number): Uint32Array => {
    logFallback('calculate_lod_distribution');
    
    // Distribution ratios for each quality tier
    let near_ratio: number;
    let medium_ratio: number;
    
    switch (quality_tier) {
      case 0: // Performance
        near_ratio = 0.1;
        medium_ratio = 0.3;
        break;
      case 1: // Balanced
        near_ratio = 0.15;
        medium_ratio = 0.35;
        break;
      default: // Ultra
        near_ratio = 0.2;
        medium_ratio = 0.4;
        break;
    }
    
    const near_count = Math.floor(total_count * near_ratio);
    const medium_count = Math.floor(total_count * medium_ratio);
    const far_count = total_count - near_count - medium_count;
    
    return new Uint32Array([near_count, medium_count, far_count]);
  },
  // Frame rate calculation
  calculate_fps: (frame_count: number, current_time: number, last_time: number): Float32Array => {
    logFallback('calculate_fps');
    
    // Check if we should calculate FPS (every 30 frames)
    if (frame_count % 30 === 0) {
      // Calculate FPS: 30 frames / time_elapsed (in seconds)
      const time_elapsed = current_time - last_time;
      const fps = time_elapsed > 0 ? 30000 / time_elapsed : 60.0;
      
      // Return [fps, 1.0 (should update), current_time split into two f32s]
      const time_high = Math.floor(current_time / 1000);
      const time_low = current_time - (time_high * 1000);
      
      return new Float32Array([fps, 1.0, time_high, time_low]);
    } else {
      // Don't update FPS
      return new Float32Array([0.0, 0.0, 0.0, 0.0]);
    }
  },
  // Math utilities
  fast_sin: (x: number): number => Math.sin(x),
  fast_cos: (x: number): number => Math.cos(x),
  fast_sin_batch: (values: Float32Array): Float32Array => {
    const result = new Float32Array(values.length);
    for (let i = 0; i < values.length; i++) {
      result[i] = Math.sin(values[i]);
    }
    return result;
  },
  fast_cos_batch: (values: Float32Array): Float32Array => {
    const result = new Float32Array(values.length);
    for (let i = 0; i < values.length; i++) {
      result[i] = Math.cos(values[i]);
    }
    return result;
  },
  seed_random: (i: number): number => {
    const val = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return val - Math.floor(val);
  },
  seed_random_batch: (start: number, count: number): Float32Array => {
    const result = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const val = Math.sin((start + i) * 12.9898 + 78.233) * 43758.5453;
      result[i] = val - Math.floor(val);
    }
    return result;
  },
  // Bezier fallbacks
  precalculate_bezier_path: (start_x: number, start_y: number, control_x: number, control_y: number, end_x: number, end_y: number, segments: number): Float32Array => {
    logFallback('precalculate_bezier_path');
    const points = new Float32Array((segments + 1) * 2);
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const oneMinusT = 1 - t;
      
      // Quadratic Bezier formula
      const x = oneMinusT * oneMinusT * start_x + 
                2 * oneMinusT * t * control_x + 
                t * t * end_x;
      
      const y = oneMinusT * oneMinusT * start_y + 
                2 * oneMinusT * t * control_y + 
                t * t * end_y;
      
      points[i * 2] = x;
      points[i * 2 + 1] = y;
    }
    
    return points;
  },
  precalculate_bezier_paths_batch: (paths_data: Float32Array, segments: number): Float32Array => {
    logFallback('precalculate_bezier_paths_batch');
    const pathCount = paths_data.length / 6;
    const pointsPerPath = (segments + 1) * 2;
    const allPoints = new Float32Array(pathCount * pointsPerPath);
    
    for (let pathIdx = 0; pathIdx < pathCount; pathIdx++) {
      const baseIdx = pathIdx * 6;
      const start_x = paths_data[baseIdx];
      const start_y = paths_data[baseIdx + 1];
      const control_x = paths_data[baseIdx + 2];
      const control_y = paths_data[baseIdx + 3];
      const end_x = paths_data[baseIdx + 4];
      const end_y = paths_data[baseIdx + 5];
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const oneMinusT = 1 - t;
        
        const x = oneMinusT * oneMinusT * start_x + 
                  2 * oneMinusT * t * control_x + 
                  t * t * end_x;
        
        const y = oneMinusT * oneMinusT * start_y + 
                  2 * oneMinusT * t * control_y + 
                  t * t * end_y;
        
        const outputIdx = pathIdx * pointsPerPath + i * 2;
        allPoints[outputIdx] = x;
        allPoints[outputIdx + 1] = y;
      }
    }
    
    return allPoints;
  },
  interpolate_bezier_point: (points: Float32Array, t: number): Float32Array => {
    const pointCount = points.length / 2;
    if (pointCount === 0) {
      return new Float32Array([0, 0]);
    }
    
    const index = Math.floor(t * (pointCount - 1));
    const localT = (t * (pointCount - 1)) % 1;
    
    if (index >= pointCount - 1) {
      const lastIdx = (pointCount - 1) * 2;
      return new Float32Array([points[lastIdx], points[lastIdx + 1]]);
    }
    
    const p1Idx = index * 2;
    const p2Idx = (index + 1) * 2;
    
    return new Float32Array([
      points[p1Idx] + (points[p2Idx] - points[p1Idx]) * localT,
      points[p1Idx + 1] + (points[p2Idx + 1] - points[p1Idx + 1]) * localT
    ]);
  },
  precalculate_cubic_bezier_path: (p0x: number, p0y: number, p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number, segments: number): Float32Array => {
    logFallback('precalculate_cubic_bezier_path');
    const points = new Float32Array((segments + 1) * 2);
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const oneMinusT = 1 - t;
      const oneMinusTSq = oneMinusT * oneMinusT;
      const oneMinusTCube = oneMinusTSq * oneMinusT;
      const tSq = t * t;
      const tCube = tSq * t;
      
      // Cubic Bezier formula
      const x = oneMinusTCube * p0x + 
                3 * oneMinusTSq * t * p1x + 
                3 * oneMinusT * tSq * p2x + 
                tCube * p3x;
      
      const y = oneMinusTCube * p0y + 
                3 * oneMinusTSq * t * p1y + 
                3 * oneMinusT * tSq * p2y + 
                tCube * p3y;
      
      points[i * 2] = x;
      points[i * 2 + 1] = y;
    }
    
    return points;
  },
  calculate_bezier_length: (points: Float32Array): number => {
    const pointCount = points.length / 2;
    if (pointCount < 2) {
      return 0;
    }
    
    let length = 0;
    
    for (let i = 1; i < pointCount; i++) {
      const prevIdx = (i - 1) * 2;
      const currIdx = i * 2;
      
      const dx = points[currIdx] - points[prevIdx];
      const dy = points[currIdx + 1] - points[prevIdx + 1];
      
      length += Math.sqrt(dx * dx + dy * dy);
    }
    
    return length;
  },
  // Memory management fallbacks (not implemented)
  SharedBuffer: null as any,
  DirectMemory: null as any,
  MemoryPool: null as any,
  batch_process_sin: (input: Float32Array): Float32Array => {
    const result = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) {
      result[i] = Math.sin(input[i]);
    }
    return result;
  },
  batch_process_cos: (input: Float32Array): Float32Array => {
    const result = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) {
      result[i] = Math.cos(input[i]);
    }
    return result;
  },
  batch_process_with_operation: (input: Float32Array, operation: string): Float32Array => {
    logFallback('batch_process_with_operation', 'limited support');
    const result = new Float32Array(input.length);
    switch(operation) {
      case 'sin':
        for (let i = 0; i < input.length; i++) result[i] = Math.sin(input[i]);
        break;
      case 'cos':
        for (let i = 0; i < input.length; i++) result[i] = Math.cos(input[i]);
        break;
      default:
        console.warn(`Operation ${operation} not supported in JS fallback`);
        return input;
    }
    return result;
  },
  // Meteor particle system fallbacks (not implemented)
  MeteorSystem: null as any,
  Vec2: null as any,
  batch_interpolate_meteor_positions: (life_values: Float32Array, max_life_values: Float32Array, path_data: Float32Array, path_stride: number): Float32Array => {
    logFallback('batch_interpolate_meteor_positions');
    const meteorCount = life_values.length;
    const positions = new Float32Array(meteorCount * 2);
    const segments = 60; // Default segments
    
    for (let i = 0; i < meteorCount; i++) {
      const t = Math.min(life_values[i] / max_life_values[i], 1.0);
      const pathOffset = i * path_stride;
      
      const segmentFloat = t * segments;
      const segment = Math.floor(segmentFloat);
      const segmentT = segmentFloat - segment;
      
      if (segment < segments) {
        const idx = pathOffset + segment * 2;
        const nextIdx = idx + 2;
        
        const x = path_data[idx] + (path_data[nextIdx] - path_data[idx]) * segmentT;
        const y = path_data[idx + 1] + (path_data[nextIdx + 1] - path_data[idx + 1]) * segmentT;
        
        positions[i * 2] = x;
        positions[i * 2 + 1] = y;
      } else {
        // Use end position
        const endIdx = pathOffset + segments * 2;
        positions[i * 2] = path_data[endIdx];
        positions[i * 2 + 1] = path_data[endIdx + 1];
      }
    }
    
    return positions;
  },
  // Spatial indexing system fallback (not implemented)
  SpatialGrid: null as any,
  // Particle pool and utilities fallbacks (not implemented)
  ParticlePool: null as any,
  PhysicsUtils: null as any,
  Force: null as any,
  FastRandom: null as any,
  BatchTransfer: null as any,
  TypedBatchTransfer: null as any,
  ViewTransfer: null as any,
  NebulaSystem: null as any,
};

// Unified API that automatically uses WASM or JS fallback
export async function getOptimizedFunctions(): Promise<WASMModule> {
  const wasm = await loadWASM();
  return wasm || jsFallbacks;
}

// Check WASM status
export function getWASMStatus(): { loaded: boolean; usingFallback: boolean } {
  return {
    loaded: wasmModule !== null,
    usingFallback: isUsingFallback
  };
}

// Log WASM status (respects debug config)
export function logWASMStatus(): void {
  const debugConfig = DebugConfigManager.getInstance();
  if (debugConfig.isEnabled('enableConsoleLogs')) {
    const status = getWASMStatus();
    if (status.loaded) {
      console.log('✅ WASM module loaded successfully');
    } else if (status.usingFallback) {
      console.log('⚠️ WASM module failed to load - using JavaScript fallback');
    } else {
      console.log('⏳ WASM module not yet loaded');
    }
  }
}