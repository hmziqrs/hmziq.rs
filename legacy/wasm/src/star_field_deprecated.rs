// DEPRECATED STAR FIELD FUNCTIONS
// These functions use unsafe raw pointer operations and have been replaced
// with safer alternatives in the main star_field.rs module.
// Kept here for backward compatibility if needed.

use std::f32::consts::PI;
use wasm_bindgen::prelude::*;

// Simple sin function for legacy compatibility (not optimized)
fn simple_sin(x: f32) -> f32 {
    x.sin()
}

// Calculate star effects (twinkle and sparkle)
// DEPRECATED: Use update_frame_simd instead for better performance and safety
#[deprecated(note = "Use update_frame_simd instead")]
#[wasm_bindgen]
pub fn calculate_star_effects(positions_ptr: *const f32, count: usize, time: f32) -> Vec<f32> {
    let mut effects = Vec::with_capacity(count * 2);

    unsafe {
        let positions = std::slice::from_raw_parts(positions_ptr, count * 3);

        for i in 0..count {
            let i3 = i * 3;
            let x = positions[i3];
            let y = positions[i3 + 1];

            // Twinkle effect (matching lines 437-438)
            let twinkle_base = simple_sin(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;

            // Sparkle effect (matching lines 440-443)
            let sparkle_phase = simple_sin(time * 15.0 + x * 20.0 + y * 30.0);
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

    effects
}

// Direct buffer update version - fills existing buffers to avoid allocations
// DEPRECATED: Use update_frame_simd instead for better performance and safety
#[deprecated(note = "Use update_frame_simd instead")]
#[wasm_bindgen]
pub fn calculate_star_effects_into_buffers(
    positions_ptr: *const f32,
    twinkles_ptr: *mut f32,
    sparkles_ptr: *mut f32,
    count: usize,
    time: f32,
) {
    unsafe {
        let positions = std::slice::from_raw_parts(positions_ptr, count * 3);
        let twinkles = std::slice::from_raw_parts_mut(twinkles_ptr, count);
        let sparkles = std::slice::from_raw_parts_mut(sparkles_ptr, count);

        // Simple effects calculation without SIMD for legacy compatibility
        for i in 0..count {
            let i3 = i * 3;
            let x = positions[i3];
            let y = positions[i3 + 1];

            // Twinkle effect
            let twinkle = simple_sin(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;

            // Sparkle effect
            let sparkle_phase = simple_sin(time * 15.0 + x * 20.0 + y * 30.0);
            let sparkle = if sparkle_phase > 0.98 {
                (sparkle_phase - 0.98) / 0.02
            } else {
                0.0
            };

            twinkles[i] = twinkle;
            sparkles[i] = sparkle;
        }
    }
}

// Calculate only twinkle effects (simplified)
// DEPRECATED: Use update_frame_simd instead for better performance and safety
#[deprecated(note = "Use update_frame_simd instead")]
#[wasm_bindgen]
pub fn calculate_twinkle_effects(positions_ptr: *const f32, count: usize, time: f32) -> Vec<f32> {
    let mut twinkles = Vec::with_capacity(count);

    unsafe {
        let positions = std::slice::from_raw_parts(positions_ptr, count * 3);

        for i in 0..count {
            let i3 = i * 3;
            let x = positions[i3];
            let y = positions[i3 + 1];

            let twinkle = simple_sin(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7;
            twinkles.push(twinkle);
        }
    }

    twinkles
}

// Calculate only sparkle effects (for performance mode)
// DEPRECATED: Use update_frame_simd instead for better performance and safety
#[deprecated(note = "Use update_frame_simd instead")]
#[wasm_bindgen]
pub fn calculate_sparkle_effects(positions_ptr: *const f32, count: usize, time: f32) -> Vec<f32> {
    let mut sparkles = Vec::with_capacity(count);

    unsafe {
        let positions = std::slice::from_raw_parts(positions_ptr, count * 3);

        for i in 0..count {
            let i3 = i * 3;
            let x = positions[i3];
            let y = positions[i3 + 1];

            let sparkle_phase = simple_sin(time * 15.0 + x * 20.0 + y * 30.0);
            let sparkle = if sparkle_phase > 0.98 {
                (sparkle_phase - 0.98) / 0.02
            } else {
                0.0
            };

            sparkles.push(sparkle);
        }
    }

    sparkles
}