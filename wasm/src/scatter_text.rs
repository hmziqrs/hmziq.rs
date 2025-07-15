use std::cell::RefCell;
use wasm_bindgen::prelude::*;

#[cfg(feature = "simd")]
use core::arch::wasm32::*;

const SIMD_BATCH_SIZE: usize = 16;
const MAX_PARTICLES: usize = 10000;

thread_local! {
    static SCATTER_TEXT_STATE: RefCell<Option<ScatterTextState>> = RefCell::new(None);
}

#[repr(C)]
struct ScatterTextState {
    // Particle positions (current)
    positions_x: Vec<f32>,
    positions_y: Vec<f32>,

    // Target positions (text formation)
    target_x: Vec<f32>,
    target_y: Vec<f32>,

    // Scatter velocities (pre-calculated)
    scatter_vx: Vec<f32>,
    scatter_vy: Vec<f32>,

    // Visual properties
    colors_r: Vec<f32>,
    colors_g: Vec<f32>,
    colors_b: Vec<f32>,
    opacity: Vec<f32>,

    // State flags (bitpacked)
    scattered_flags: Vec<u64>,

    // Control parameters
    particle_count: usize,
    forming: bool,
    easing_factor: f32,
    fade_rate: f32,
    scatter_speed: f32,
}

#[wasm_bindgen]
pub struct ScatterTextPointers {
    pub positions_x_ptr: u32,
    pub positions_y_ptr: u32,
    pub target_x_ptr: u32,
    pub target_y_ptr: u32,
    pub scatter_vx_ptr: u32,
    pub scatter_vy_ptr: u32,
    pub colors_r_ptr: u32,
    pub colors_g_ptr: u32,
    pub colors_b_ptr: u32,
    pub opacity_ptr: u32,
    pub scattered_flags_ptr: u32,
    pub particle_count: usize,
}

#[wasm_bindgen]
pub fn initialize_scatter_text(max_particles: usize) -> ScatterTextPointers {
    let aligned_count = max_particles.div_ceil(SIMD_BATCH_SIZE) * SIMD_BATCH_SIZE;
    let flag_count = aligned_count.div_ceil(64);

    let mut state = ScatterTextState {
        positions_x: vec![0.0; aligned_count],
        positions_y: vec![0.0; aligned_count],
        target_x: vec![0.0; aligned_count],
        target_y: vec![0.0; aligned_count],
        scatter_vx: vec![0.0; aligned_count],
        scatter_vy: vec![0.0; aligned_count],
        colors_r: vec![1.0; aligned_count],
        colors_g: vec![1.0; aligned_count],
        colors_b: vec![1.0; aligned_count],
        opacity: vec![1.0; aligned_count],
        scattered_flags: vec![0u64; flag_count],
        particle_count: 0,
        forming: false,
        easing_factor: 0.08,
        fade_rate: 0.02,
        scatter_speed: 3.0,
    };

    let pointers = ScatterTextPointers {
        positions_x_ptr: state.positions_x.as_ptr() as u32,
        positions_y_ptr: state.positions_y.as_ptr() as u32,
        target_x_ptr: state.target_x.as_ptr() as u32,
        target_y_ptr: state.target_y.as_ptr() as u32,
        scatter_vx_ptr: state.scatter_vx.as_ptr() as u32,
        scatter_vy_ptr: state.scatter_vy.as_ptr() as u32,
        colors_r_ptr: state.colors_r.as_ptr() as u32,
        colors_g_ptr: state.colors_g.as_ptr() as u32,
        colors_b_ptr: state.colors_b.as_ptr() as u32,
        opacity_ptr: state.opacity.as_ptr() as u32,
        scattered_flags_ptr: state.scattered_flags.as_ptr() as u32,
        particle_count: state.particle_count,
    };

    SCATTER_TEXT_STATE.with(|cell| {
        *cell.borrow_mut() = Some(state);
    });

    pointers
}

