use std::cell::RefCell;
use std::f32::consts::PI;
use wasm_bindgen::prelude::*;

use crate::math::{fast_sin_lookup_simd_16, seed_random, seed_random_simd_batch_16};

use std::simd::cmp::SimdPartialOrd;
use std::simd::f32x16;

const SIMD_BATCH_SIZE: usize = 16;

// SAFETY: thread_local safe in WASM single-threaded
thread_local! {
    static STAR_MEMORY_POOL: RefCell<Option<StarMemoryPool>> = const { RefCell::new(None) };
}

#[repr(C)]
pub struct StarMemoryPool {
    positions_x: Vec<f32>,
    positions_y: Vec<f32>,
    positions_z: Vec<f32>,
    colors_r: Vec<f32>,
    colors_g: Vec<f32>,
    colors_b: Vec<f32>,
    sizes: Vec<f32>,
    twinkles: Vec<f32>,
    sparkles: Vec<f32>,
    visibility_mask: Vec<u64>, // Bitpacked: 64 stars per u64
    count: usize,
}

impl StarMemoryPool {
    fn new(count: usize) -> Self {
        let aligned_count = count.div_ceil(SIMD_BATCH_SIZE) * SIMD_BATCH_SIZE;

        Self {
            positions_x: Self::create_aligned_vec(aligned_count, 0.0),
            positions_y: Self::create_aligned_vec(aligned_count, 0.0),
            positions_z: Self::create_aligned_vec(aligned_count, 0.0),
            colors_r: Self::create_aligned_vec(aligned_count, 1.0),
            colors_g: Self::create_aligned_vec(aligned_count, 1.0),
            colors_b: Self::create_aligned_vec(aligned_count, 1.0),
            sizes: Self::create_aligned_vec(aligned_count, 1.0),
            twinkles: Self::create_aligned_vec(aligned_count, 1.0),
            sparkles: Self::create_aligned_vec(aligned_count, 0.0),
            visibility_mask: vec![u64::MAX; aligned_count.div_ceil(64)],
            count,
        }
    }

    fn create_aligned_vec(size: usize, default_value: f32) -> Vec<f32> {
        vec![default_value; size]
    }

