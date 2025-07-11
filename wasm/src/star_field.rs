use std::cell::RefCell;
use std::f32::consts::PI;
use wasm_bindgen::prelude::*;

// Import math utilities
use crate::math::{fast_sin_lookup, seed_random};

// Import sin table initializer for SIMD operations
use crate::math::init_sin_table;

// SIMD imports - now mandatory
use std::simd::cmp::SimdPartialOrd;
use std::simd::num::SimdFloat;
use std::simd::{f32x4, f32x8};

// SIMD batch size constants
const SIMD_BATCH_SIZE: usize = 8;

// Persistent memory pool for zero-copy architecture
// SAFETY: thread_local is safe in WASM's single-threaded environment
// RefCell provides interior mutability for the pool
thread_local! {
    static STAR_MEMORY_POOL: RefCell<Option<StarMemoryPool>> = RefCell::new(None);
}

#[repr(C)]
pub struct StarMemoryPool {
    // All star data lives in WASM linear memory
    positions: Vec<f32>,      // xyz * count
    colors: Vec<f32>,         // rgb * count
    sizes: Vec<f32>,          // size * count
    twinkles: Vec<f32>,       // intensity * count
    sparkles: Vec<f32>,       // intensity * count
    visibility_mask: Vec<u8>, // culling results

    // Metadata
    count: usize,
}

impl StarMemoryPool {
    fn new(count: usize) -> Self {
        Self {
            positions: vec![0.0; count * 3],
            colors: vec![1.0; count * 3],
            sizes: vec![1.0; count],
            twinkles: vec![1.0; count],
            sparkles: vec![0.0; count],
            visibility_mask: vec![1; count],
            count,
        }
    }

    fn get_pointers(&mut self) -> StarMemoryPointers {
        StarMemoryPointers {
            positions_ptr: self.positions.as_mut_ptr() as u32,
            colors_ptr: self.colors.as_mut_ptr() as u32,
            sizes_ptr: self.sizes.as_mut_ptr() as u32,
            twinkles_ptr: self.twinkles.as_mut_ptr() as u32,
            sparkles_ptr: self.sparkles.as_mut_ptr() as u32,
            visibility_ptr: self.visibility_mask.as_mut_ptr() as u32,
            count: self.count,
            positions_length: self.positions.len(),
            colors_length: self.colors.len(),
            sizes_length: self.sizes.len(),
            twinkles_length: self.twinkles.len(),
            sparkles_length: self.sparkles.len(),
            visibility_length: self.visibility_mask.len(),
        }
    }
}

#[wasm_bindgen]
pub struct StarMemoryPointers {
    pub positions_ptr: u32,
    pub colors_ptr: u32,
    pub sizes_ptr: u32,
    pub twinkles_ptr: u32,
    pub sparkles_ptr: u32,
    pub visibility_ptr: u32,
    pub count: usize,
    pub positions_length: usize,
    pub colors_length: usize,
    pub sizes_length: usize,
    pub twinkles_length: usize,
    pub sparkles_length: usize,
    pub visibility_length: usize,
}

// SIMD sin lookup helper function
fn simd_sin_lookup_batch(values: f32x8, sin_table: &[f32]) -> f32x8 {
    // Normalize values to [0, 2π] range
    let two_pi = f32x8::splat(2.0 * PI);
    let normalized = values % two_pi;

    // Convert to table indices
    let table_size = sin_table.len() as f32;
    let scale = f32x8::splat(table_size / (2.0 * PI));
    let indices = normalized * scale;

    // Extract individual values and perform lookups
    let indices_arr: [f32; 8] = indices.to_array();
    let mut results = [0.0f32; 8];

    for (i, &idx) in indices_arr.iter().enumerate() {
        let index = (idx as usize) % sin_table.len();
        results[i] = sin_table[index];
    }

    f32x8::from_array(results)
}

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