#[wasm_bindgen]
pub fn set_text_pixels(
    pixel_data: &[u8],
    width: u32,
    height: u32,
    canvas_width: f32,
    canvas_height: f32,
    skip: u32,
) -> usize {
    SCATTER_TEXT_STATE.with(|cell| {
        let mut state_ref = cell.borrow_mut();
        let state = state_ref.as_mut().expect("ScatterText not initialized");

        let mut particle_index = 0;
        let skip_size = skip as usize;

        // Clear scattered flags
        for flag in state.scattered_flags.iter_mut() {
            *flag = 0;
        }

        // Sample pixels from the image data
        for y in (0..height as usize).step_by(skip_size) {
            for x in (0..width as usize).step_by(skip_size) {
                let index = (y * width as usize + x) * 4;

                if index + 3 < pixel_data.len() {
                    let alpha = pixel_data[index + 3];

                    // If pixel is visible
                    if alpha > 128 && particle_index < MAX_PARTICLES {
                        // Set target position
                        state.target_x[particle_index] = x as f32;
                        state.target_y[particle_index] = y as f32;

                        // Set random starting position
                        state.positions_x[particle_index] =
                            js_sys::Math::random() as f32 * canvas_width;
                        state.positions_y[particle_index] =
                            js_sys::Math::random() as f32 * canvas_height;

                        // Set color
                        state.colors_r[particle_index] = (pixel_data[index] as f32) / 255.0;
                        state.colors_g[particle_index] = (pixel_data[index + 1] as f32) / 255.0;
                        state.colors_b[particle_index] = (pixel_data[index + 2] as f32) / 255.0;

                        // Reset opacity
                        state.opacity[particle_index] = 1.0;

                        // Pre-calculate scatter velocity
                        let angle = js_sys::Math::random() as f32 * std::f32::consts::PI * 2.0;
                        let speed = (js_sys::Math::random() as f32 * state.scatter_speed) + 1.0;
                        state.scatter_vx[particle_index] = angle.cos() * speed;
                        state.scatter_vy[particle_index] = angle.sin() * speed;

                        particle_index += 1;
                    }
                }
            }
        }

        state.particle_count = particle_index;
        state.forming = true;

        particle_index
    })
}

#[wasm_bindgen]
pub fn start_forming() {
    SCATTER_TEXT_STATE.with(|cell| {
        let mut state_ref = cell.borrow_mut();
        if let Some(state) = state_ref.as_mut() {
            state.forming = true;
            // Reset scattered flags when forming
            for flag in state.scattered_flags.iter_mut() {
                *flag = 0;
            }
        }
    });
}

#[wasm_bindgen]
pub fn start_scattering() {
    SCATTER_TEXT_STATE.with(|cell| {
        let mut state_ref = cell.borrow_mut();
        if let Some(state) = state_ref.as_mut() {
            state.forming = false;
        }
    });
}

#[wasm_bindgen]
pub fn update_particles(delta_time: f32) {
    SCATTER_TEXT_STATE.with(|cell| {
        let mut state_ref = cell.borrow_mut();
        let state = state_ref.as_mut().expect("ScatterText not initialized");

        let count = state.particle_count;
        if count == 0 {
            return;
        }

        #[cfg(feature = "simd")]
        {
            // Process particles in SIMD batches
            let simd_chunks = count / SIMD_BATCH_SIZE;

            for chunk in 0..simd_chunks {
                let base = chunk * SIMD_BATCH_SIZE;
                update_particle_batch_simd(state, base);
            }

            // Handle remaining particles
            let remaining_start = simd_chunks * SIMD_BATCH_SIZE;
            for i in remaining_start..count {
                update_particle_scalar(state, i);
            }
        }

        #[cfg(not(feature = "simd"))]
        {
            for i in 0..count {
                update_particle_scalar(state, i);
            }
        }
    });
}

