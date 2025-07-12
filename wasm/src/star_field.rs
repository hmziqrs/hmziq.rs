use std::cell::RefCell;
use std::f32::consts::PI;
use wasm_bindgen::prelude::*;

// Import math utilities
use crate::math::{fast_sin_lookup, seed_random, seed_random_simd_batch};

// Note: init_sin_table no longer needed as sin lookup is now handled internally

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
    // Pure Structure-of-Arrays for optimal SIMD cache efficiency
    positions_x: Vec<f32>,    // [x1, x2, x3, x4, x5, x6, x7, x8, ...] - sequential for SIMD
    positions_y: Vec<f32>,    // [y1, y2, y3, y4, y5, y6, y7, y8, ...] - sequential for SIMD
    positions_z: Vec<f32>,    // [z1, z2, z3, z4, z5, z6, z7, z8, ...] - sequential for SIMD
    
    colors_r: Vec<f32>,       // [r1, r2, r3, r4, r5, r6, r7, r8, ...] - sequential for SIMD
    colors_g: Vec<f32>,       // [g1, g2, g3, g4, g5, g6, g7, g8, ...] - sequential for SIMD
    colors_b: Vec<f32>,       // [b1, b2, b3, b4, b5, b6, b7, b8, ...] - sequential for SIMD
    
    sizes: Vec<f32>,          // [size1, size2, size3, ...] - already optimal
    twinkles: Vec<f32>,       // [twinkle1, twinkle2, ...] - computed values
    sparkles: Vec<f32>,       // [sparkle1, sparkle2, ...] - computed values
    visibility_mask: Vec<u8>, // [visible1, visible2, ...] - culling results

    // Metadata
    count: usize,
}

impl StarMemoryPool {
    fn new(count: usize) -> Self {
        // Ensure count is aligned to SIMD batch size for optimal performance
        let aligned_count = (count + SIMD_BATCH_SIZE - 1) / SIMD_BATCH_SIZE * SIMD_BATCH_SIZE;
        
        Self {
            // Initialize pure SoA arrays for optimal SIMD computation
            positions_x: Self::create_aligned_vec(aligned_count, 0.0),
            positions_y: Self::create_aligned_vec(aligned_count, 0.0),
            positions_z: Self::create_aligned_vec(aligned_count, 0.0),
            colors_r: Self::create_aligned_vec(aligned_count, 1.0),
            colors_g: Self::create_aligned_vec(aligned_count, 1.0),
            colors_b: Self::create_aligned_vec(aligned_count, 1.0),
            sizes: Self::create_aligned_vec(aligned_count, 1.0),
            twinkles: Self::create_aligned_vec(aligned_count, 1.0),
            sparkles: Self::create_aligned_vec(aligned_count, 0.0),
            visibility_mask: vec![1; aligned_count],
            count, // Keep original count for indexing
        }
    }
    
    // Create a Vec aligned to 32-byte boundaries for optimal AVX performance
    fn create_aligned_vec(size: usize, default_value: f32) -> Vec<f32> {
        // For WASM, simple vec! is sufficient as WASM doesn't have complex alignment requirements
        // In native code, we would use more sophisticated alignment
        vec![default_value; size]
    }

    fn get_pointers(&mut self) -> StarMemoryPointers {
        StarMemoryPointers {
            // Return pointers to SoA arrays directly - no more interleaved arrays!
            positions_x_ptr: self.positions_x.as_mut_ptr() as u32,
            positions_y_ptr: self.positions_y.as_mut_ptr() as u32, 
            positions_z_ptr: self.positions_z.as_mut_ptr() as u32,
            colors_r_ptr: self.colors_r.as_mut_ptr() as u32,
            colors_g_ptr: self.colors_g.as_mut_ptr() as u32,
            colors_b_ptr: self.colors_b.as_mut_ptr() as u32,
            sizes_ptr: self.sizes.as_mut_ptr() as u32,
            twinkles_ptr: self.twinkles.as_mut_ptr() as u32,
            sparkles_ptr: self.sparkles.as_mut_ptr() as u32,
            visibility_ptr: self.visibility_mask.as_mut_ptr() as u32,
            count: self.count,
            // All SoA arrays have the same length (aligned count)
            positions_x_length: self.positions_x.len(),
            positions_y_length: self.positions_y.len(),
            positions_z_length: self.positions_z.len(),
            colors_r_length: self.colors_r.len(),
            colors_g_length: self.colors_g.len(),
            colors_b_length: self.colors_b.len(),
            sizes_length: self.sizes.len(),
            twinkles_length: self.twinkles.len(),
            sparkles_length: self.sparkles.len(),
            visibility_length: self.visibility_mask.len(),
        }
    }
}

