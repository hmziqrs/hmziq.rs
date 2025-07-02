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
};

// Unified API that automatically uses WASM or JS fallback
export async function getOptimizedFunctions(): Promise<WASMModule> {
  const wasm = await loadWASM();
  return wasm || jsFallbacks;
}