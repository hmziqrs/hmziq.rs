use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

// Import math utilities
use crate::math::{seed_random, fast_sin_lookup};

// SIMD imports when feature is enabled
#[cfg(feature = "simd")]
use packed_simd::{f32x4, f32x8};

// SIMD batch size constants
#[cfg(feature = "simd")]
const SIMD_BATCH_SIZE: usize = 8;

// Star generation function matching StarField.tsx lines 248-300
#[wasm_bindgen]
pub fn generate_star_positions(
    count: usize,
    start_index: usize,
    min_radius: f32,
    max_radius: f32,
) -> Vec<f32> {
    let mut positions = Vec::with_capacity(count * 3);
    
    for i in 0..count {
        let global_index = (start_index + i) as i32;
        
        // Position calculation (matching lines 266-272)
        let radius = min_radius + seed_random(global_index) * (max_radius - min_radius);
        let theta = seed_random(global_index + 1000) * PI * 2.0;
        let phi = (2.0 * seed_random(global_index + 2000) - 1.0).acos();
        
        let x = radius * phi.sin() * theta.cos();
        let y = radius * phi.sin() * theta.sin();
        let z = radius * phi.cos();
        
        positions.extend([x, y, z]);
    }
    
    positions
}

// Generate star colors matching StarField.tsx lines 274-290
#[wasm_bindgen]
pub fn generate_star_colors(count: usize, start_index: usize) -> Vec<f32> {
    let mut colors = Vec::with_capacity(count * 3);
    
    for i in 0..count {
        let global_index = (start_index + i) as i32;
        let color_choice = seed_random(global_index + 3000);
        
        let (r, g, b) = if color_choice < 0.5 {
            (1.0, 1.0, 1.0) // White
        } else if color_choice < 0.7 {
            (0.6, 0.8, 1.0) // Blue
        } else if color_choice < 0.85 {
            (1.0, 0.8, 0.4) // Yellow
        } else {
            (0.8, 0.6, 1.0) // Purple
        };
        
        colors.extend([r, g, b]);
    }
    
    colors
}

// Generate star sizes matching StarField.tsx lines 292-295
#[wasm_bindgen]
pub fn generate_star_sizes(count: usize, start_index: usize, size_multiplier: f32) -> Vec<f32> {
    let mut sizes = Vec::with_capacity(count);
    
    for i in 0..count {
        let global_index = (start_index + i) as i32;
        let size_random = seed_random(global_index + 4000);
        
        let base_size = if size_random < 0.7 {
            1.0 + seed_random(global_index + 5000) * 1.5
        } else {
            2.5 + seed_random(global_index + 6000) * 2.0
        };
        
        sizes.push(base_size * size_multiplier);
    }
    
    sizes
}