#[wasm_bindgen]
pub struct StarMemoryPointers {
    // Separate pointers for Structure-of-Arrays layout
    pub positions_x_ptr: u32,
    pub positions_y_ptr: u32,
    pub positions_z_ptr: u32,
    pub colors_r_ptr: u32,
    pub colors_g_ptr: u32,
    pub colors_b_ptr: u32,
    pub sizes_ptr: u32,
    pub twinkles_ptr: u32,
    pub sparkles_ptr: u32,
    pub visibility_ptr: u32,
    pub count: usize,
    // Separate lengths for each SoA array
    pub positions_x_length: usize,
    pub positions_y_length: usize,
    pub positions_z_length: usize,
    pub colors_r_length: usize,
    pub colors_g_length: usize,
    pub colors_b_length: usize,
    pub sizes_length: usize,
    pub twinkles_length: usize,
    pub sparkles_length: usize,
    pub visibility_length: usize,
}

// SIMD sin lookup helper function
fn simd_sin_lookup_batch(values: f32x8) -> f32x8 {
    // Extract individual values and perform lookups using fast_sin_lookup
    let values_arr: [f32; 8] = values.to_array();
    let mut results = [0.0f32; 8];

    for (i, &val) in values_arr.iter().enumerate() {
        results[i] = fast_sin_lookup(val);
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

// SIMD color generation - generates directly into SoA arrays for maximum performance
fn generate_star_colors_simd_direct(
    colors_r: &mut [f32],
    colors_g: &mut [f32],
    colors_b: &mut [f32],
    count: usize,
) {
    use std::simd::{f32x8, mask32x8, Simd};
    
    // Color constants as SIMD vectors
    let white_r = f32x8::splat(1.0);
    let white_g = f32x8::splat(1.0);
    let white_b = f32x8::splat(1.0);
    
    let blue_r = f32x8::splat(0.6);
    let blue_g = f32x8::splat(0.8);
    let blue_b = f32x8::splat(1.0);
    
    let yellow_r = f32x8::splat(1.0);
    let yellow_g = f32x8::splat(0.8);
    let yellow_b = f32x8::splat(0.4);
    
    let purple_r = f32x8::splat(0.8);
    let purple_g = f32x8::splat(0.6);
    let purple_b = f32x8::splat(1.0);
    
    // Threshold constants
    let threshold_50 = f32x8::splat(0.5);
    let threshold_70 = f32x8::splat(0.7);
    let threshold_85 = f32x8::splat(0.85);
    
    // Process in batches of 8 stars
    let chunks = count / SIMD_BATCH_SIZE;
    
    for chunk in 0..chunks {
        let base_idx = chunk * SIMD_BATCH_SIZE;
        let start_index = base_idx as i32;
        
        // Generate 8 color choice values
        let color_choice = seed_random_simd_batch(start_index + 3000);
        
        // Create masks for each color category
        let is_white = color_choice.simd_lt(threshold_50);
        let is_blue = color_choice.simd_ge(threshold_50) & color_choice.simd_lt(threshold_70);
        let is_yellow = color_choice.simd_ge(threshold_70) & color_choice.simd_lt(threshold_85);
        // Purple is everything else (>= 0.85)
        
        // Select colors using SIMD masks
        let mut result_r = purple_r; // Default to purple
        let mut result_g = purple_g;
        let mut result_b = purple_b;
        
        // Apply colors in reverse order (purple -> yellow -> blue -> white)
        result_r = is_yellow.select(yellow_r, result_r);
        result_g = is_yellow.select(yellow_g, result_g);
        result_b = is_yellow.select(yellow_b, result_b);
        
        result_r = is_blue.select(blue_r, result_r);
        result_g = is_blue.select(blue_g, result_g);
        result_b = is_blue.select(blue_b, result_b);
        
        result_r = is_white.select(white_r, result_r);
        result_g = is_white.select(white_g, result_g);
        result_b = is_white.select(white_b, result_b);
        
        // Store directly into SoA arrays (zero-copy!)
        result_r.copy_to_slice(&mut colors_r[base_idx..base_idx + SIMD_BATCH_SIZE]);
        result_g.copy_to_slice(&mut colors_g[base_idx..base_idx + SIMD_BATCH_SIZE]);
        result_b.copy_to_slice(&mut colors_b[base_idx..base_idx + SIMD_BATCH_SIZE]);
    }
    
    // Handle remaining stars (count % 8) using scalar fallback
    let remaining = count % SIMD_BATCH_SIZE;
    if remaining > 0 {
        let base_idx = chunks * SIMD_BATCH_SIZE;
        for i in 0..remaining {
            let global_index = (base_idx + i) as i32;
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
            
            colors_r[base_idx + i] = r;
            colors_g[base_idx + i] = g;
            colors_b[base_idx + i] = b;
        }
    }
}

// SIMD size generation - generates directly into SoA arrays for maximum performance
fn generate_star_sizes_simd_direct(
    sizes: &mut [f32],
    count: usize,
    size_multiplier: f32,
) {
    use std::simd::{f32x8, mask32x8};
    
    // Size calculation constants
    let threshold_70 = f32x8::splat(0.7);
    let small_base = f32x8::splat(1.0);
    let small_range = f32x8::splat(1.5);
    let large_base = f32x8::splat(2.5);
    let large_range = f32x8::splat(2.0);
    let multiplier = f32x8::splat(size_multiplier);
    
    // Process in batches of 8 stars
    let chunks = count / SIMD_BATCH_SIZE;
    
    for chunk in 0..chunks {
        let base_idx = chunk * SIMD_BATCH_SIZE;
        let start_index = base_idx as i32;
        
        // Generate 8 size choice values
        let size_random = seed_random_simd_batch(start_index + 4000);
        
        // Generate additional random values for size calculation
        let small_random = seed_random_simd_batch(start_index + 5000);
        let large_random = seed_random_simd_batch(start_index + 6000);
        
        // Calculate small star sizes: 1.0 + random * 1.5
        let small_sizes = small_base + small_random * small_range;
        
        // Calculate large star sizes: 2.5 + random * 2.0  
        let large_sizes = large_base + large_random * large_range;
        
        // Create mask for small vs large stars
        let is_small = size_random.simd_lt(threshold_70);
        
        // Select between small and large sizes
        let base_sizes = is_small.select(small_sizes, large_sizes);
        
        // Apply size multiplier
        let final_sizes = base_sizes * multiplier;
        
        // Store directly into SoA array (zero-copy!)
        final_sizes.copy_to_slice(&mut sizes[base_idx..base_idx + SIMD_BATCH_SIZE]);
    }
    
    // Handle remaining stars (count % 8) using scalar fallback
    let remaining = count % SIMD_BATCH_SIZE;
    if remaining > 0 {
        let base_idx = chunks * SIMD_BATCH_SIZE;
        for i in 0..remaining {
            let global_index = (base_idx + i) as i32;
            let size_random = seed_random(global_index + 4000);
            let base_size = if size_random < 0.7 {
                1.0 + seed_random(global_index + 5000) * 1.5
            } else {
                2.5 + seed_random(global_index + 6000) * 2.0
            };
            sizes[base_idx + i] = base_size * size_multiplier;
        }
    }
}

// SIMD star generation - generates directly into SoA arrays for maximum performance
fn generate_star_positions_simd_direct(
    positions_x: &mut [f32],
    positions_y: &mut [f32], 
    positions_z: &mut [f32],
    count: usize,
    min_radius: f32,
    max_radius: f32,
) {
    let radius_range = max_radius - min_radius;
    let min_radius_vec = f32x8::splat(min_radius);
    let radius_range_vec = f32x8::splat(radius_range);
    let pi2_vec = f32x8::splat(PI * 2.0);
    let two_vec = f32x8::splat(2.0);
    let one_vec = f32x8::splat(1.0);
    
    // Process in batches of 8 stars
    let chunks = count / SIMD_BATCH_SIZE;
    
    for chunk in 0..chunks {
        let base_idx = chunk * SIMD_BATCH_SIZE;
        let start_index = base_idx as i32;
        
        // Generate 8 radius values
        let radius_rand = seed_random_simd_batch(start_index);
        let radius_vec = min_radius_vec + radius_rand * radius_range_vec;
        
        // Generate 8 theta values (azimuthal angle)
        let theta_rand = seed_random_simd_batch(start_index + 1000);
        let theta_vec = theta_rand * pi2_vec;
        
        // Generate 8 phi values (polar angle) - acos for proper sphere distribution
        let phi_rand = seed_random_simd_batch(start_index + 2000);
        let phi_input = two_vec * phi_rand - one_vec; // Convert [0,1] to [-1,1]
        
        // SIMD acos approximation (more complex, using individual calls for now)
        let phi_values = f32x8::from_array([
            phi_input.as_array()[0].acos(),
            phi_input.as_array()[1].acos(),
            phi_input.as_array()[2].acos(),
            phi_input.as_array()[3].acos(),
            phi_input.as_array()[4].acos(),
            phi_input.as_array()[5].acos(),
            phi_input.as_array()[6].acos(),
            phi_input.as_array()[7].acos(),
        ]);
        
        // Convert spherical to cartesian coordinates using SIMD
        // For sin/cos, use individual lookups for now (can optimize later)
        let sin_phi = f32x8::from_array([
            fast_sin_lookup(phi_values.as_array()[0]),
            fast_sin_lookup(phi_values.as_array()[1]),
            fast_sin_lookup(phi_values.as_array()[2]),
            fast_sin_lookup(phi_values.as_array()[3]),
            fast_sin_lookup(phi_values.as_array()[4]),
            fast_sin_lookup(phi_values.as_array()[5]),
            fast_sin_lookup(phi_values.as_array()[6]),
            fast_sin_lookup(phi_values.as_array()[7]),
        ]);
        
        let cos_phi = f32x8::from_array([
            fast_sin_lookup(phi_values.as_array()[0] + PI / 2.0),
            fast_sin_lookup(phi_values.as_array()[1] + PI / 2.0),
            fast_sin_lookup(phi_values.as_array()[2] + PI / 2.0),
            fast_sin_lookup(phi_values.as_array()[3] + PI / 2.0),
            fast_sin_lookup(phi_values.as_array()[4] + PI / 2.0),
            fast_sin_lookup(phi_values.as_array()[5] + PI / 2.0),
            fast_sin_lookup(phi_values.as_array()[6] + PI / 2.0),
            fast_sin_lookup(phi_values.as_array()[7] + PI / 2.0),
        ]);
        
        let sin_theta = f32x8::from_array([
            fast_sin_lookup(theta_vec.as_array()[0]),
            fast_sin_lookup(theta_vec.as_array()[1]),
            fast_sin_lookup(theta_vec.as_array()[2]),
            fast_sin_lookup(theta_vec.as_array()[3]),
            fast_sin_lookup(theta_vec.as_array()[4]),
            fast_sin_lookup(theta_vec.as_array()[5]),
            fast_sin_lookup(theta_vec.as_array()[6]),
            fast_sin_lookup(theta_vec.as_array()[7]),
        ]);
        
        let cos_theta = f32x8::from_array([
            fast_sin_lookup(theta_vec.as_array()[0] + PI / 2.0),
            fast_sin_lookup(theta_vec.as_array()[1] + PI / 2.0),
            fast_sin_lookup(theta_vec.as_array()[2] + PI / 2.0),
            fast_sin_lookup(theta_vec.as_array()[3] + PI / 2.0),
            fast_sin_lookup(theta_vec.as_array()[4] + PI / 2.0),
            fast_sin_lookup(theta_vec.as_array()[5] + PI / 2.0),
            fast_sin_lookup(theta_vec.as_array()[6] + PI / 2.0),
            fast_sin_lookup(theta_vec.as_array()[7] + PI / 2.0),
        ]);
        
        // Calculate cartesian coordinates using SIMD
        let x_vec = radius_vec * sin_phi * cos_theta;
        let y_vec = radius_vec * sin_phi * sin_theta;
        let z_vec = radius_vec * cos_phi;
        
        // Store directly into SoA arrays (zero-copy!)
        x_vec.copy_to_slice(&mut positions_x[base_idx..base_idx + SIMD_BATCH_SIZE]);
        y_vec.copy_to_slice(&mut positions_y[base_idx..base_idx + SIMD_BATCH_SIZE]);
        z_vec.copy_to_slice(&mut positions_z[base_idx..base_idx + SIMD_BATCH_SIZE]);
    }
    
    // Handle remaining stars (count % 8) using scalar fallback
    let remaining = count % SIMD_BATCH_SIZE;
    if remaining > 0 {
        let base_idx = chunks * SIMD_BATCH_SIZE;
        for i in 0..remaining {
            let global_index = (base_idx + i) as i32;
            let radius = min_radius + seed_random(global_index) * radius_range;
            let theta = seed_random(global_index + 1000) * PI * 2.0;
            let phi = (2.0 * seed_random(global_index + 2000) - 1.0).acos();
            
            positions_x[base_idx + i] = radius * phi.sin() * theta.cos();
            positions_y[base_idx + i] = radius * phi.sin() * theta.sin();
            positions_z[base_idx + i] = radius * phi.cos();
        }
    }
}

// Initialize persistent memory pool for zero-copy architecture
#[wasm_bindgen]
pub fn initialize_star_memory_pool(count: usize) -> StarMemoryPointers {
    // Create new memory pool
    let mut pool = StarMemoryPool::new(count);

    // PHASE 4: Generate star data directly into SoA format using SIMD (8x faster!)
    // No more AoS → SoA conversion overhead!
    
    // Generate positions directly into SoA arrays using SIMD
    generate_star_positions_simd_direct(
        &mut pool.positions_x,
        &mut pool.positions_y,
        &mut pool.positions_z,
        count,
        20.0,  // min_radius
        150.0, // max_radius
    );
    
    // Generate colors directly into SoA arrays using SIMD (8x faster!)
    generate_star_colors_simd_direct(
        &mut pool.colors_r,
        &mut pool.colors_g,
        &mut pool.colors_b,
        count,
    );
    
    // Generate sizes directly into SoA array using SIMD (8x faster!)
    generate_star_sizes_simd_direct(
        &mut pool.sizes,
        count,
        1.0, // size_multiplier
    );

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

// SIMD version for batch processing with Structure-of-Arrays
fn calculate_effects_into_buffers_simd(
    positions_x: &[f32],
    positions_y: &[f32],
    twinkles: &mut [f32],
    sparkles: &mut [f32],
    count: usize,
    time: f32,
) {
    // Pre-calculate time factors
    let time_3 = time * 3.0;
    let time_15 = time * 15.0;

    // Process in batches of 8
    let chunks = count / SIMD_BATCH_SIZE;

    for chunk in 0..chunks {
        let base_idx = chunk * SIMD_BATCH_SIZE;

        // Load positions using efficient sequential access (SoA advantage!)
        let x_slice = &positions_x[base_idx..base_idx + SIMD_BATCH_SIZE];
        let y_slice = &positions_y[base_idx..base_idx + SIMD_BATCH_SIZE];

        let x_vec = f32x8::from_slice(x_slice);
        let y_vec = f32x8::from_slice(y_slice);

        // Twinkle calculation
        let time_3_vec = f32x8::splat(time_3);
        let factor_10 = f32x8::splat(10.0);
        let twinkle_arg = time_3_vec + x_vec * factor_10 + y_vec * factor_10;
        let twinkle_sin = simd_sin_lookup_batch(twinkle_arg);
        let twinkle_scale = f32x8::splat(0.3);
        let twinkle_offset = f32x8::splat(0.7);
        let twinkle_base = twinkle_sin * twinkle_scale + twinkle_offset;

        // Sparkle calculation
        let time_15_vec = f32x8::splat(time_15);
        let factor_20 = f32x8::splat(20.0);
        let factor_30 = f32x8::splat(30.0);
        let sparkle_arg = time_15_vec + x_vec * factor_20 + y_vec * factor_30;
        let sparkle_phase = simd_sin_lookup_batch(sparkle_arg);

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
        // Direct access to SoA arrays - no stride calculation needed!
        let x = positions_x[i];
        let y = positions_y[i];

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
    match quality_mode {
        0 => process_simple_effects_simd(positions, count, time, effects),
        1 => process_medium_effects_simd(positions, count, time, effects),
        _ => process_full_effects_simd(positions, count, time, effects),
    }
}

// Full quality effects with SIMD
fn process_full_effects_simd(positions: &[f32], count: usize, time: f32, effects: &mut Vec<f32>) {
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
        let twinkle_base_vec = simd_sin_lookup_batch(twinkle_arg) * twinkle_scale + twinkle_offset;

        // Sparkle calculation
        let sparkle_arg = time_15_vec + x_vec * factor_20 + y_vec * factor_30;
        let sparkle_phase_vec = simd_sin_lookup_batch(sparkle_arg);
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
fn process_medium_effects_simd(positions: &[f32], count: usize, time: f32, effects: &mut Vec<f32>) {
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
        let twinkle_vec = simd_sin_lookup_batch(twinkle_arg) * twinkle_scale + twinkle_offset;

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

// Note: get_sin_table() helper function has been removed as we now use fast_sin_lookup directly

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
fn process_simple_effects_simd(positions: &[f32], count: usize, time: f32, effects: &mut Vec<f32>) {
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
        let twinkle_vec = simd_sin_lookup_batch(twinkle_arg) * twinkle_scale + twinkle_offset;

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
        let twinkle_vec = simd_sin_lookup_batch(twinkle_arg) * twinkle_scale + twinkle_offset;

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

    // Note: Sin table no longer needed as we use fast_sin_lookup directly

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
        let twinkle_base_vec = simd_sin_lookup_batch(twinkle_arg) * twinkle_scale + twinkle_offset;

        // Calculate sparkle
        let sparkle_arg = time_15_vec + x_vec * factor_20 + y_vec * factor_30;
        let sparkle_phase_vec = simd_sin_lookup_batch(sparkle_arg);
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
                &pool.positions_x,
                &pool.positions_y,
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
