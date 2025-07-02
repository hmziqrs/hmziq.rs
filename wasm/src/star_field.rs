use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

// Import math utilities
use crate::math::{seed_random, fast_sin_lookup};

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
    
    effects
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

