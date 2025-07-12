use std::cell::RefCell;
use std::f32::consts::PI;
use std::simd::{f32x16, StdFloat};
use wasm_bindgen::prelude::*;

// Pre-calculated sin lookup table size (matching JS implementation)
const SIN_TABLE_SIZE: usize = 1024;

// Thread-local sin lookup table for safe access
thread_local! {
    static SIN_TABLE: RefCell<Option<Vec<f32>>> = RefCell::new(None);
}

// Initialize the sin lookup table (now returns nothing, initialization is internal)
fn ensure_sin_table_initialized() {
    SIN_TABLE.with(|table_cell| {
        let mut table_ref = table_cell.borrow_mut();
        if table_ref.is_none() {
            let mut table = Vec::with_capacity(SIN_TABLE_SIZE);
            for i in 0..SIN_TABLE_SIZE {
                let angle = (i as f32 / SIN_TABLE_SIZE as f32) * PI * 2.0;
                table.push(angle.sin());
            }
            *table_ref = Some(table);
        }
    });
}

// Get a value from the sin table by index
fn get_sin_value(index: usize) -> f32 {
    ensure_sin_table_initialized();
    SIN_TABLE.with(|table_cell| {
        table_cell
            .borrow()
            .as_ref()
            .expect("Sin table should be initialized")
            .get(index)
            .copied()
            .unwrap_or(0.0)
    })
}

// Fast sin approximation using lookup table (matching StarField.tsx lines 27-31)
#[inline]
pub fn fast_sin_lookup(x: f32) -> f32 {
    let normalized = ((x % (PI * 2.0)) + PI * 2.0) % (PI * 2.0);
    let index = ((normalized / (PI * 2.0)) * SIN_TABLE_SIZE as f32) as usize;
    let index = index.min(SIN_TABLE_SIZE - 1);
    get_sin_value(index)
}

#[wasm_bindgen]
pub fn fast_sin(x: f32) -> f32 {
    fast_sin_lookup(x)
}

#[wasm_bindgen]
pub fn fast_cos(x: f32) -> f32 {
    fast_sin_lookup(x + PI / 2.0)
}

// Batch processing for better performance
#[wasm_bindgen]
pub fn fast_sin_batch(values: &[f32]) -> Vec<f32> {
    ensure_sin_table_initialized();

    // Use a single borrow for the entire batch operation
    SIN_TABLE.with(|table_cell| {
        let table_ref = table_cell.borrow();
        let table = table_ref.as_ref().expect("Sin table should be initialized");

        values
            .iter()
            .map(|&x| {
                let normalized = ((x % (PI * 2.0)) + PI * 2.0) % (PI * 2.0);
                let index = ((normalized / (PI * 2.0)) * SIN_TABLE_SIZE as f32) as usize;
                let index = index.min(SIN_TABLE_SIZE - 1);
                table[index]
            })
            .collect()
    })
}

#[wasm_bindgen]
pub fn fast_cos_batch(values: &[f32]) -> Vec<f32> {
    fast_sin_batch(&values.iter().map(|&x| x + PI / 2.0).collect::<Vec<_>>())
}

// Optimized lerp function
#[wasm_bindgen]
pub fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

// Batch lerp for animation
#[wasm_bindgen]
pub fn lerp_batch(a_values: &[f32], b_values: &[f32], t: f32) -> Vec<f32> {
    a_values
        .iter()
        .zip(b_values.iter())
        .map(|(&a, &b)| a + (b - a) * t)
        .collect()
}

// Clamp function
#[wasm_bindgen]
pub fn clamp(value: f32, min: f32, max: f32) -> f32 {
    value.max(min).min(max)
}

// Smooth step function for transitions
#[wasm_bindgen]
pub fn smoothstep(edge0: f32, edge1: f32, x: f32) -> f32 {
    let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

// 2D distance calculation
#[wasm_bindgen]
pub fn distance_2d(x1: f32, y1: f32, x2: f32, y2: f32) -> f32 {
    let dx = x2 - x1;
    let dy = y2 - y1;
    (dx * dx + dy * dy).sqrt()
}

// 3D distance calculation
#[wasm_bindgen]
pub fn distance_3d(x1: f32, y1: f32, z1: f32, x2: f32, y2: f32, z2: f32) -> f32 {
    let dx = x2 - x1;
    let dy = y2 - y1;
    let dz = z2 - z1;
    (dx * dx + dy * dy + dz * dz).sqrt()
}

// Seed function for consistent random values (matching StarField.tsx lines 242-245)
#[wasm_bindgen]
pub fn seed_random(i: i32) -> f32 {
    let x = (i as f32 * 12.9898 + 78.233).sin() * 43758.5453;
    x - x.floor()
}

// Batch seed random for star generation
#[wasm_bindgen]
pub fn seed_random_batch(start: i32, count: usize) -> Vec<f32> {
    (start..start + count as i32)
        .map(|i| {
            let x = (i as f32 * 12.9898 + 78.233).sin() * 43758.5453;
            x - x.floor()
        })
        .collect()
}


// SIMD sin lookup batch function using f32x16 for AVX-512 optimization
pub fn fast_sin_lookup_simd_16(values: f32x16) -> f32x16 {
    ensure_sin_table_initialized();

    SIN_TABLE.with(|table_cell| {
        let table_ref = table_cell.borrow();
        let table = table_ref.as_ref().expect("Sin table should be initialized");

        // Process 16 values at once using SIMD lookup
        let values_arr: [f32; 16] = values.to_array();
        let mut results = [0.0f32; 16];

        for (i, &val) in values_arr.iter().enumerate() {
            let normalized = ((val % (PI * 2.0)) + PI * 2.0) % (PI * 2.0);
            let index = ((normalized / (PI * 2.0)) * SIN_TABLE_SIZE as f32) as usize;
            let index = index.min(SIN_TABLE_SIZE - 1);
            results[i] = table[index];
        }

        f32x16::from_array(results)
    })
}

// Upgraded SIMD random number generation - generates 16 random numbers at once (f32x16)
pub fn seed_random_simd_batch_16(start: i32) -> f32x16 {
    let indices = f32x16::from_array([
        start as f32,
        (start + 1) as f32,
        (start + 2) as f32,
        (start + 3) as f32,
        (start + 4) as f32,
        (start + 5) as f32,
        (start + 6) as f32,
        (start + 7) as f32,
        (start + 8) as f32,
        (start + 9) as f32,
        (start + 10) as f32,
        (start + 11) as f32,
        (start + 12) as f32,
        (start + 13) as f32,
        (start + 14) as f32,
        (start + 15) as f32,
    ]);

    let factor1 = f32x16::splat(12.9898);
    let factor2 = f32x16::splat(78.233);
    let factor3 = f32x16::splat(43758.5453);

    // Use fast sin lookup for SIMD processing
    let x_values = indices * factor1 + factor2;

    // Use the new SIMD sin lookup function for better performance
    let sin_results = fast_sin_lookup_simd_16(x_values);

    let scaled = sin_results * factor3;
    scaled - scaled.floor()
}