// Calculate twinkle and sparkle effects (matching lines 365-372)
#[wasm_bindgen]
pub fn calculate_twinkle_effects(
    positions_ptr: *const f32,
    count: usize,
    time: f32,
) -> Vec<f32> {
    let positions = unsafe {
        std::slice::from_raw_parts(positions_ptr, count * 3)
    };
    
    let mut twinkles = Vec::with_capacity(count);
    
    for i in 0..count {
        let i3 = i * 3;
        let x = positions[i3];
        let y = positions[i3 + 1];
        
        // Use fast sin approximation from math module
        let twinkle_base = fast_sin_lookup(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;
        
        twinkles.push(twinkle_base);
    }
    
    twinkles
}

// Calculate sparkle effects separately for better performance
#[wasm_bindgen]
pub fn calculate_sparkle_effects(
    positions_ptr: *const f32,
    count: usize,
    time: f32,
) -> Vec<f32> {
    let positions = unsafe {
        std::slice::from_raw_parts(positions_ptr, count * 3)
    };
    
    let mut sparkles = Vec::with_capacity(count);
    
    for i in 0..count {
        let i3 = i * 3;
        let x = positions[i3];
        let y = positions[i3 + 1];
        
        // Sparkle effect - simplified
        let sparkle_phase = fast_sin_lookup(time * 15.0 + x * 20.0 + y * 30.0);
        let sparkle = if sparkle_phase > 0.98 {
            (sparkle_phase - 0.98) / 0.02
        } else {
            0.0
        };
        
        sparkles.push(sparkle);
    }
    
    sparkles
}

// Combined twinkle and sparkle calculation for efficiency
#[wasm_bindgen]
pub fn calculate_star_effects(
    positions_ptr: *const f32,
    count: usize,
    time: f32,
) -> Vec<f32> {
    let positions = unsafe {
        std::slice::from_raw_parts(positions_ptr, count * 3)
    };
    
    // Return interleaved twinkle and sparkle values
    let mut effects = Vec::with_capacity(count * 2);
    
    #[cfg(feature = "simd")]
    {
        calculate_star_effects_simd(&positions, count, time, &mut effects);
    }
    
    #[cfg(not(feature = "simd"))]
    {
        calculate_star_effects_scalar(&positions, count, time, &mut effects);
    }
    
    effects
}

// Scalar fallback implementation
fn calculate_star_effects_scalar(
    positions: &[f32],
    count: usize,
    time: f32,
    effects: &mut Vec<f32>,
) {
    for i in 0..count {
        let i3 = i * 3;
        let x = positions[i3];
        let y = positions[i3 + 1];
        
        // Twinkle calculation
        let twinkle_base = fast_sin_lookup(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;
        
        // Sparkle calculation
        let sparkle_phase = fast_sin_lookup(time * 15.0 + x * 20.0 + y * 30.0);
        let sparkle = if sparkle_phase > 0.98 {
            (sparkle_phase - 0.98) / 0.02
        } else {
            0.0
        };
        
        let twinkle = twinkle_base + sparkle;
        
        effects.push(twinkle);
        effects.push(sparkle);
    }
}

// SIMD-optimized implementation
#[cfg(feature = "simd")]
fn calculate_star_effects_simd(
    positions: &[f32],
    count: usize,
    time: f32,
    effects: &mut Vec<f32>,
) {
    use crate::math::init_sin_table;
    let sin_table = init_sin_table();
    
    // Process in batches of 8 for AVX2 compatibility
    let chunks = count / SIMD_BATCH_SIZE;
    let remainder = count % SIMD_BATCH_SIZE;
    
    // SIMD constants
    let time_3 = f32x8::splat(time * 3.0);
    let time_15 = f32x8::splat(time * 15.0);
    let factor_10 = f32x8::splat(10.0);
    let factor_20 = f32x8::splat(20.0);
    let factor_30 = f32x8::splat(30.0);
    let twinkle_scale = f32x8::splat(0.3);
    let twinkle_offset = f32x8::splat(0.7);
    let sparkle_threshold = f32x8::splat(0.98);
    let sparkle_scale = f32x8::splat(50.0); // 1.0 / 0.02
    
    // Process SIMD chunks
    for chunk in 0..chunks {
        let base_idx = chunk * SIMD_BATCH_SIZE;
        
        // Load x and y positions for 8 stars
        let mut x_values = [0.0f32; 8];
        let mut y_values = [0.0f32; 8];
        
        for i in 0..SIMD_BATCH_SIZE {
            let i3 = (base_idx + i) * 3;
            x_values[i] = positions[i3];
            y_values[i] = positions[i3 + 1];
        }
        
        let x_vec = f32x8::from_slice_unaligned(&x_values);
        let y_vec = f32x8::from_slice_unaligned(&y_values);
        
        // Twinkle calculation using SIMD
        let twinkle_arg = time_3 + x_vec * factor_10 + y_vec * factor_10;
        let twinkle_base_vec = simd_sin_lookup_batch(twinkle_arg, sin_table) * twinkle_scale + twinkle_offset;
        
        // Sparkle calculation using SIMD
        let sparkle_arg = time_15 + x_vec * factor_20 + y_vec * factor_30;
        let sparkle_phase_vec = simd_sin_lookup_batch(sparkle_arg, sin_table);
        
        // Conditional sparkle calculation
        let sparkle_mask = sparkle_phase_vec.gt(sparkle_threshold);
        let sparkle_vec = sparkle_mask.select(
            (sparkle_phase_vec - sparkle_threshold) * sparkle_scale,
            f32x8::splat(0.0)
        );
        
        let twinkle_vec = twinkle_base_vec + sparkle_vec;
        
        // Extract and store results
        let twinkle_arr: [f32; 8] = twinkle_vec.into();
        let sparkle_arr: [f32; 8] = sparkle_vec.into();
        
        for i in 0..SIMD_BATCH_SIZE {
            effects.push(twinkle_arr[i]);
            effects.push(sparkle_arr[i]);
        }
    }
    
    // Process remaining stars with scalar code
    for i in chunks * SIMD_BATCH_SIZE..count {
        let i3 = i * 3;
        let x = positions[i3];
        let y = positions[i3 + 1];
        
        let twinkle_base = fast_sin_lookup(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;
        let sparkle_phase = fast_sin_lookup(time * 15.0 + x * 20.0 + y * 30.0);
        let sparkle = if sparkle_phase > 0.98 {
            (sparkle_phase - 0.98) / 0.02
        } else {
            0.0
        };
        
        effects.push(twinkle_base + sparkle);
        effects.push(sparkle);
    }
}

// SIMD sin lookup helper
#[cfg(feature = "simd")]
fn simd_sin_lookup_batch(angles: f32x8, sin_table: &[f32]) -> f32x8 {
    use std::f32::consts::PI;
    const SIN_TABLE_SIZE: f32 = 1024.0;
    
    // Normalize angles to [0, 2π]
    let two_pi = f32x8::splat(2.0 * PI);
    let normalized = angles - (angles / two_pi).floor() * two_pi;
    
    // Convert to table indices
    let indices = (normalized / two_pi * SIN_TABLE_SIZE).cast::<i32>();
    
    // Gather values from lookup table
    let mut result = [0.0f32; 8];
    let indices_arr: [i32; 8] = indices.into();
    
    for i in 0..8 {
        let idx = (indices_arr[i] as usize).min(1023);
        result[i] = sin_table[idx];
    }
    
    f32x8::from_slice_unaligned(&result)
}

// Helper function to convert degrees to radians
fn deg_to_rad(degrees: f32) -> f32 {
    degrees * PI / 180.0
}

// Optimized rotation calculation for star field
#[wasm_bindgen]
pub fn calculate_rotation_delta(
    base_speed_x: f32,
    base_speed_y: f32,
    speed_multiplier: f32,
    delta_time: f32,
) -> Vec<f32> {
    vec![
        base_speed_x * speed_multiplier * delta_time,
        base_speed_y * speed_multiplier * delta_time,
    ]
}

// Calculate star effects and return both twinkle and sparkle arrays
// This version works with JavaScript typed arrays
#[wasm_bindgen]
pub fn calculate_star_effects_arrays(
    positions: &[f32],
    count: usize,
    time: f32,
) -> Vec<f32> {
    // Return interleaved twinkle and sparkle values
    let mut effects = Vec::with_capacity(count * 2);
    
    #[cfg(feature = "simd")]
    {
        calculate_star_effects_simd(&positions, count, time, &mut effects);
    }
    
    #[cfg(not(feature = "simd"))]
    {
        calculate_star_effects_scalar(&positions, count, time, &mut effects);
    }
    
    effects
}

// Scalar implementation for direct buffer updates
fn calculate_effects_into_buffers_scalar(
    positions: &[f32],
    twinkles: &mut [f32],
    sparkles: &mut [f32],
    count: usize,
    time: f32,
) {
    for i in 0..count {
        let i3 = i * 3;
        let x = positions[i3];
        let y = positions[i3 + 1];
        
        // Twinkle calculation
        let twinkle_base = fast_sin_lookup(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;
        
        // Sparkle calculation
        let sparkle_phase = fast_sin_lookup(time * 15.0 + x * 20.0 + y * 30.0);
        let sparkle = if sparkle_phase > 0.98 {
            (sparkle_phase - 0.98) / 0.02
        } else {
            0.0
        };
        
        twinkles[i] = twinkle_base + sparkle;
        sparkles[i] = sparkle;
    }
}

// SIMD implementation for direct buffer updates
#[cfg(feature = "simd")]
fn calculate_effects_into_buffers_simd(
    positions: &[f32],
    twinkles: &mut [f32],
    sparkles: &mut [f32],
    count: usize,
    time: f32,
) {
    use crate::math::init_sin_table;
    let sin_table = init_sin_table();
    
    let chunks = count / SIMD_BATCH_SIZE;
    
    // SIMD constants
    let time_3 = f32x8::splat(time * 3.0);
    let time_15 = f32x8::splat(time * 15.0);
    let factor_10 = f32x8::splat(10.0);
    let factor_20 = f32x8::splat(20.0);
    let factor_30 = f32x8::splat(30.0);
    let twinkle_scale = f32x8::splat(0.3);
    let twinkle_offset = f32x8::splat(0.7);
    let sparkle_threshold = f32x8::splat(0.98);
    let sparkle_scale = f32x8::splat(50.0);
    
    // Process SIMD chunks
    for chunk in 0..chunks {
        let base_idx = chunk * SIMD_BATCH_SIZE;
        
        // Load positions
        let mut x_values = [0.0f32; 8];
        let mut y_values = [0.0f32; 8];
        
        for i in 0..SIMD_BATCH_SIZE {
            let i3 = (base_idx + i) * 3;
            x_values[i] = positions[i3];
            y_values[i] = positions[i3 + 1];
        }
        
        let x_vec = f32x8::from_slice_unaligned(&x_values);
        let y_vec = f32x8::from_slice_unaligned(&y_values);
        
        // Calculate twinkle
        let twinkle_arg = time_3 + x_vec * factor_10 + y_vec * factor_10;
        let twinkle_base_vec = simd_sin_lookup_batch(twinkle_arg, sin_table) * twinkle_scale + twinkle_offset;
        
        // Calculate sparkle
        let sparkle_arg = time_15 + x_vec * factor_20 + y_vec * factor_30;
        let sparkle_phase_vec = simd_sin_lookup_batch(sparkle_arg, sin_table);
        
        let sparkle_mask = sparkle_phase_vec.gt(sparkle_threshold);
        let sparkle_vec = sparkle_mask.select(
            (sparkle_phase_vec - sparkle_threshold) * sparkle_scale,
            f32x8::splat(0.0)
        );
        
        let twinkle_vec = twinkle_base_vec + sparkle_vec;
        
        // Store directly to buffers
        twinkle_vec.write_to_slice_unaligned(&mut twinkles[base_idx..base_idx + SIMD_BATCH_SIZE]);
        sparkle_vec.write_to_slice_unaligned(&mut sparkles[base_idx..base_idx + SIMD_BATCH_SIZE]);
    }
    
    // Process remaining
    for i in chunks * SIMD_BATCH_SIZE..count {
        let i3 = i * 3;
        let x = positions[i3];
        let y = positions[i3 + 1];
        
        let twinkle_base = fast_sin_lookup(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;
        let sparkle_phase = fast_sin_lookup(time * 15.0 + x * 20.0 + y * 30.0);
        let sparkle = if sparkle_phase > 0.98 {
            (sparkle_phase - 0.98) / 0.02
        } else {
            0.0
        };
        
        twinkles[i] = twinkle_base + sparkle;
        sparkles[i] = sparkle;
    }
}



// Speed multiplier calculation matching StarField.tsx lines 504-520
#[wasm_bindgen]
pub fn calculate_speed_multiplier(
    is_moving: bool,
    click_time: f64,
    current_time: f64,
    current_multiplier: f32,
) -> f32 {
    let mut speed_multiplier = 1.0;
    
    // Apply movement boost
    if is_moving {
        speed_multiplier *= 4.5;
    }
    
    // Apply click boost with decay
    let time_since_click = current_time - click_time;
    if time_since_click < 1200.0 {
        let click_decay = 1.0 - (time_since_click / 1200.0) as f32;
        let click_boost = 1.0 + 4.3 * click_decay;
        speed_multiplier *= click_boost;
    }
    
    // Apply smoothing (lerp with factor 0.2)
    current_multiplier + (speed_multiplier - current_multiplier) * 0.2
}