// Initialize persistent memory pool for zero-copy architecture
#[wasm_bindgen]
pub fn initialize_star_memory_pool(count: usize) -> StarMemoryPointers {
    // Create new memory pool
    let mut pool = StarMemoryPool::new(count);

    // Initialize star data using existing generation functions
    let positions = generate_star_positions(count, 0, 20.0, 150.0);
    let colors = generate_star_colors(count, 0);
    let sizes = generate_star_sizes(count, 0, 1.0);

    // Copy generated data to pool
    pool.positions.copy_from_slice(&positions);
    pool.colors.copy_from_slice(&colors);
    pool.sizes.copy_from_slice(&sizes);

    // Initialize twinkles with random values
    for i in 0..count {
        pool.twinkles[i] = 0.8 + seed_random(i as i32 + 7000) * 0.2;
    }

    // Get pointers before storing pool
    let pointers = pool.get_pointers();

    // Store pool globally using thread_local
    STAR_MEMORY_POOL.with(|pool_cell| {
        *pool_cell.borrow_mut() = Some(pool);
    });

    pointers
}



// SIMD version for batch processing
fn calculate_effects_into_buffers_simd(
    positions: &[f32],
    twinkles: &mut [f32],
    sparkles: &mut [f32],
    count: usize,
    time: f32,
) {
    // Initialize sin table if needed
    init_sin_table();
    let sin_table = crate::math::get_sin_table();

    // Pre-calculate time factors
    let time_3 = time * 3.0;
    let time_15 = time * 15.0;

    // Process in batches of 8
    let chunks = count / SIMD_BATCH_SIZE;

    for chunk in 0..chunks {
        let base_idx = chunk * SIMD_BATCH_SIZE;

        // Load positions
        let mut x_values = [0.0f32; SIMD_BATCH_SIZE];
        let mut y_values = [0.0f32; SIMD_BATCH_SIZE];

        for i in 0..SIMD_BATCH_SIZE {
            let i3 = (base_idx + i) * 3;
            x_values[i] = positions[i3];
            y_values[i] = positions[i3 + 1];
        }

        let x_vec = f32x8::from_array(x_values);
        let y_vec = f32x8::from_array(y_values);

        // Twinkle calculation
        let time_3_vec = f32x8::splat(time_3);
        let factor_10 = f32x8::splat(10.0);
        let twinkle_arg = time_3_vec + x_vec * factor_10 + y_vec * factor_10;
        let twinkle_sin = simd_sin_lookup_batch(twinkle_arg, sin_table);
        let twinkle_scale = f32x8::splat(0.3);
        let twinkle_offset = f32x8::splat(0.7);
        let twinkle_base = twinkle_sin * twinkle_scale + twinkle_offset;

        // Sparkle calculation
        let time_15_vec = f32x8::splat(time_15);
        let factor_20 = f32x8::splat(20.0);
        let factor_30 = f32x8::splat(30.0);
        let sparkle_arg = time_15_vec + x_vec * factor_20 + y_vec * factor_30;
        let sparkle_phase = simd_sin_lookup_batch(sparkle_arg, sin_table);

        // Conditional sparkle effect
        let sparkle_threshold = f32x8::splat(0.98);
        let sparkle_scale = f32x8::splat(50.0); // 1.0 / 0.02
        let sparkle_mask = sparkle_phase.simd_gt(sparkle_threshold);
        let sparkle_values = sparkle_mask.select(
            (sparkle_phase - sparkle_threshold) * sparkle_scale,
            f32x8::splat(0.0),
        );

        // Combine twinkle and sparkle
        let final_twinkle = twinkle_base + sparkle_values;

        // Store results
        let twinkle_array: [f32; SIMD_BATCH_SIZE] = final_twinkle.to_array();
        let sparkle_array: [f32; SIMD_BATCH_SIZE] = sparkle_values.to_array();

        for i in 0..SIMD_BATCH_SIZE {
            twinkles[base_idx + i] = twinkle_array[i];
            sparkles[base_idx + i] = sparkle_array[i];
        }
    }

    // Process remaining elements scalar-style (small count, direct processing)
    let remaining_start = chunks * SIMD_BATCH_SIZE;
    for i in remaining_start..count {
        let i3 = i * 3;
        let x = positions[i3];
        let y = positions[i3 + 1];

        let twinkle_base =
            crate::math::fast_sin_lookup(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;
        let sparkle_phase = crate::math::fast_sin_lookup(time * 15.0 + x * 20.0 + y * 30.0);
        let sparkle = if sparkle_phase > 0.98 {
            (sparkle_phase - 0.98) / 0.02
        } else {
            0.0
        };

        twinkles[i] = twinkle_base + sparkle;
        sparkles[i] = sparkle;
    }
}



// Calculate rotation delta based on speed multiplier
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

// Calculate star effects for JavaScript typed arrays
#[wasm_bindgen]
pub fn calculate_star_effects_arrays(positions: &[f32], count: usize, time: f32) -> Vec<f32> {
    let mut effects = Vec::with_capacity(count * 2);

    for i in 0..count {
        let i3 = i * 3;
        let x = positions[i3];
        let y = positions[i3 + 1];

        // Twinkle effect
        let twinkle_base = fast_sin_lookup(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;

        // Sparkle effect
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

    effects
}

// Helper function to convert degrees to radians
#[inline]
fn deg_to_rad(degrees: f32) -> f32 {
    degrees * PI / 180.0
}

// Extract frustum planes from view-projection matrix
fn extract_frustum_planes(vp_matrix: &[f32]) -> [[f32; 4]; 6] {
    let m = vp_matrix;

    // Left plane
    let left = [m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]];

    // Right plane
    let right = [m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]];

    // Bottom plane
    let bottom = [m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]];

    // Top plane
    let top = [m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]];

    // Near plane
    let near = [m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]];

    // Far plane
    let far = [m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]];

    [left, right, bottom, top, near, far]
}

