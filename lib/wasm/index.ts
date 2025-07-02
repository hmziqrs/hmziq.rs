// WASM module loader with graceful fallback
let wasmModule: any = null;
let loadPromise: Promise<void> | null = null;

export interface WASMModule {
  add: (a: number, b: number) => number;
  greet: (name: string) => string;
  // Star field functions
  generate_star_positions: (count: number, start_index: number, min_radius: number, max_radius: number) => Float32Array;
  generate_star_colors: (count: number, start_index: number) => Float32Array;
  generate_star_sizes: (count: number, start_index: number, size_multiplier: number) => Float32Array;
  calculate_star_effects: (positions_ptr: number, count: number, time: number) => Float32Array;
  calculate_twinkle_effects: (positions_ptr: number, count: number, time: number) => Float32Array;
  calculate_sparkle_effects: (positions_ptr: number, count: number, time: number) => Float32Array;
  calculate_rotation_delta: (base_speed_x: number, base_speed_y: number, speed_multiplier: number, delta_time: number) => Float32Array;
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
  SharedBuffer: typeof SharedBuffer;
  DirectMemory: typeof DirectMemory;
  MemoryPool: typeof MemoryPool;
  batch_process_sin: (input: Float32Array) => Float32Array;
  batch_process_cos: (input: Float32Array) => Float32Array;
  batch_process_with_operation: (input: Float32Array, operation: string) => Float32Array;
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
        calculate_twinkle_effects: wasm.calculate_twinkle_effects,
        calculate_sparkle_effects: wasm.calculate_sparkle_effects,
        calculate_rotation_delta: wasm.calculate_rotation_delta,
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
      };
      
      console.log('WASM module loaded successfully with star field optimizations');
    } catch (error) {
      console.warn('Failed to load WASM module, falling back to JS:', error);
      wasmModule = null;
    }
  })();

  await loadPromise;
  return wasmModule;
}

// JavaScript fallback implementations
export const jsFallbacks: WASMModule = {
  add: (a: number, b: number): number => {
    console.log('Using JS fallback for add()');
    return a + b;
  },
  greet: (name: string): string => {
    console.log('Using JS fallback for greet()');
    return `Hello from JS fallback, ${name}!`;
  },
  // Star field fallbacks (simplified versions)
  generate_star_positions: (count: number, start_index: number, min_radius: number, max_radius: number): Float32Array => {
    console.log('Using JS fallback for generate_star_positions()');
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
    console.log('Using JS fallback for generate_star_colors()');
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
    console.log('Using JS fallback for generate_star_sizes()');
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
    console.log('Using JS fallback for calculate_star_effects() - not implemented');
    return new Float32Array(0);
  },
  calculate_twinkle_effects: (): Float32Array => {
    console.log('Using JS fallback for calculate_twinkle_effects() - not implemented');
    return new Float32Array(0);
  },
  calculate_sparkle_effects: (): Float32Array => {
    console.log('Using JS fallback for calculate_sparkle_effects() - not implemented');
    return new Float32Array(0);
  },
  calculate_rotation_delta: (base_speed_x: number, base_speed_y: number, speed_multiplier: number, delta_time: number): Float32Array => {
    return new Float32Array([
      base_speed_x * speed_multiplier * delta_time,
      base_speed_y * speed_multiplier * delta_time
    ]);
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
    console.log('Using JS fallback for precalculate_bezier_path()');
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
    console.log('Using JS fallback for precalculate_bezier_paths_batch()');
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
    console.log('Using JS fallback for precalculate_cubic_bezier_path()');
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
};

// Unified API that automatically uses WASM or JS fallback
export async function getOptimizedFunctions(): Promise<WASMModule> {
  const wasm = await loadWASM();
  return wasm || jsFallbacks;
}