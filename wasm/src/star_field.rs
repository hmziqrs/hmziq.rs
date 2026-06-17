use std::cell::RefCell;
use std::f32::consts::PI;
use wasm_bindgen::prelude::*;

use crate::math::{fast_sin_lookup_simd_16, seed_random, seed_random_simd_batch_16};

use std::simd::f32x16;
use std::simd::Select;
use std::simd::cmp::SimdPartialOrd;

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
    count: usize,
}

impl StarMemoryPool {
    fn new(count: usize) -> Self {
        let aligned_count = count.div_ceil(SIMD_BATCH_SIZE) * SIMD_BATCH_SIZE;

        Self {
            positions_x: vec![0.0; aligned_count],
            positions_y: vec![0.0; aligned_count],
            positions_z: vec![0.0; aligned_count],
            colors_r: vec![1.0; aligned_count],
            colors_g: vec![1.0; aligned_count],
            colors_b: vec![1.0; aligned_count],
            sizes: vec![1.0; aligned_count],
            count,
        }
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
            count: self.count,
            positions_x_length: self.positions_x.len(),
            positions_y_length: self.positions_y.len(),
            positions_z_length: self.positions_z.len(),
            colors_r_length: self.colors_r.len(),
            colors_g_length: self.colors_g.len(),
            colors_b_length: self.colors_b.len(),
            sizes_length: self.sizes.len(),
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
    pub count: usize,
    pub positions_x_length: usize,
    pub positions_y_length: usize,
    pub positions_z_length: usize,
    pub colors_r_length: usize,
    pub colors_g_length: usize,
    pub colors_b_length: usize,
    pub sizes_length: usize,
}

fn generate_star_colors_simd_direct(
    colors_r: &mut [f32],
    colors_g: &mut [f32],
    colors_b: &mut [f32],
    count: usize,
) {
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

    generate_star_sizes_simd_direct(&mut pool.sizes, count, 1.0);

    let pointers = pool.get_pointers();

    STAR_MEMORY_POOL.with(|pool_cell| {
        *pool_cell.borrow_mut() = Some(pool);
    });

    pointers
}

#[wasm_bindgen]
pub fn destroy_star_memory_pool() {
    STAR_MEMORY_POOL.with(|pool_cell| {
        *pool_cell.borrow_mut() = None;
    });
}
