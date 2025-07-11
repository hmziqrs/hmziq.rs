// WASM module loader with graceful fallback - Active functions only

let wasmModule: WASMModule | null = null
let loadPromise: Promise<void> | null = null
let isUsingFallback = false

export interface WASMModule {
  add: (a: number, b: number) => number
  greet: (name: string) => string
  // Star field functions - core functionality only
  generate_star_positions: (
    count: number,
    start_index: number,
    min_radius: number,
    max_radius: number
  ) => Float32Array
  generate_star_colors: (count: number, start_index: number) => Float32Array
  generate_star_sizes: (count: number, start_index: number, size_multiplier: number) => Float32Array
  calculate_star_effects_arrays: (
    positions: Float32Array,
    count: number,
    time: number
  ) => Float32Array
  calculate_star_effects_with_temporal_coherence: (
    positions: Float32Array,
    previous_twinkles: Float32Array,
    previous_sparkles: Float32Array,
    count: number,
    time: number,
    threshold: number
  ) => Float32Array
  // Camera frustum culling
  get_visible_star_indices: (
    positions: Float32Array,
    count: number,
    camera_matrix: Float32Array,
    margin: number
  ) => Uint32Array
  cull_stars_by_frustum_simd?: (
    positions: Float32Array,
    count: number,
    camera_matrix: Float32Array,
    margin: number
  ) => Uint8Array
  // Animation and performance functions
  calculate_fps: (frame_count: number, current_time: number, last_time: number) => Float32Array
  calculate_speed_multiplier: (
    is_moving: boolean,
    click_time: number,
    current_time: number,
    current_multiplier: number
  ) => number
  calculate_rotation_delta: (
    base_speed_x: number,
    base_speed_y: number,
    speed_multiplier: number,
    delta_time: number
  ) => Float32Array
  // Math utilities - essential functions only
  fast_sin: (x: number) => number
  fast_cos: (x: number) => number
  fast_sin_batch: (values: Float32Array) => Float32Array
  fast_cos_batch: (values: Float32Array) => Float32Array
  seed_random: (i: number) => number
  seed_random_batch: (start: number, count: number) => Float32Array
}

export async function loadWASM(): Promise<WASMModule | null> {
  // Return cached module if already loaded
  if (wasmModule) {
    return wasmModule
  }

  // Return existing load promise if loading is in progress
  if (loadPromise) {
    await loadPromise
    return wasmModule
  }

  // Start loading process
  loadPromise = (async () => {
    try {
      // Dynamic import to avoid build-time errors
      const wasmPath = '/wasm/pkg/hmziq_wasm_bg.wasm'
      
      // Use dynamic import with string interpolation to avoid TypeScript resolution
      const wasmModulePath = '/wasm/pkg/hmziq_wasm.js'
      const wasm = await import(/* webpackIgnore: true */ /* @ts-ignore */ wasmModulePath)

      // Initialize WASM module
      await wasm.default(wasmPath)

      // Store module functions - only active functions
      wasmModule = {
        add: wasm.add,
        greet: wasm.greet,
        // Star field functions
        generate_star_positions: wasm.generate_star_positions,
        generate_star_colors: wasm.generate_star_colors,
        generate_star_sizes: wasm.generate_star_sizes,
        calculate_star_effects_arrays: wasm.calculate_star_effects_arrays,
        calculate_star_effects_with_temporal_coherence:
          wasm.calculate_star_effects_with_temporal_coherence,
        // Camera frustum culling
        get_visible_star_indices: wasm.get_visible_star_indices,
        cull_stars_by_frustum_simd: wasm.cull_stars_by_frustum_simd,
        // Animation and performance functions
        calculate_fps: wasm.calculate_fps,
        calculate_speed_multiplier: wasm.calculate_speed_multiplier,
        calculate_rotation_delta: wasm.calculate_rotation_delta,
        // Math utilities
        fast_sin: wasm.fast_sin,
        fast_cos: wasm.fast_cos,
        fast_sin_batch: wasm.fast_sin_batch,
        fast_cos_batch: wasm.fast_cos_batch,
        seed_random: wasm.seed_random,
        seed_random_batch: wasm.seed_random_batch,
      }
    } catch {
      isUsingFallback = true
      wasmModule = null
    }
  })()

  await loadPromise
  return wasmModule
}

