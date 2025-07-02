use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

// Pre-calculated sin lookup table size (matching JS implementation)
const SIN_TABLE_SIZE: usize = 1024;

// Lazy static for sin lookup table
static mut SIN_TABLE: Option<Vec<f32>> = None;

// Initialize the sin lookup table
fn init_sin_table() -> &'static Vec<f32> {
    unsafe {
        if SIN_TABLE.is_none() {
            let mut table = Vec::with_capacity(SIN_TABLE_SIZE);
            for i in 0..SIN_TABLE_SIZE {
                let angle = (i as f32 / SIN_TABLE_SIZE as f32) * PI * 2.0;
                table.push(angle.sin());
            }
            SIN_TABLE = Some(table);
        }
        SIN_TABLE.as_ref().unwrap()
    }
}

// Fast sin approximation using lookup table (matching StarField.tsx lines 27-31)
#[inline]
pub fn fast_sin_lookup(x: f32) -> f32 {
    let table = init_sin_table();
    let normalized = ((x % (PI * 2.0)) + PI * 2.0) % (PI * 2.0);
    let index = ((normalized / (PI * 2.0)) * SIN_TABLE_SIZE as f32) as usize;
    let index = index.min(SIN_TABLE_SIZE - 1);
    table[index]
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
    let table = init_sin_table();
    values.iter().map(|&x| {
        let normalized = ((x % (PI * 2.0)) + PI * 2.0) % (PI * 2.0);
        let index = ((normalized / (PI * 2.0)) * SIN_TABLE_SIZE as f32) as usize;
        let index = index.min(SIN_TABLE_SIZE - 1);
        table[index]
    }).collect()
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
    a_values.iter()
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
    let x = ((i as f32 * 12.9898 + 78.233).sin() * 43758.5453);
    x - x.floor()
}

// Batch seed random for star generation
#[wasm_bindgen]
pub fn seed_random_batch(start: i32, count: usize) -> Vec<f32> {
    (start..start + count as i32)
        .map(|i| {
            let x = ((i as f32 * 12.9898 + 78.233).sin() * 43758.5453);
            x - x.floor()
        })
        .collect()
}