// Normalize a plane
fn normalize_plane(plane: &mut [f32; 4]) {
    let length = (plane[0] * plane[0] + plane[1] * plane[1] + plane[2] * plane[2]).sqrt();
    if length > 0.0 {
        plane[0] /= length;
        plane[1] /= length;
        plane[2] /= length;
        plane[3] /= length;
    }
}

// Process star groups with different LOD (Level of Detail) strategies
fn process_star_group_simd(
    positions: &[f32],
    count: usize,
    time: f32,
    quality_mode: u32,
    effects: &mut Vec<f32>,
) {
    let sin_table = crate::math::get_sin_table();

    match quality_mode {
        0 => process_simple_effects_simd(positions, count, time, effects, sin_table),
        1 => process_medium_effects_simd(positions, count, time, effects, sin_table),
        _ => process_full_effects_simd(positions, count, time, effects, sin_table),
    }
}

// Full quality effects with SIMD
fn process_full_effects_simd(
    positions: &[f32],
    count: usize,
    time: f32,
    effects: &mut Vec<f32>,
    sin_table: &[f32],
) {
    let time_3 = time * 3.0;
    let time_15 = time * 15.0;
    let time_3_vec = f32x8::splat(time_3);
    let time_15_vec = f32x8::splat(time_15);
    let factor_10 = f32x8::splat(10.0);
    let factor_20 = f32x8::splat(20.0);
    let factor_30 = f32x8::splat(30.0);
    let twinkle_scale = f32x8::splat(0.3);
    let twinkle_offset = f32x8::splat(0.7);
    let sparkle_threshold = f32x8::splat(0.98);
    let sparkle_scale = f32x8::splat(50.0);
    let zero = f32x8::splat(0.0);

    let chunks = count / 8;

    for chunk in 0..chunks {
        let base = chunk * 8;
        let mut x_values = [0.0f32; 8];
        let mut y_values = [0.0f32; 8];

        for i in 0..8 {
            let i3 = (base + i) * 3;
            x_values[i] = positions[i3];
            y_values[i] = positions[i3 + 1];
        }

        let x_vec = f32x8::from_array(x_values);
        let y_vec = f32x8::from_array(y_values);

        // Twinkle calculation
        let twinkle_arg = time_3_vec + x_vec * factor_10 + y_vec * factor_10;
        let twinkle_base_vec =
            simd_sin_lookup_batch(twinkle_arg, sin_table) * twinkle_scale + twinkle_offset;

        // Sparkle calculation
        let sparkle_arg = time_15_vec + x_vec * factor_20 + y_vec * factor_30;
        let sparkle_phase_vec = simd_sin_lookup_batch(sparkle_arg, sin_table);
        let sparkle_mask = sparkle_phase_vec.simd_gt(sparkle_threshold);
        let sparkle_vec = sparkle_mask.select(
            (sparkle_phase_vec - sparkle_threshold) * sparkle_scale,
            zero,
        );

        let twinkle_vec = twinkle_base_vec + sparkle_vec;

        let twinkle_arr: [f32; 8] = twinkle_vec.to_array();
        let sparkle_arr: [f32; 8] = sparkle_vec.to_array();

        for i in 0..8 {
            effects.push(twinkle_arr[i]);
            effects.push(sparkle_arr[i]);
        }
    }

    // Process remaining
    let remaining_start = chunks * 8;
    for i in remaining_start..count {
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

// Medium quality effects (no sparkle)
fn process_medium_effects_simd(
    positions: &[f32],
    count: usize,
    time: f32,
    effects: &mut Vec<f32>,
    sin_table: &[f32],
) {
    let time_3 = time * 3.0;
    let time_3_vec = f32x8::splat(time_3);
    let factor_10 = f32x8::splat(10.0);
    let twinkle_scale = f32x8::splat(0.3);
    let twinkle_offset = f32x8::splat(0.7);

    let chunks = count / 8;

    for chunk in 0..chunks {
        let base = chunk * 8;
        let mut x_values = [0.0f32; 8];
        let mut y_values = [0.0f32; 8];

        for i in 0..8 {
            let i3 = (base + i) * 3;
            x_values[i] = positions[i3];
            y_values[i] = positions[i3 + 1];
        }

        let x_vec = f32x8::from_array(x_values);
        let y_vec = f32x8::from_array(y_values);

        let twinkle_arg = time_3_vec + x_vec * factor_10 + y_vec * factor_10;
        let twinkle_vec =
            simd_sin_lookup_batch(twinkle_arg, sin_table) * twinkle_scale + twinkle_offset;

        let twinkle_arr: [f32; 8] = twinkle_vec.to_array();

        for i in 0..8 {
            effects.push(twinkle_arr[i]);
            effects.push(0.0); // No sparkle
        }
    }

    // Process remaining
    let remaining_start = chunks * 8;
    for i in remaining_start..count {
        let i3 = i * 3;
        let x = positions[i3];
        let y = positions[i3 + 1];

        let twinkle = fast_sin_lookup(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;
        effects.push(twinkle);
        effects.push(0.0);
    }
}

// Calculate speed multiplier with smooth transitions
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

// Helper function for cull_stars_by_frustum (SIMD version uses this)
fn get_sin_table() -> &'static [f32] {
    crate::math::get_sin_table()
}

// Camera frustum culling - returns visibility mask
#[wasm_bindgen]
pub fn cull_stars_by_frustum(
    positions: &[f32],
    count: usize,
    camera_matrix: &[f32],
    fov: f32,
    aspect_ratio: f32,
    near: f32,
    far: f32,
) -> Vec<u8> {
    if camera_matrix.len() != 16 {
        // Invalid matrix, return all visible
        return vec![1; count];
    }

    let mut visibility_mask = vec![0u8; count];

    // Extract frustum planes from view projection matrix
    let planes = extract_frustum_planes(camera_matrix);

    // Normalize planes
    let mut normalized_planes = planes;
    for plane in &mut normalized_planes {
        normalize_plane(plane);
    }

    // Check each star against frustum planes
    for i in 0..count {
        let i3 = i * 3;
        let x = positions[i3];
        let y = positions[i3 + 1];
        let z = positions[i3 + 2];

        let mut inside = true;

        // Test against each plane
        for plane in &normalized_planes {
            let distance = plane[0] * x + plane[1] * y + plane[2] * z + plane[3];

            // Star is outside if behind any plane (with small margin for star size)
            if distance < -2.0 {
                inside = false;
                break;
            }
        }

        visibility_mask[i] = if inside { 1 } else { 0 };
    }

    visibility_mask
}

// Get indices of visible stars (more efficient than returning mask)
#[wasm_bindgen]
pub fn get_visible_star_indices(
    positions: &[f32],
    count: usize,
    camera_matrix: &[f32],
    margin: f32,
) -> Vec<u32> {
    if camera_matrix.len() != 16 {
        // Invalid matrix, return all indices
        return (0..count as u32).collect();
    }

    let mut visible_indices = Vec::new();

    // Extract and normalize frustum planes
    let planes = extract_frustum_planes(camera_matrix);
    let mut normalized_planes = planes;
    for plane in &mut normalized_planes {
        normalize_plane(plane);
    }

    // Check each star
    for i in 0..count {
        let i3 = i * 3;
        let x = positions[i3];
        let y = positions[i3 + 1];
        let z = positions[i3 + 2];

        let mut inside = true;

        for plane in &normalized_planes {
            let distance = plane[0] * x + plane[1] * y + plane[2] * z + plane[3];

            if distance < -margin {
                inside = false;
                break;
            }
        }

        if inside {
            visible_indices.push(i as u32);
        }
    }

    visible_indices
}

// Enhanced SIMD batch processing for LOD groups
#[wasm_bindgen]
pub fn calculate_star_effects_by_lod(
    near_positions: &[f32],
    near_count: usize,
    medium_positions: &[f32],
    medium_count: usize,
    far_positions: &[f32],
    far_count: usize,
    time: f32,
    quality_tier: u32,
) -> Vec<f32> {
    // Initialize SIMD
    init_sin_table();

    let total_count = near_count + medium_count + far_count;
    let mut effects = Vec::with_capacity(total_count * 2);

    // Process based on quality tier
    match quality_tier {
        0 => {
            // Performance tier: Simple effects for all
            process_star_group(near_positions, near_count, time, 2, &mut effects);
            process_star_group(medium_positions, medium_count, time, 2, &mut effects);
            process_star_group(far_positions, far_count, time, 3, &mut effects);
        }
        1 => {
            // Balanced tier: Full for near, simple for medium/far
            process_star_group(near_positions, near_count, time, 0, &mut effects);
            process_star_group(medium_positions, medium_count, time, 2, &mut effects);
            process_star_group(far_positions, far_count, time, 3, &mut effects);
        }
        _ => {
            // Ultra tier: Full for near/medium, simple for far
            process_star_group(near_positions, near_count, time, 0, &mut effects);
            process_star_group(medium_positions, medium_count, time, 0, &mut effects);
            process_star_group(far_positions, far_count, time, 2, &mut effects);
        }
    }

    effects
}

// Process a single star group with specified quality mode
fn process_star_group(
    positions: &[f32],
    count: usize,
    time: f32,
    quality_mode: u32,
    effects: &mut Vec<f32>,
) {
    // Always use SIMD version
    process_star_group_simd(positions, count, time, quality_mode, effects);
}

// Simple quality effects with SIMD (basic twinkle only)
fn process_simple_effects_simd(
    positions: &[f32],
    count: usize,
    time: f32,
    effects: &mut Vec<f32>,
    sin_table: &[f32],
) {
    // Process 16 stars at once (2x f32x8)
    const CHUNK_SIZE: usize = 16;

    let time_2 = time * 2.0;
    let time_2_vec = f32x8::splat(time_2);
    let factor_5 = f32x8::splat(5.0);
    let twinkle_scale = f32x8::splat(0.2);
    let twinkle_offset = f32x8::splat(0.8);

    let chunks = count / CHUNK_SIZE;

    // Prefetch next chunk while processing current
    for chunk in 0..chunks {
        let base = chunk * CHUNK_SIZE;

        // Process first 8
        let mut x_values = [0.0f32; 8];
        let mut y_values = [0.0f32; 8];

        for i in 0..8 {
            let i3 = (base + i) * 3;
            x_values[i] = positions[i3];
            y_values[i] = positions[i3 + 1];
        }

        let x_vec = f32x8::from_array(x_values);
        let y_vec = f32x8::from_array(y_values);

        let twinkle_arg = time_2_vec + x_vec * factor_5 + y_vec * factor_5;
        let twinkle_vec =
            simd_sin_lookup_batch(twinkle_arg, sin_table) * twinkle_scale + twinkle_offset;

        let twinkle_arr: [f32; 8] = twinkle_vec.to_array();

        for i in 0..8 {
            effects.push(twinkle_arr[i]);
            effects.push(0.0);
        }

        // Process second 8
        for i in 0..8 {
            let i3 = (base + 8 + i) * 3;
            x_values[i] = positions[i3];
            y_values[i] = positions[i3 + 1];
        }

        let x_vec = f32x8::from_array(x_values);
        let y_vec = f32x8::from_array(y_values);

        // Simple twinkle calculation
        let twinkle_arg = time_2_vec + x_vec * factor_5 + y_vec * factor_5;
        let twinkle_vec =
            simd_sin_lookup_batch(twinkle_arg, sin_table) * twinkle_scale + twinkle_offset;

        let twinkle_arr: [f32; 8] = twinkle_vec.to_array();

        // No sparkle for simple mode
        for i in 0..8 {
            effects.push(twinkle_arr[i]);
            effects.push(0.0);
        }
    }

    // Process remaining
    let remaining_start = chunks * 16;
    for i in remaining_start..count {
        let i3 = i * 3;
        let x = positions[i3];
        let y = positions[i3 + 1];

        let twinkle = fast_sin_lookup(time * 2.0 + x * 5.0 + y * 5.0) * 0.2 + 0.8;
        effects.push(twinkle);
        effects.push(0.0);
    }
}

// SIMD-optimized frustum culling for better performance
#[wasm_bindgen]
pub fn cull_stars_by_frustum_simd(
    positions: &[f32],
    count: usize,
    camera_matrix: &[f32],
    margin: f32,
) -> Vec<u8> {
    if camera_matrix.len() != 16 {
        return vec![1; count];
    }

    let mut visibility_mask = vec![0u8; count];

    // Extract and normalize frustum planes
    let m = camera_matrix;
    let planes = [
        [m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]],
        [m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]],
        [m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]],
        [m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]],
        [m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]],
        [m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]],
    ];

    let mut normalized_planes = [[0.0f32; 4]; 6];
    for (i, plane) in planes.iter().enumerate() {
        let length = (plane[0] * plane[0] + plane[1] * plane[1] + plane[2] * plane[2]).sqrt();
        if length > 0.0 {
            normalized_planes[i] = [
                plane[0] / length,
                plane[1] / length,
                plane[2] / length,
                plane[3] / length,
            ];
        }
    }

    // Process in SIMD batches
    let chunks = count / 4; // Process 4 stars at a time with f32x4
    let neg_margin = f32x4::splat(-margin);

    for chunk in 0..chunks {
        let base_idx = chunk * 4;

        // Load 4 star positions
        let mut x_arr = [0.0f32; 4];
        let mut y_arr = [0.0f32; 4];
        let mut z_arr = [0.0f32; 4];

        for i in 0..4 {
            let i3 = (base_idx + i) * 3;
            x_arr[i] = positions[i3];
            y_arr[i] = positions[i3 + 1];
            z_arr[i] = positions[i3 + 2];
        }

        let x_vec = f32x4::from_array(x_arr);
        let y_vec = f32x4::from_array(y_arr);
        let z_vec = f32x4::from_array(z_arr);

        let mut inside_vec = f32x4::splat(1.0);

        // Test against each plane
        for plane in &normalized_planes {
            let plane_x = f32x4::splat(plane[0]);
            let plane_y = f32x4::splat(plane[1]);
            let plane_z = f32x4::splat(plane[2]);
            let plane_w = f32x4::splat(plane[3]);

            let distance = plane_x * x_vec + plane_y * y_vec + plane_z * z_vec + plane_w;
            let outside_mask = distance.simd_lt(neg_margin);

            // Update inside status
            inside_vec = inside_vec * outside_mask.select(f32x4::splat(0.0), f32x4::splat(1.0));
        }

        // Store results
        let inside_arr: [f32; 4] = inside_vec.to_array();
        for i in 0..4 {
            visibility_mask[base_idx + i] = if inside_arr[i] > 0.5 { 1 } else { 0 };
        }
    }

    // Process remaining stars
    for i in chunks * 4..count {
        let i3 = i * 3;
        let x = positions[i3];
        let y = positions[i3 + 1];
        let z = positions[i3 + 2];

        let mut inside = true;

        for plane in &normalized_planes {
            let distance = plane[0] * x + plane[1] * y + plane[2] * z + plane[3];

            if distance < -margin {
                inside = false;
                break;
            }
        }

        visibility_mask[i] = if inside { 1 } else { 0 };
    }

    visibility_mask
}