    fn get_pointers(&mut self) -> StarMemoryPointers {
        StarMemoryPointers {
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

fn simd_sin_lookup_batch_16(values: f32x16) -> f32x16 {
    fast_sin_lookup_simd_16(values)
}

fn generate_star_colors_simd_direct(
    colors_r: &mut [f32],
    colors_g: &mut [f32],
    colors_b: &mut [f32],
    count: usize,
) {
    use std::simd::f32x16;

    let white_r = f32x16::splat(1.0);
    let white_g = f32x16::splat(1.0);
    let white_b = f32x16::splat(1.0);

    let blue_r = f32x16::splat(0.6);
    let blue_g = f32x16::splat(0.8);
    let blue_b = f32x16::splat(1.0);

    let yellow_r = f32x16::splat(1.0);
    let yellow_g = f32x16::splat(0.8);
    let yellow_b = f32x16::splat(0.4);

    let purple_r = f32x16::splat(0.8);
    let purple_g = f32x16::splat(0.6);
    let purple_b = f32x16::splat(1.0);

    let threshold_50 = f32x16::splat(0.5);
    let threshold_70 = f32x16::splat(0.7);
    let threshold_85 = f32x16::splat(0.85);

    let chunks = count / SIMD_BATCH_SIZE;

    for chunk in 0..chunks {
        let base_idx = chunk * SIMD_BATCH_SIZE;
        let start_index = base_idx as i32;

        let color_choice = seed_random_simd_batch_16(start_index + 3000);

        let is_white = color_choice.simd_lt(threshold_50);
        let is_blue = color_choice.simd_ge(threshold_50) & color_choice.simd_lt(threshold_70);
        let is_yellow = color_choice.simd_ge(threshold_70) & color_choice.simd_lt(threshold_85);

        let mut result_r = purple_r;
        let mut result_g = purple_g;
        let mut result_b = purple_b;
        result_r = is_yellow.select(yellow_r, result_r);
        result_g = is_yellow.select(yellow_g, result_g);
        result_b = is_yellow.select(yellow_b, result_b);

        result_r = is_blue.select(blue_r, result_r);
        result_g = is_blue.select(blue_g, result_g);
        result_b = is_blue.select(blue_b, result_b);

        result_r = is_white.select(white_r, result_r);
        result_g = is_white.select(white_g, result_g);
        result_b = is_white.select(white_b, result_b);

        result_r.copy_to_slice(&mut colors_r[base_idx..base_idx + SIMD_BATCH_SIZE]);
        result_g.copy_to_slice(&mut colors_g[base_idx..base_idx + SIMD_BATCH_SIZE]);
        result_b.copy_to_slice(&mut colors_b[base_idx..base_idx + SIMD_BATCH_SIZE]);
    }

    let remaining = count % SIMD_BATCH_SIZE;
    if remaining > 0 {
        let base_idx = chunks * SIMD_BATCH_SIZE;
        for i in 0..remaining {
            let global_index = (base_idx + i) as i32;
            let color_choice = seed_random(global_index + 3000);

            let (r, g, b) = if color_choice < 0.5 {
                (1.0, 1.0, 1.0)
            } else if color_choice < 0.7 {
                (0.6, 0.8, 1.0)
            } else if color_choice < 0.85 {
                (1.0, 0.8, 0.4)
            } else {
                (0.8, 0.6, 1.0)
            };

            colors_r[base_idx + i] = r;
            colors_g[base_idx + i] = g;
            colors_b[base_idx + i] = b;
        }
    }
}

fn generate_star_sizes_simd_direct(sizes: &mut [f32], count: usize, size_multiplier: f32) {
    use std::simd::f32x16;

    let threshold_70 = f32x16::splat(0.7);
    let small_base = f32x16::splat(1.0);
    let small_range = f32x16::splat(1.5);
    let large_base = f32x16::splat(2.5);
    let large_range = f32x16::splat(2.0);
    let multiplier = f32x16::splat(size_multiplier);

    let chunks = count / SIMD_BATCH_SIZE;

    for chunk in 0..chunks {
        let base_idx = chunk * SIMD_BATCH_SIZE;
        let start_index = base_idx as i32;

        let size_random = seed_random_simd_batch_16(start_index + 4000);
        let small_random = seed_random_simd_batch_16(start_index + 5000);
        let large_random = seed_random_simd_batch_16(start_index + 6000);

        let small_sizes = small_base + small_random * small_range;
        let large_sizes = large_base + large_random * large_range;
        let is_small = size_random.simd_lt(threshold_70);
        let base_sizes = is_small.select(small_sizes, large_sizes);
        let final_sizes = base_sizes * multiplier;

        final_sizes.copy_to_slice(&mut sizes[base_idx..base_idx + SIMD_BATCH_SIZE]);
    }

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

fn generate_star_positions_simd_direct(
    positions_x: &mut [f32],
    positions_y: &mut [f32],
    positions_z: &mut [f32],
    count: usize,
    min_radius: f32,
    max_radius: f32,
) {
    let radius_range = max_radius - min_radius;
    let min_radius_vec = f32x16::splat(min_radius);
    let radius_range_vec = f32x16::splat(radius_range);
    let pi2_vec = f32x16::splat(PI * 2.0);
    let two_vec = f32x16::splat(2.0);
    let one_vec = f32x16::splat(1.0);

    // Process 16-star batches
    let chunks = count / SIMD_BATCH_SIZE;

    for chunk in 0..chunks {
        let base_idx = chunk * SIMD_BATCH_SIZE;
        let start_index = base_idx as i32;

        let radius_rand = seed_random_simd_batch_16(start_index);
        let radius_vec = min_radius_vec + radius_rand * radius_range_vec;

        let theta_rand = seed_random_simd_batch_16(start_index + 1000);
        let theta_vec = theta_rand * pi2_vec;

        let phi_rand = seed_random_simd_batch_16(start_index + 2000);
        let phi_input = two_vec * phi_rand - one_vec;

        let phi_values = f32x16::from_array([
            phi_input.as_array()[0].acos(),
            phi_input.as_array()[1].acos(),
            phi_input.as_array()[2].acos(),
            phi_input.as_array()[3].acos(),
            phi_input.as_array()[4].acos(),
            phi_input.as_array()[5].acos(),
            phi_input.as_array()[6].acos(),
            phi_input.as_array()[7].acos(),
            phi_input.as_array()[8].acos(),
            phi_input.as_array()[9].acos(),
            phi_input.as_array()[10].acos(),
            phi_input.as_array()[11].acos(),
            phi_input.as_array()[12].acos(),
            phi_input.as_array()[13].acos(),
            phi_input.as_array()[14].acos(),
            phi_input.as_array()[15].acos(),
        ]);

        let sin_phi = fast_sin_lookup_simd_16(phi_values);
        let cos_phi = fast_sin_lookup_simd_16(phi_values + f32x16::splat(PI / 2.0));
        let sin_theta = fast_sin_lookup_simd_16(theta_vec);
        let cos_theta = fast_sin_lookup_simd_16(theta_vec + f32x16::splat(PI / 2.0));

        let x_vec = radius_vec * sin_phi * cos_theta;
        let y_vec = radius_vec * sin_phi * sin_theta;
        let z_vec = radius_vec * cos_phi;

        x_vec.copy_to_slice(&mut positions_x[base_idx..base_idx + SIMD_BATCH_SIZE]);
        y_vec.copy_to_slice(&mut positions_y[base_idx..base_idx + SIMD_BATCH_SIZE]);
        z_vec.copy_to_slice(&mut positions_z[base_idx..base_idx + SIMD_BATCH_SIZE]);
    }

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

#[wasm_bindgen]
pub fn initialize_star_memory_pool(count: usize) -> StarMemoryPointers {
    let mut pool = StarMemoryPool::new(count);
    generate_star_positions_simd_direct(
        &mut pool.positions_x,
        &mut pool.positions_y,
        &mut pool.positions_z,
        count,
        20.0,
        150.0,
    );

    generate_star_colors_simd_direct(
        &mut pool.colors_r,
        &mut pool.colors_g,
        &mut pool.colors_b,
        count,
    );

    generate_star_sizes_simd_direct(
        &mut pool.sizes,
        count,
        1.0,
    );

    for i in 0..count {
        pool.twinkles[i] = 0.8 + seed_random(i as i32 + 7000) * 0.2;
    }

    let pointers = pool.get_pointers();

    STAR_MEMORY_POOL.with(|pool_cell| {
        *pool_cell.borrow_mut() = Some(pool);
    });

    pointers
}

fn calculate_effects_into_buffers_simd(
    positions_x: &[f32],
    positions_y: &[f32],
    twinkles: &mut [f32],
    sparkles: &mut [f32],
    count: usize,
    time: f32,
) {
    let time_3 = time * 3.0;
    let time_15 = time * 15.0;
    let chunks = count / SIMD_BATCH_SIZE;
    let unrolled_chunks = chunks / 2;
    let remaining_chunks = chunks % 2;
    for unroll_idx in 0..unrolled_chunks {
        let chunk = unroll_idx * 2;
        let base_idx = chunk * SIMD_BATCH_SIZE;

        let x_slice = &positions_x[base_idx..base_idx + SIMD_BATCH_SIZE];
        let y_slice = &positions_y[base_idx..base_idx + SIMD_BATCH_SIZE];

        let x_vec = f32x16::from_slice(x_slice);
        let y_vec = f32x16::from_slice(y_slice);

        let time_3_vec = f32x16::splat(time_3);
        let factor_10 = f32x16::splat(10.0);
        let twinkle_arg = time_3_vec + x_vec * factor_10 + y_vec * factor_10;
        let twinkle_sin = simd_sin_lookup_batch_16(twinkle_arg);
        let twinkle_scale = f32x16::splat(0.3);
        let twinkle_offset = f32x16::splat(0.7);
        let twinkle_base = twinkle_sin * twinkle_scale + twinkle_offset;

        let time_15_vec = f32x16::splat(time_15);
        let factor_20 = f32x16::splat(20.0);
        let factor_30 = f32x16::splat(30.0);
        let sparkle_arg = time_15_vec + x_vec * factor_20 + y_vec * factor_30;
        let sparkle_phase = simd_sin_lookup_batch_16(sparkle_arg);

        let sparkle_threshold = f32x16::splat(0.98);
        let sparkle_scale = f32x16::splat(50.0);
        let sparkle_mask = sparkle_phase.simd_gt(sparkle_threshold);
        let sparkle_values = sparkle_mask.select(
            (sparkle_phase - sparkle_threshold) * sparkle_scale,
            f32x16::splat(0.0),
        );

        let final_twinkle = twinkle_base + sparkle_values;

        let twinkle_array: [f32; SIMD_BATCH_SIZE] = final_twinkle.to_array();
        let sparkle_array: [f32; SIMD_BATCH_SIZE] = sparkle_values.to_array();

        twinkles[base_idx..(SIMD_BATCH_SIZE + base_idx)]
            .copy_from_slice(&twinkle_array[..SIMD_BATCH_SIZE]);
        sparkles[base_idx..(SIMD_BATCH_SIZE + base_idx)]
            .copy_from_slice(&sparkle_array[..SIMD_BATCH_SIZE]);

        let chunk2 = chunk + 1;
        let base_idx2 = chunk2 * SIMD_BATCH_SIZE;

        let x_slice2 = &positions_x[base_idx2..base_idx2 + SIMD_BATCH_SIZE];
        let y_slice2 = &positions_y[base_idx2..base_idx2 + SIMD_BATCH_SIZE];

        let x_vec2 = f32x16::from_slice(x_slice2);
        let y_vec2 = f32x16::from_slice(y_slice2);

        let twinkle_arg2 = time_3_vec + x_vec2 * factor_10 + y_vec2 * factor_10;
        let twinkle_sin2 = simd_sin_lookup_batch_16(twinkle_arg2);
        let twinkle_base2 = twinkle_sin2 * twinkle_scale + twinkle_offset;

        let sparkle_arg2 = time_15_vec + x_vec2 * factor_20 + y_vec2 * factor_30;
        let sparkle_phase2 = simd_sin_lookup_batch_16(sparkle_arg2);
        let sparkle_mask2 = sparkle_phase2.simd_gt(sparkle_threshold);
        let sparkle_values2 = sparkle_mask2.select(
            (sparkle_phase2 - sparkle_threshold) * sparkle_scale,
            f32x16::splat(0.0),
        );

        let final_twinkle2 = twinkle_base2 + sparkle_values2;

        let twinkle_array2: [f32; SIMD_BATCH_SIZE] = final_twinkle2.to_array();
        let sparkle_array2: [f32; SIMD_BATCH_SIZE] = sparkle_values2.to_array();

        twinkles[base_idx2..(SIMD_BATCH_SIZE + base_idx2)]
            .copy_from_slice(&twinkle_array2[..SIMD_BATCH_SIZE]);
        sparkles[base_idx2..(SIMD_BATCH_SIZE + base_idx2)]
            .copy_from_slice(&sparkle_array2[..SIMD_BATCH_SIZE]);
    }

    for chunk in (unrolled_chunks * 2)..(unrolled_chunks * 2 + remaining_chunks) {
        let base_idx = chunk * SIMD_BATCH_SIZE;

        let x_slice = &positions_x[base_idx..base_idx + SIMD_BATCH_SIZE];
        let y_slice = &positions_y[base_idx..base_idx + SIMD_BATCH_SIZE];

        let x_vec = f32x16::from_slice(x_slice);
        let y_vec = f32x16::from_slice(y_slice);

        let time_3_vec = f32x16::splat(time_3);
        let factor_10 = f32x16::splat(10.0);
        let twinkle_arg = time_3_vec + x_vec * factor_10 + y_vec * factor_10;
        let twinkle_sin = simd_sin_lookup_batch_16(twinkle_arg);
        let twinkle_scale = f32x16::splat(0.3);
        let twinkle_offset = f32x16::splat(0.7);
        let twinkle_base = twinkle_sin * twinkle_scale + twinkle_offset;

        let time_15_vec = f32x16::splat(time_15);
        let factor_20 = f32x16::splat(20.0);
        let factor_30 = f32x16::splat(30.0);
        let sparkle_arg = time_15_vec + x_vec * factor_20 + y_vec * factor_30;
        let sparkle_phase = simd_sin_lookup_batch_16(sparkle_arg);

        let sparkle_threshold = f32x16::splat(0.98);
        let sparkle_scale = f32x16::splat(50.0);
        let sparkle_mask = sparkle_phase.simd_gt(sparkle_threshold);
        let sparkle_values = sparkle_mask.select(
            (sparkle_phase - sparkle_threshold) * sparkle_scale,
            f32x16::splat(0.0),
        );

        let final_twinkle = twinkle_base + sparkle_values;

        let twinkle_array: [f32; SIMD_BATCH_SIZE] = final_twinkle.to_array();
        let sparkle_array: [f32; SIMD_BATCH_SIZE] = sparkle_values.to_array();

        twinkles[base_idx..(SIMD_BATCH_SIZE + base_idx)]
            .copy_from_slice(&twinkle_array[..SIMD_BATCH_SIZE]);
        sparkles[base_idx..(SIMD_BATCH_SIZE + base_idx)]
            .copy_from_slice(&sparkle_array[..SIMD_BATCH_SIZE]);
    }

    let remaining_start = chunks * SIMD_BATCH_SIZE;
    for i in remaining_start..count {
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

#[wasm_bindgen]
pub fn calculate_speed_multiplier(
    is_moving: bool,
    click_time: f64,
    current_time: f64,
    current_multiplier: f32,
) -> f32 {
    let movement_boost: f32 = if is_moving { 8.0 } else { 1.0 };

    let time_since_click = current_time - click_time;
    let click_boost: f32 = if time_since_click < 0.5 {
        let click_decay = 1.0 - (time_since_click / 0.5) as f32;
        1.0 + 8.0 * click_decay
    } else {
        1.0
    };

    let combined_boost = movement_boost * click_boost;
    let speed_multiplier = combined_boost.min(15.0);

    current_multiplier + (speed_multiplier - current_multiplier) * 0.2
}

#[wasm_bindgen]
pub struct FrameUpdateResult {
    pub visible_count: usize,
    pub positions_dirty: bool,
    pub effects_dirty: bool,
    pub culling_dirty: bool,
}

#[wasm_bindgen]
pub fn update_frame_simd(
    time: f32,
    _delta_time: f32,
    camera_matrix_ptr: *const f32,
    is_moving: bool,
    click_time: f32,
    current_speed_multiplier: f32,
) -> FrameUpdateResult {
    STAR_MEMORY_POOL.with(|pool_cell| {
        if let Some(pool) = pool_cell.borrow_mut().as_mut() {
            let count = pool.count;

            let _speed_multiplier = calculate_speed_multiplier(
                is_moving,
                click_time as f64,
                time as f64,
                current_speed_multiplier,
            );

            calculate_effects_into_buffers_simd(
                &pool.positions_x,
                &pool.positions_y,
                &mut pool.twinkles,
                &mut pool.sparkles,
                count,
                time,
            );

            let visible_count = if !camera_matrix_ptr.is_null() {
                // TODO: Implement safe camera matrix handling when needed
                count
            } else {
                count
            };

            FrameUpdateResult {
                visible_count,
                positions_dirty: true,
                effects_dirty: true,
                culling_dirty: false,
            }
        } else {
            FrameUpdateResult {
                visible_count: 0,
                positions_dirty: false,
                effects_dirty: false,
                culling_dirty: false,
            }
        }
    })
}
