use std::cell::RefCell;
use std::f32::consts::PI;
use std::simd::{f32x16, StdFloat};

// Pre-calculated sin lookup table size (matching JS implementation)
const SIN_TABLE_SIZE: usize = 1024;

// Thread-local sin lookup table for safe access
thread_local! {
    static SIN_TABLE: RefCell<Option<Vec<f32>>> = const { RefCell::new(None) };
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

// Simple scalar random function for fallback use
#[inline]
pub fn seed_random(i: i32) -> f32 {
    let x = ((i as f32) * 12.9898 + 78.233).sin() * 43_758.547;
    x - x.floor()
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
    let factor3 = f32x16::splat(43_758.547);

    // Use fast sin lookup for SIMD processing
    let x_values = indices * factor1 + factor2;

    // Use the new SIMD sin lookup function for better performance
    let sin_results = fast_sin_lookup_simd_16(x_values);

    let scaled = sin_results * factor3;
    scaled - scaled.floor()
}