// Temporal coherence optimization - update only stars that have changed significantly
#[wasm_bindgen]
pub fn calculate_star_effects_with_temporal_coherence(
    positions: &[f32],
    previous_twinkles: &[f32],
    previous_sparkles: &[f32],
    count: usize,
    time: f32,
    threshold: f32,
) -> Vec<f32> {
    // Result format: [need_update_flag, twinkle, sparkle] triplets
    let mut results = Vec::with_capacity(count * 3);

    for i in 0..count {
        let i3 = i * 3;
        let x = positions[i3];
        let y = positions[i3 + 1];

        // Calculate new effects
        let twinkle_base = fast_sin_lookup(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;
        let sparkle_phase = fast_sin_lookup(time * 15.0 + x * 20.0 + y * 30.0);
        let sparkle = if sparkle_phase > 0.98 {
            (sparkle_phase - 0.98) / 0.02
        } else {
            0.0
        };
        let twinkle = twinkle_base + sparkle;

        // Check if update is needed
        let twinkle_diff = (twinkle - previous_twinkles[i]).abs();
        let sparkle_diff = (sparkle - previous_sparkles[i]).abs();

        let needs_update = twinkle_diff > threshold || sparkle_diff > threshold;

        results.push(if needs_update { 1.0 } else { 0.0 });
        results.push(twinkle);
        results.push(sparkle);
    }

    results
}

// Get indices of stars that need updating based on temporal coherence
#[wasm_bindgen]
pub fn get_stars_needing_update(
    positions: &[f32],
    previous_twinkles: &[f32],
    previous_sparkles: &[f32],
    count: usize,
    time: f32,
    threshold: f32,
) -> Vec<u32> {
    let mut indices = Vec::new();

    for i in 0..count {
        let i3 = i * 3;
        let x = positions[i3];
        let y = positions[i3 + 1];

        // Calculate new effects
        let twinkle_base = fast_sin_lookup(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;
        let sparkle_phase = fast_sin_lookup(time * 15.0 + x * 20.0 + y * 30.0);
        let sparkle = if sparkle_phase > 0.98 {
            (sparkle_phase - 0.98) / 0.02
        } else {
            0.0
        };
        let twinkle = twinkle_base + sparkle;

        // Check if update is needed
        let twinkle_diff = (twinkle - previous_twinkles[i]).abs();
        let sparkle_diff = (sparkle - previous_sparkles[i]).abs();

        if twinkle_diff > threshold || sparkle_diff > threshold {
            indices.push(i as u32);
        }
    }

    indices
}

// SIMD-optimized temporal coherence check
#[wasm_bindgen]
pub fn calculate_star_effects_temporal_simd(
    positions: &[f32],
    previous_twinkles: &[f32],
    previous_sparkles: &[f32],
    count: usize,
    time: f32,
    threshold: f32,
) -> Vec<f32> {
    let mut results = Vec::with_capacity(count * 3);

    // Pre-compute common factors
    let time_3 = time * 3.0;
    let time_15 = time * 15.0;
    let time_3_vec = f32x8::splat(time_3);
    let time_15_vec = f32x8::splat(time_15);
    let factor_10 = f32x8::splat(10.0);
    let factor_20 = f32x8::splat(20.0);
    let factor_30 = f32x8::splat(30.0);
    let twinkle_scale = f32x8::splat(0.3);
    let twinkle_offset = f32x8::splat(0.7);
    let sparkle_threshold = f32x8::splat(0.98);
    let sparkle_scale = f32x8::splat(50.0); // 1.0 / 0.02
    let threshold_vec = f32x8::splat(threshold);
    let zero = f32x8::splat(0.0);
    let one = f32x8::splat(1.0);

    // Get sin table reference
    let sin_table = get_sin_table();

    // Process in batches of 8
    let chunks = count / 8;

    for chunk in 0..chunks {
        let base = chunk * 8;

        // Load positions
        let mut x_values = [0.0f32; 8];
        let mut y_values = [0.0f32; 8];

        for i in 0..8 {
            let i3 = (base + i) * 3;
            x_values[i] = positions[i3];
            y_values[i] = positions[i3 + 1];
        }

        let x_vec = f32x8::from_array(x_values);
        let y_vec = f32x8::from_array(y_values);

        // Calculate twinkle
        let twinkle_arg = time_3_vec + x_vec * factor_10 + y_vec * factor_10;
        let twinkle_base_vec =
            simd_sin_lookup_batch(twinkle_arg, sin_table) * twinkle_scale + twinkle_offset;

        // Calculate sparkle
        let sparkle_arg = time_15_vec + x_vec * factor_20 + y_vec * factor_30;
        let sparkle_phase_vec = simd_sin_lookup_batch(sparkle_arg, sin_table);
        let sparkle_mask = sparkle_phase_vec.simd_gt(sparkle_threshold);
        let sparkle_vec = sparkle_mask.select(
            (sparkle_phase_vec - sparkle_threshold) * sparkle_scale,
            zero,
        );

        let twinkle_vec = twinkle_base_vec + sparkle_vec;

        // Load previous values
        let mut prev_twinkle_arr = [0.0f32; 8];
        let mut prev_sparkle_arr = [0.0f32; 8];
        prev_twinkle_arr.copy_from_slice(&previous_twinkles[base..base + 8]);
        prev_sparkle_arr.copy_from_slice(&previous_sparkles[base..base + 8]);
        let prev_twinkles = f32x8::from_array(prev_twinkle_arr);
        let prev_sparkles = f32x8::from_array(prev_sparkle_arr);

        // Calculate differences
        let twinkle_diff = (twinkle_vec - prev_twinkles).abs();
        let sparkle_diff = (sparkle_vec - prev_sparkles).abs();

        // Check if update needed
        let needs_update_mask =
            twinkle_diff.simd_gt(threshold_vec) | sparkle_diff.simd_gt(threshold_vec);
        let needs_update_vec = needs_update_mask.select(one, zero);

        // Store results
        let needs_update_arr: [f32; 8] = needs_update_vec.to_array();
        let twinkle_arr: [f32; 8] = twinkle_vec.to_array();
        let sparkle_arr: [f32; 8] = sparkle_vec.to_array();

        for i in 0..8 {
            results.push(needs_update_arr[i]);
            results.push(twinkle_arr[i]);
            results.push(sparkle_arr[i]);
        }
    }

    // Process remaining
    for i in chunks * 8..count {
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
        let twinkle = twinkle_base + sparkle;

        let twinkle_diff = (twinkle - previous_twinkles[i]).abs();
        let sparkle_diff = (sparkle - previous_sparkles[i]).abs();

        let needs_update = twinkle_diff > threshold || sparkle_diff > threshold;

        results.push(if needs_update { 1.0 } else { 0.0 });
        results.push(twinkle);
        results.push(sparkle);
    }

    results
}

// LOD (Level of Detail) distribution calculations
#[wasm_bindgen]
pub fn calculate_lod_distribution(total_count: usize, quality_tier: u32) -> Vec<u32> {
    // Distribution ratios for each quality tier
    let (near_ratio, medium_ratio) = match quality_tier {
        0 => (0.1, 0.3),   // Performance: 10% near, 30% medium, 60% far
        1 => (0.15, 0.35), // Balanced: 15% near, 35% medium, 50% far
        _ => (0.2, 0.4),   // Ultra: 20% near, 40% medium, 40% far
    };

    let near_count = (total_count as f32 * near_ratio).floor() as u32;
    let medium_count = (total_count as f32 * medium_ratio).floor() as u32;
    let far_count = total_count as u32 - near_count - medium_count;

    // Return [near_count, medium_count, far_count]
    vec![near_count, medium_count, far_count]
}

// Frame update result structure
#[wasm_bindgen]
pub struct FrameUpdateResult {
    pub visible_count: usize,
    pub positions_dirty: bool,
    pub effects_dirty: bool,
    pub culling_dirty: bool,
}

// In-place frame update using shared memory
#[wasm_bindgen]
pub fn update_frame_simd(
    time: f32,
    delta_time: f32,
    camera_matrix_ptr: *const f32,
    is_moving: bool,
    click_time: f32,
    current_speed_multiplier: f32,
) -> FrameUpdateResult {
    STAR_MEMORY_POOL.with(|pool_cell| {
        if let Some(pool) = pool_cell.borrow_mut().as_mut() {
            // All computation happens in-place on WASM memory
            let count = pool.count;

            // 1. Update speed multiplier
            let speed_multiplier = calculate_speed_multiplier(
                is_moving,
                click_time as f64,
                time as f64,
                current_speed_multiplier,
            );

            // 2. SIMD effects calculations (direct memory writes) - now safe!
            calculate_effects_into_buffers_simd(
                &pool.positions,
                &mut pool.twinkles,
                &mut pool.sparkles,
                count,
                time,
            );

            // 3. SIMD frustum culling if camera matrix provided
            // Note: Currently camera matrix is always null (disabled) from TypeScript
            let visible_count = if !camera_matrix_ptr.is_null() {
                // TODO: Implement safe camera matrix handling when needed
                // For now, treat as if no camera matrix provided
                count
            } else {
                count // All visible if no camera matrix
            };

            FrameUpdateResult {
                visible_count,
                positions_dirty: true,
                effects_dirty: true,
                culling_dirty: false, // No culling performed currently
            }
        } else {
            // Pool not initialized
            FrameUpdateResult {
                visible_count: 0,
                positions_dirty: false,
                effects_dirty: false,
                culling_dirty: false,
            }
        }
    })
}