// JavaScript fallback implementations - essential functions only
export const jsFallbacks: WASMModule = {
  add: (a: number, b: number): number => {
    return a + b
  },
  greet: (name: string): string => {
    return `Hello from JS fallback, ${name}!`
  },
  // Star field fallbacks (simplified versions)
  generate_star_positions: (
    count: number,
    start_index: number,
    min_radius: number,
    max_radius: number
  ): Float32Array => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const globalIndex = start_index + i
      const seed = (x: number) => {
        const val = Math.sin(x * 12.9898 + 78.233) * 43758.5453
        return val - Math.floor(val)
      }

      const radius = min_radius + seed(globalIndex) * (max_radius - min_radius)
      const theta = seed(globalIndex + 1000) * Math.PI * 2
      const phi = Math.acos(2 * seed(globalIndex + 2000) - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)
    }
    return positions
  },
  generate_star_colors: (count: number, start_index: number): Float32Array => {
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const globalIndex = start_index + i
      const seed = (x: number) => {
        const val = Math.sin(x * 12.9898 + 78.233) * 43758.5453
        return val - Math.floor(val)
      }
      const colorChoice = seed(globalIndex + 3000)

      let r, g, b
      if (colorChoice < 0.5) {
        r = g = b = 1
      } else if (colorChoice < 0.7) {
        r = 0.6
        g = 0.8
        b = 1
      } else if (colorChoice < 0.85) {
        r = 1
        g = 0.8
        b = 0.4
      } else {
        r = 0.8
        g = 0.6
        b = 1
      }

      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b
    }
    return colors
  },
  generate_star_sizes: (
    count: number,
    start_index: number,
    size_multiplier: number
  ): Float32Array => {
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const globalIndex = start_index + i
      const seed = (x: number) => {
        const val = Math.sin(x * 12.9898 + 78.233) * 43758.5453
        return val - Math.floor(val)
      }
      const sizeRandom = seed(globalIndex + 4000)
      const baseSize =
        sizeRandom < 0.7 ? 1 + seed(globalIndex + 5000) * 1.5 : 2.5 + seed(globalIndex + 6000) * 2
      sizes[i] = baseSize * size_multiplier
    }
    return sizes
  },
  calculate_star_effects_arrays: (
    positions: Float32Array,
    count: number,
    time: number
  ): Float32Array => {
    const effects = new Float32Array(count * 2)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const x = positions[i3]
      const y = positions[i3 + 1]

      // Twinkle calculation
      const twinkleBase = Math.sin(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7

      // Sparkle calculation
      const sparklePhase = Math.sin(time * 15.0 + x * 20.0 + y * 30.0)
      const sparkle = sparklePhase > 0.98 ? (sparklePhase - 0.98) / 0.02 : 0

      effects[i * 2] = twinkleBase + sparkle
      effects[i * 2 + 1] = sparkle
    }

    return effects
  },
  calculate_star_effects_with_temporal_coherence: (
    positions: Float32Array,
    previous_twinkles: Float32Array,
    previous_sparkles: Float32Array,
    count: number,
    time: number,
    threshold: number
  ): Float32Array => {
    // Result format: [need_update_flag, twinkle, sparkle] triplets
    const results = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const x = positions[i3]
      const y = positions[i3 + 1]

      // Calculate new effects
      const twinkle_base = Math.sin(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7
      const sparkle_phase = Math.sin(time * 15.0 + x * 20.0 + y * 30.0)
      const sparkle = sparkle_phase > 0.98 ? (sparkle_phase - 0.98) / 0.02 : 0.0
      const twinkle = twinkle_base + sparkle

      // Check if update is needed
      const twinkle_diff = Math.abs(twinkle - previous_twinkles[i])
      const sparkle_diff = Math.abs(sparkle - previous_sparkles[i])

      const needs_update = twinkle_diff > threshold || sparkle_diff > threshold

      const idx = i * 3
      results[idx] = needs_update ? 1.0 : 0.0
      results[idx + 1] = twinkle
      results[idx + 2] = sparkle
    }

    return results
  },
  get_visible_star_indices: (
    positions: Float32Array,
    count: number,
    camera_matrix: Float32Array,
    margin: number
  ): Uint32Array => {
    if (camera_matrix.length !== 16) {
      return new Uint32Array(Array.from({ length: count }, (_, i) => i))
    }

    const visible_indices: number[] = []

    // Extract frustum planes
    const m = camera_matrix
    const planes = [
      [m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]],
      [m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]],
      [m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]],
      [m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]],
      [m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]],
      [m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]],
    ]

    // Normalize planes
    const normalized_planes = planes.map((plane) => {
      const length = Math.sqrt(plane[0] * plane[0] + plane[1] * plane[1] + plane[2] * plane[2])
      return length > 0 ? plane.map((v) => v / length) : plane
    })

    // Check each star
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const x = positions[i3]
      const y = positions[i3 + 1]
      const z = positions[i3 + 2]

      let inside = true

      for (const plane of normalized_planes) {
        const distance = plane[0] * x + plane[1] * y + plane[2] * z + plane[3]

        if (distance < -margin) {
          inside = false
          break
        }
      }

      if (inside) {
        visible_indices.push(i)
      }
    }

    return new Uint32Array(visible_indices)
  },
  cull_stars_by_frustum_simd: undefined, // No SIMD fallback
  // Math utilities
  fast_sin: (x: number): number => Math.sin(x),
  fast_cos: (x: number): number => Math.cos(x),
  fast_sin_batch: (values: Float32Array): Float32Array => {
    const result = new Float32Array(values.length)
    for (let i = 0; i < values.length; i++) {
      result[i] = Math.sin(values[i])
    }
    return result
  },
  fast_cos_batch: (values: Float32Array): Float32Array => {
    const result = new Float32Array(values.length)
    for (let i = 0; i < values.length; i++) {
      result[i] = Math.cos(values[i])
    }
    return result
  },
  seed_random: (i: number): number => {
    const val = Math.sin(i * 12.9898 + 78.233) * 43758.5453
    return val - Math.floor(val)
  },
  seed_random_batch: (start: number, count: number): Float32Array => {
    const result = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const val = Math.sin((start + i) * 12.9898 + 78.233) * 43758.5453
      result[i] = val - Math.floor(val)
    }
    return result
  },
  // Animation and performance function fallbacks
  calculate_fps: (frame_count: number, current_time: number, last_time: number): Float32Array => {
    // Check if we should calculate FPS (every 30 frames)
    if (frame_count % 30 === 0) {
      // Calculate FPS: 30 frames / time_elapsed (in seconds)
      const time_elapsed = current_time - last_time
      const fps = time_elapsed > 0 ? 30000 / time_elapsed : 60.0

      // Return [fps, 1.0 (should update), current_time split into two f32s]
      const time_high = Math.floor(current_time / 1000)
      const time_low = current_time - time_high * 1000

      return new Float32Array([fps, 1.0, time_high, time_low])
    } else {
      // Don't update FPS
      return new Float32Array([0.0, 0.0, 0.0, 0.0])
    }
  },
  calculate_speed_multiplier: (
    is_moving: boolean,
    click_time: number,
    current_time: number,
    current_multiplier: number
  ): number => {
    let speed_multiplier = 1.0

    // Apply movement boost
    if (is_moving) {
      speed_multiplier *= 4.5
    }

    // Apply click boost with decay
    const time_since_click = current_time - click_time
    if (time_since_click < 1200) {
      const click_decay = 1 - time_since_click / 1200
      const click_boost = 1 + 4.3 * click_decay
      speed_multiplier *= click_boost
    }

    // Apply smoothing (lerp with factor 0.2)
    return current_multiplier + (speed_multiplier - current_multiplier) * 0.2
  },
  calculate_rotation_delta: (
    base_speed_x: number,
    base_speed_y: number,
    speed_multiplier: number,
    delta_time: number
  ): Float32Array => {
    return new Float32Array([
      base_speed_x * speed_multiplier * delta_time,
      base_speed_y * speed_multiplier * delta_time,
    ])
  },
}

// Unified API that automatically uses WASM or JS fallback
export async function getOptimizedFunctions(): Promise<WASMModule> {
  const wasm = await loadWASM()
  return wasm || jsFallbacks
}

// Check WASM status
export function getWASMStatus(): { loaded: boolean; usingFallback: boolean } {
  return {
    loaded: wasmModule !== null,
    usingFallback: isUsingFallback,
  }
}