#[cfg(feature = "simd")]
fn update_particle_batch_simd(state: &mut ScatterTextState, base: usize) {
    unsafe {
        // Load current positions
        let pos_x = v128_load(&state.positions_x[base] as *const f32 as *const v128);
        let pos_x2 = v128_load(&state.positions_x[base + 4] as *const f32 as *const v128);
        let pos_x3 = v128_load(&state.positions_x[base + 8] as *const f32 as *const v128);
        let pos_x4 = v128_load(&state.positions_x[base + 12] as *const f32 as *const v128);

        let pos_y = v128_load(&state.positions_y[base] as *const f32 as *const v128);
        let pos_y2 = v128_load(&state.positions_y[base + 4] as *const f32 as *const v128);
        let pos_y3 = v128_load(&state.positions_y[base + 8] as *const f32 as *const v128);
        let pos_y4 = v128_load(&state.positions_y[base + 12] as *const f32 as *const v128);

        if state.forming {
            // Load target positions
            let target_x = v128_load(&state.target_x[base] as *const f32 as *const v128);
            let target_x2 = v128_load(&state.target_x[base + 4] as *const f32 as *const v128);
            let target_x3 = v128_load(&state.target_x[base + 8] as *const f32 as *const v128);
            let target_x4 = v128_load(&state.target_x[base + 12] as *const f32 as *const v128);

            let target_y = v128_load(&state.target_y[base] as *const f32 as *const v128);
            let target_y2 = v128_load(&state.target_y[base + 4] as *const f32 as *const v128);
            let target_y3 = v128_load(&state.target_y[base + 8] as *const f32 as *const v128);
            let target_y4 = v128_load(&state.target_y[base + 12] as *const f32 as *const v128);

            // Calculate deltas
            let dx = f32x4_sub(target_x, pos_x);
            let dx2 = f32x4_sub(target_x2, pos_x2);
            let dx3 = f32x4_sub(target_x3, pos_x3);
            let dx4 = f32x4_sub(target_x4, pos_x4);

            let dy = f32x4_sub(target_y, pos_y);
            let dy2 = f32x4_sub(target_y2, pos_y2);
            let dy3 = f32x4_sub(target_y3, pos_y3);
            let dy4 = f32x4_sub(target_y4, pos_y4);

            // Apply easing
            let easing = f32x4_splat(state.easing_factor);
            let new_x = f32x4_add(pos_x, f32x4_mul(dx, easing));
            let new_x2 = f32x4_add(pos_x2, f32x4_mul(dx2, easing));
            let new_x3 = f32x4_add(pos_x3, f32x4_mul(dx3, easing));
            let new_x4 = f32x4_add(pos_x4, f32x4_mul(dx4, easing));

            let new_y = f32x4_add(pos_y, f32x4_mul(dy, easing));
            let new_y2 = f32x4_add(pos_y2, f32x4_mul(dy2, easing));
            let new_y3 = f32x4_add(pos_y3, f32x4_mul(dy3, easing));
            let new_y4 = f32x4_add(pos_y4, f32x4_mul(dy4, easing));

            // Store new positions
            v128_store(state.positions_x[base..].as_mut_ptr() as *mut v128, new_x);
            v128_store(
                state.positions_x[base + 4..].as_mut_ptr() as *mut v128,
                new_x2,
            );
            v128_store(
                state.positions_x[base + 8..].as_mut_ptr() as *mut v128,
                new_x3,
            );
            v128_store(
                state.positions_x[base + 12..].as_mut_ptr() as *mut v128,
                new_x4,
            );

            v128_store(state.positions_y[base..].as_mut_ptr() as *mut v128, new_y);
            v128_store(
                state.positions_y[base + 4..].as_mut_ptr() as *mut v128,
                new_y2,
            );
            v128_store(
                state.positions_y[base + 8..].as_mut_ptr() as *mut v128,
                new_y3,
            );
            v128_store(
                state.positions_y[base + 12..].as_mut_ptr() as *mut v128,
                new_y4,
            );

            // Reset opacity when forming
            let full_opacity = f32x4_splat(1.0);
            v128_store(
                state.opacity[base..].as_mut_ptr() as *mut v128,
                full_opacity,
            );
            v128_store(
                state.opacity[base + 4..].as_mut_ptr() as *mut v128,
                full_opacity,
            );
            v128_store(
                state.opacity[base + 8..].as_mut_ptr() as *mut v128,
                full_opacity,
            );
            v128_store(
                state.opacity[base + 12..].as_mut_ptr() as *mut v128,
                full_opacity,
            );
        } else {
            // Scattering
            // Update positions with scatter velocity
            let vx = v128_load(&state.scatter_vx[base] as *const f32 as *const v128);
            let vx2 = v128_load(&state.scatter_vx[base + 4] as *const f32 as *const v128);
            let vx3 = v128_load(&state.scatter_vx[base + 8] as *const f32 as *const v128);
            let vx4 = v128_load(&state.scatter_vx[base + 12] as *const f32 as *const v128);

            let vy = v128_load(&state.scatter_vy[base] as *const f32 as *const v128);
            let vy2 = v128_load(&state.scatter_vy[base + 4] as *const f32 as *const v128);
            let vy3 = v128_load(&state.scatter_vy[base + 8] as *const f32 as *const v128);
            let vy4 = v128_load(&state.scatter_vy[base + 12] as *const f32 as *const v128);

            let new_x = f32x4_add(pos_x, vx);
            let new_x2 = f32x4_add(pos_x2, vx2);
            let new_x3 = f32x4_add(pos_x3, vx3);
            let new_x4 = f32x4_add(pos_x4, vx4);

            let new_y = f32x4_add(pos_y, vy);
            let new_y2 = f32x4_add(pos_y2, vy2);
            let new_y3 = f32x4_add(pos_y3, vy3);
            let new_y4 = f32x4_add(pos_y4, vy4);

            // Store new positions
            v128_store(state.positions_x[base..].as_mut_ptr() as *mut v128, new_x);
            v128_store(
                state.positions_x[base + 4..].as_mut_ptr() as *mut v128,
                new_x2,
            );
            v128_store(
                state.positions_x[base + 8..].as_mut_ptr() as *mut v128,
                new_x3,
            );
            v128_store(
                state.positions_x[base + 12..].as_mut_ptr() as *mut v128,
                new_x4,
            );

            v128_store(state.positions_y[base..].as_mut_ptr() as *mut v128, new_y);
            v128_store(
                state.positions_y[base + 4..].as_mut_ptr() as *mut v128,
                new_y2,
            );
            v128_store(
                state.positions_y[base + 8..].as_mut_ptr() as *mut v128,
                new_y3,
            );
            v128_store(
                state.positions_y[base + 12..].as_mut_ptr() as *mut v128,
                new_y4,
            );

            // Update opacity (fade out)
            let opacity = v128_load(&state.opacity[base] as *const f32 as *const v128);
            let opacity2 = v128_load(&state.opacity[base + 4] as *const f32 as *const v128);
            let opacity3 = v128_load(&state.opacity[base + 8] as *const f32 as *const v128);
            let opacity4 = v128_load(&state.opacity[base + 12] as *const f32 as *const v128);

            let fade = f32x4_splat(state.fade_rate);
            let zero = f32x4_splat(0.0);

            let new_opacity = f32x4_max(f32x4_sub(opacity, fade), zero);
            let new_opacity2 = f32x4_max(f32x4_sub(opacity2, fade), zero);
            let new_opacity3 = f32x4_max(f32x4_sub(opacity3, fade), zero);
            let new_opacity4 = f32x4_max(f32x4_sub(opacity4, fade), zero);

            v128_store(state.opacity[base..].as_mut_ptr() as *mut v128, new_opacity);
            v128_store(
                state.opacity[base + 4..].as_mut_ptr() as *mut v128,
                new_opacity2,
            );
            v128_store(
                state.opacity[base + 8..].as_mut_ptr() as *mut v128,
                new_opacity3,
            );
            v128_store(
                state.opacity[base + 12..].as_mut_ptr() as *mut v128,
                new_opacity4,
            );

            // Slow down scatter velocity
            let friction = f32x4_splat(0.98);
            let new_vx = f32x4_mul(vx, friction);
            let new_vx2 = f32x4_mul(vx2, friction);
            let new_vx3 = f32x4_mul(vx3, friction);
            let new_vx4 = f32x4_mul(vx4, friction);

            let new_vy = f32x4_mul(vy, friction);
            let new_vy2 = f32x4_mul(vy2, friction);
            let new_vy3 = f32x4_mul(vy3, friction);
            let new_vy4 = f32x4_mul(vy4, friction);

            v128_store(state.scatter_vx[base..].as_mut_ptr() as *mut v128, new_vx);
            v128_store(
                state.scatter_vx[base + 4..].as_mut_ptr() as *mut v128,
                new_vx2,
            );
            v128_store(
                state.scatter_vx[base + 8..].as_mut_ptr() as *mut v128,
                new_vx3,
            );
            v128_store(
                state.scatter_vx[base + 12..].as_mut_ptr() as *mut v128,
                new_vx4,
            );

            v128_store(state.scatter_vy[base..].as_mut_ptr() as *mut v128, new_vy);
            v128_store(
                state.scatter_vy[base + 4..].as_mut_ptr() as *mut v128,
                new_vy2,
            );
            v128_store(
                state.scatter_vy[base + 8..].as_mut_ptr() as *mut v128,
                new_vy3,
            );
            v128_store(
                state.scatter_vy[base + 12..].as_mut_ptr() as *mut v128,
                new_vy4,
            );
        }
    }
}

fn update_particle_scalar(state: &mut ScatterTextState, index: usize) {
    if state.forming {
        // Reset opacity
        state.opacity[index] = 1.0;

        // Clear scattered flag
        let flag_index = index / 64;
        let bit_index = index % 64;
        state.scattered_flags[flag_index] &= !(1u64 << bit_index);

        // Ease towards target
        let dx = state.target_x[index] - state.positions_x[index];
        let dy = state.target_y[index] - state.positions_y[index];

        state.positions_x[index] += dx * state.easing_factor;
        state.positions_y[index] += dy * state.easing_factor;
    } else {
        // Set scattered flag
        let flag_index = index / 64;
        let bit_index = index % 64;
        let is_scattered = (state.scattered_flags[flag_index] & (1u64 << bit_index)) != 0;

        if !is_scattered {
            state.scattered_flags[flag_index] |= 1u64 << bit_index;
        }

        // Scatter animation
        state.positions_x[index] += state.scatter_vx[index];
        state.positions_y[index] += state.scatter_vy[index];

        // Fade out
        state.opacity[index] = (state.opacity[index] - state.fade_rate).max(0.0);

        // Slow down
        state.scatter_vx[index] *= 0.98;
        state.scatter_vy[index] *= 0.98;
    }
}

#[wasm_bindgen]
pub fn set_easing_factor(factor: f32) {
    SCATTER_TEXT_STATE.with(|cell| {
        let mut state_ref = cell.borrow_mut();
        if let Some(state) = state_ref.as_mut() {
            state.easing_factor = factor.clamp(0.01, 0.5);
        }
    });
}

#[wasm_bindgen]
pub fn set_fade_rate(rate: f32) {
    SCATTER_TEXT_STATE.with(|cell| {
        let mut state_ref = cell.borrow_mut();
        if let Some(state) = state_ref.as_mut() {
            state.fade_rate = rate.clamp(0.001, 0.1);
        }
    });
}

#[wasm_bindgen]
pub fn set_scatter_speed(speed: f32) {
    SCATTER_TEXT_STATE.with(|cell| {
        let mut state_ref = cell.borrow_mut();
        if let Some(state) = state_ref.as_mut() {
            state.scatter_speed = speed.clamp(0.5, 10.0);
        }
    });
}

#[wasm_bindgen]
pub fn get_particle_count() -> usize {
    SCATTER_TEXT_STATE.with(|cell| {
        let state_ref = cell.borrow();
        state_ref.as_ref().map(|s| s.particle_count).unwrap_or(0)
    })
}

#[wasm_bindgen]
pub fn is_forming() -> bool {
    SCATTER_TEXT_STATE.with(|cell| {
        let state_ref = cell.borrow();
        state_ref.as_ref().map(|s| s.forming).unwrap_or(false)
    })
}
