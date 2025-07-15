use std::cell::RefCell;
use std::f32::consts::PI;
use std::simd::cmp::SimdPartialOrd;
use std::simd::{f32x16, num::SimdFloat};
use wasm_bindgen::prelude::*;

use crate::math::{
    fast_cos_lookup_simd_16, fast_sin_lookup_simd_16, seed_random, seed_random_simd_batch_16,
};

const SIMD_BATCH_SIZE: usize = 16;

// SAFETY: thread_local safe in WASM single-threaded environment
thread_local! {
    static SKILL_SYSTEM_POOL: RefCell<Option<SkillSystemMemory>> = const { RefCell::new(None) };
}

#[repr(C)]
pub struct SkillSystemMemory {
    // Orbital positions (SoA for SIMD efficiency)
    positions_x: Vec<f32>,
    positions_y: Vec<f32>,
    positions_z: Vec<f32>,

    // Orbital parameters
    orbit_radius: Vec<f32>,
    orbit_speed: Vec<f32>,
    orbit_phase: Vec<f32>,
    category_center_x: Vec<f32>,
    category_center_y: Vec<f32>,
    category_center_z: Vec<f32>,

    // Visual properties
    glow_intensity: Vec<f32>,
    scale: Vec<f32>,
    base_scale: Vec<f32>,
    proficiency: Vec<f32>,

    // Interactive states (bitpacked)
    hover_states: u64,
    selected_states: u64,

    // Particle system data
    particle_positions_x: Vec<f32>,
    particle_positions_y: Vec<f32>,
    particle_positions_z: Vec<f32>,
    particle_velocities_x: Vec<f32>,
    particle_velocities_y: Vec<f32>,
    particle_velocities_z: Vec<f32>,
    particle_life: Vec<f32>,

    // Constellation connection data
    connection_indices: Vec<u32>,
    connection_strength: Vec<f32>,

    count: usize,
    particle_count: usize,
    connection_count: usize,
}

impl SkillSystemMemory {
    fn new(count: usize, particle_count: usize, connection_count: usize) -> Self {
        let aligned_count = count.div_ceil(SIMD_BATCH_SIZE) * SIMD_BATCH_SIZE;
        let aligned_particle_count = particle_count.div_ceil(SIMD_BATCH_SIZE) * SIMD_BATCH_SIZE;

        Self {
            positions_x: Self::create_aligned_vec(aligned_count, 0.0),
            positions_y: Self::create_aligned_vec(aligned_count, 0.0),
            positions_z: Self::create_aligned_vec(aligned_count, 0.0),

            orbit_radius: Self::create_aligned_vec(aligned_count, 8.0),
            orbit_speed: Self::create_aligned_vec(aligned_count, 0.5),
            orbit_phase: Self::create_aligned_vec(aligned_count, 0.0),
            category_center_x: Self::create_aligned_vec(aligned_count, 0.0),
            category_center_y: Self::create_aligned_vec(aligned_count, 0.0),
            category_center_z: Self::create_aligned_vec(aligned_count, 0.0),

            glow_intensity: Self::create_aligned_vec(aligned_count, 1.0),
            scale: Self::create_aligned_vec(aligned_count, 1.0),
            base_scale: Self::create_aligned_vec(aligned_count, 1.0),
            proficiency: Self::create_aligned_vec(aligned_count, 0.8),

            hover_states: 0,
            selected_states: 0,

            particle_positions_x: Self::create_aligned_vec(aligned_particle_count, 0.0),
            particle_positions_y: Self::create_aligned_vec(aligned_particle_count, 0.0),
            particle_positions_z: Self::create_aligned_vec(aligned_particle_count, 0.0),
            particle_velocities_x: Self::create_aligned_vec(aligned_particle_count, 0.0),
            particle_velocities_y: Self::create_aligned_vec(aligned_particle_count, 0.0),
            particle_velocities_z: Self::create_aligned_vec(aligned_particle_count, 0.0),
            particle_life: Self::create_aligned_vec(aligned_particle_count, 1.0),

            connection_indices: vec![0; connection_count * 2],
            connection_strength: vec![0.0; connection_count],

            count,
            particle_count,
            connection_count,
        }
    }

    fn create_aligned_vec(size: usize, default_value: f32) -> Vec<f32> {
        vec![default_value; size]
    }

    fn get_pointers(&mut self) -> SkillSystemPointers {
        SkillSystemPointers {
            positions_x_ptr: self.positions_x.as_mut_ptr() as u32,
            positions_y_ptr: self.positions_y.as_mut_ptr() as u32,
            positions_z_ptr: self.positions_z.as_mut_ptr() as u32,

            orbit_radius_ptr: self.orbit_radius.as_mut_ptr() as u32,
            orbit_speed_ptr: self.orbit_speed.as_mut_ptr() as u32,
            orbit_phase_ptr: self.orbit_phase.as_mut_ptr() as u32,
            category_center_x_ptr: self.category_center_x.as_mut_ptr() as u32,
            category_center_y_ptr: self.category_center_y.as_mut_ptr() as u32,
            category_center_z_ptr: self.category_center_z.as_mut_ptr() as u32,

            glow_intensity_ptr: self.glow_intensity.as_mut_ptr() as u32,
            scale_ptr: self.scale.as_mut_ptr() as u32,
            base_scale_ptr: self.base_scale.as_mut_ptr() as u32,
            proficiency_ptr: self.proficiency.as_mut_ptr() as u32,

            particle_positions_x_ptr: self.particle_positions_x.as_mut_ptr() as u32,
            particle_positions_y_ptr: self.particle_positions_y.as_mut_ptr() as u32,
            particle_positions_z_ptr: self.particle_positions_z.as_mut_ptr() as u32,
            particle_velocities_x_ptr: self.particle_velocities_x.as_mut_ptr() as u32,
            particle_velocities_y_ptr: self.particle_velocities_y.as_mut_ptr() as u32,
            particle_velocities_z_ptr: self.particle_velocities_z.as_mut_ptr() as u32,
            particle_life_ptr: self.particle_life.as_mut_ptr() as u32,

            connection_indices_ptr: self.connection_indices.as_mut_ptr() as u32,
            connection_strength_ptr: self.connection_strength.as_mut_ptr() as u32,

            count: self.count,
            particle_count: self.particle_count,
            connection_count: self.connection_count,

            // Array lengths for bounds checking
            positions_x_length: self.positions_x.len(),
            positions_y_length: self.positions_y.len(),
            positions_z_length: self.positions_z.len(),
            glow_intensity_length: self.glow_intensity.len(),
            scale_length: self.scale.len(),
            particle_positions_x_length: self.particle_positions_x.len(),
            particle_positions_y_length: self.particle_positions_y.len(),
            particle_positions_z_length: self.particle_positions_z.len(),
        }
    }
}

#[wasm_bindgen]
pub struct SkillSystemPointers {
    pub positions_x_ptr: u32,
    pub positions_y_ptr: u32,
    pub positions_z_ptr: u32,

    pub orbit_radius_ptr: u32,
    pub orbit_speed_ptr: u32,
    pub orbit_phase_ptr: u32,
    pub category_center_x_ptr: u32,
    pub category_center_y_ptr: u32,
    pub category_center_z_ptr: u32,

    pub glow_intensity_ptr: u32,
    pub scale_ptr: u32,
    pub base_scale_ptr: u32,
    pub proficiency_ptr: u32,

    pub particle_positions_x_ptr: u32,
    pub particle_positions_y_ptr: u32,
    pub particle_positions_z_ptr: u32,
    pub particle_velocities_x_ptr: u32,
    pub particle_velocities_y_ptr: u32,
    pub particle_velocities_z_ptr: u32,
    pub particle_life_ptr: u32,

    pub connection_indices_ptr: u32,
    pub connection_strength_ptr: u32,

    pub count: usize,
    pub particle_count: usize,
    pub connection_count: usize,

    // Array lengths for bounds checking
    pub positions_x_length: usize,
    pub positions_y_length: usize,
    pub positions_z_length: usize,
    pub glow_intensity_length: usize,
    pub scale_length: usize,
    pub particle_positions_x_length: usize,
    pub particle_positions_y_length: usize,
    pub particle_positions_z_length: usize,
}

// Initialize the skill system with predefined skill positions and properties
#[wasm_bindgen]
pub fn initialize_skill_system(
    count: usize,
    particle_count: usize,
    connection_count: usize,
) -> SkillSystemPointers {
    let mut pool = SkillSystemMemory::new(count, particle_count, connection_count);

    // Initialize skill orbital parameters
    initialize_skill_orbital_params(&mut pool);

    // Set up category centers (3 categories: Frontend, Backend, Cross-Platform)
    initialize_category_centers(&mut pool);

    // Initialize particle system
    initialize_particle_system(&mut pool);

    // Set up skill connections (constellation patterns)
    initialize_skill_connections(&mut pool);

    let pointers = pool.get_pointers();

    SKILL_SYSTEM_POOL.with(|pool_cell| {
        *pool_cell.borrow_mut() = Some(pool);
    });

    pointers
}

fn initialize_skill_orbital_params(pool: &mut SkillSystemMemory) {
    // Define skill categories and their orbital parameters
    let skill_configs = [
        // Frontend skills (category 0)
        (0.0, -8.0, 0.0, 6.0, 0.3, 0.0, 0.9),  // TypeScript
        (0.0, -8.0, 0.0, 7.0, 0.4, 1.0, 0.8),  // React.js
        (0.0, -8.0, 0.0, 8.0, 0.35, 2.0, 0.9), // Next.js
        (0.0, -8.0, 0.0, 6.5, 0.45, 3.0, 0.7), // React Native
        // Backend skills (category 1)
        (8.0, -8.0, 0.0, 7.0, 0.3, 0.5, 0.8),   // AdonisJS
        (8.0, -8.0, 0.0, 6.0, 0.4, 1.5, 0.9),   // Express.js
        (8.0, -8.0, 0.0, 8.0, 0.35, 2.5, 0.85), // Rust (Axum)
        (8.0, -8.0, 0.0, 6.5, 0.45, 3.5, 0.8),  // Node.js
        // Cross-Platform skills (category 2)
        (-8.0, -8.0, 0.0, 7.0, 0.3, 0.25, 0.9),   // Flutter
        (-8.0, -8.0, 0.0, 6.0, 0.4, 1.25, 0.7),   // Dioxus
        (-8.0, -8.0, 0.0, 8.0, 0.35, 2.25, 0.8),  // Electron
        (-8.0, -8.0, 0.0, 6.5, 0.45, 3.25, 0.85), // Tauri
    ];

    for (i, &(center_x, center_y, center_z, radius, speed, phase, proficiency)) in
        skill_configs.iter().enumerate()
    {
        if i < pool.count {
            pool.category_center_x[i] = center_x;
            pool.category_center_y[i] = center_y;
            pool.category_center_z[i] = center_z;
            pool.orbit_radius[i] = radius;
            pool.orbit_speed[i] = speed;
            pool.orbit_phase[i] = phase;
            pool.proficiency[i] = proficiency;
            pool.base_scale[i] = 0.8 + proficiency * 0.4; // Scale based on proficiency
        }
    }
}

fn initialize_category_centers(pool: &mut SkillSystemMemory) {
    // Category centers are already set in initialize_skill_orbital_params
    // Frontend: (0, -8, 0), Backend: (8, -8, 0), Cross-Platform: (-8, -8, 0)
}

fn initialize_particle_system(pool: &mut SkillSystemMemory) {
    // Initialize particles around each skill orb
    let particles_per_skill = pool.particle_count / pool.count.max(1);

    for skill_idx in 0..pool.count {
        let skill_x = pool.category_center_x[skill_idx];
        let skill_y = pool.category_center_y[skill_idx];
        let skill_z = pool.category_center_z[skill_idx];

        for particle_idx in 0..particles_per_skill {
            let global_particle_idx = skill_idx * particles_per_skill + particle_idx;

            if global_particle_idx < pool.particle_count {
                // Random position around skill orb
                let angle = seed_random(global_particle_idx as i32) * 2.0 * PI;
                let radius = 0.5 + seed_random(global_particle_idx as i32 + 1000) * 1.5;
                let height = (seed_random(global_particle_idx as i32 + 2000) - 0.5) * 2.0;

                pool.particle_positions_x[global_particle_idx] = skill_x + radius * angle.cos();
                pool.particle_positions_y[global_particle_idx] = skill_y + height;
                pool.particle_positions_z[global_particle_idx] = skill_z + radius * angle.sin();

                // Random velocity
                let vel_scale = 0.1;
                pool.particle_velocities_x[global_particle_idx] =
                    (seed_random(global_particle_idx as i32 + 3000) - 0.5) * vel_scale;
                pool.particle_velocities_y[global_particle_idx] =
                    (seed_random(global_particle_idx as i32 + 4000) - 0.5) * vel_scale;
                pool.particle_velocities_z[global_particle_idx] =
                    (seed_random(global_particle_idx as i32 + 5000) - 0.5) * vel_scale;

                pool.particle_life[global_particle_idx] = 1.0;
            }
        }
    }
}

fn initialize_skill_connections(pool: &mut SkillSystemMemory) {
    // Define skill connections (constellation patterns)
    let connections = [
        // TypeScript connections
        (0, 1, 0.8), // TypeScript -> React.js
        (0, 2, 0.9), // TypeScript -> Next.js
        (0, 3, 0.7), // TypeScript -> React Native
        // Backend connections
        (4, 5, 0.6),  // AdonisJS -> Express.js
        (5, 7, 0.8),  // Express.js -> Node.js
        (6, 11, 0.7), // Rust -> Tauri
        // Cross-platform connections
        (8, 9, 0.5),   // Flutter -> Dioxus
        (10, 11, 0.6), // Electron -> Tauri
        // Cross-category connections
        (1, 3, 0.5), // React.js -> React Native
        (6, 9, 0.6), // Rust -> Dioxus
    ];

    for (i, &(from_skill, to_skill, strength)) in connections.iter().enumerate() {
        if i < pool.connection_count {
            pool.connection_indices[i * 2] = from_skill;
            pool.connection_indices[i * 2 + 1] = to_skill;
            pool.connection_strength[i] = strength;
        }
    }
}

// Update orbital positions using SIMD for 16 skills at once
fn update_skill_positions_simd(pool: &mut SkillSystemMemory, time: f32) {
    let count = pool.count;
    if count == 0 {
        return;
    }

    let chunks = count / SIMD_BATCH_SIZE;
    let time_vec = f32x16::splat(time);

    // Process complete SIMD batches
    for chunk in 0..chunks {
        let base = chunk * SIMD_BATCH_SIZE;

        // Load orbital parameters
        let radius_vec = f32x16::from_slice(&pool.orbit_radius[base..base + SIMD_BATCH_SIZE]);
        let speed_vec = f32x16::from_slice(&pool.orbit_speed[base..base + SIMD_BATCH_SIZE]);
        let phase_vec = f32x16::from_slice(&pool.orbit_phase[base..base + SIMD_BATCH_SIZE]);
        let center_x_vec =
            f32x16::from_slice(&pool.category_center_x[base..base + SIMD_BATCH_SIZE]);
        let center_y_vec =
            f32x16::from_slice(&pool.category_center_y[base..base + SIMD_BATCH_SIZE]);
        let center_z_vec =
            f32x16::from_slice(&pool.category_center_z[base..base + SIMD_BATCH_SIZE]);

        // Calculate orbital angles
        let angles = (speed_vec * time_vec) + phase_vec;

        // Calculate orbital positions using SIMD lookup tables
        let cos_values = fast_cos_lookup_simd_16(angles);
        let sin_values = fast_sin_lookup_simd_16(angles);

        // Calculate new positions
        let new_x = center_x_vec + (radius_vec * cos_values);
        let new_y = center_y_vec;
        let new_z = center_z_vec + (radius_vec * sin_values);

        // Store results
        new_x.copy_to_slice(&mut pool.positions_x[base..base + SIMD_BATCH_SIZE]);
        new_y.copy_to_slice(&mut pool.positions_y[base..base + SIMD_BATCH_SIZE]);
        new_z.copy_to_slice(&mut pool.positions_z[base..base + SIMD_BATCH_SIZE]);
    }

    // Handle remaining elements with scalar operations
    let remaining_start = chunks * SIMD_BATCH_SIZE;
    for i in remaining_start..count {
        let angle = pool.orbit_speed[i] * time + pool.orbit_phase[i];
        let cos_angle = crate::math::fast_cos_lookup(angle);
        let sin_angle = crate::math::fast_sin_lookup(angle);

        pool.positions_x[i] = pool.category_center_x[i] + pool.orbit_radius[i] * cos_angle;
        pool.positions_y[i] = pool.category_center_y[i];
        pool.positions_z[i] = pool.category_center_z[i] + pool.orbit_radius[i] * sin_angle;
    }
}

// Update particle system with SIMD
fn update_particle_system_simd(pool: &mut SkillSystemMemory, delta_time: f32) {
    let particle_count = pool.particle_count;
    if particle_count == 0 {
        return;
    }

    let chunks = particle_count / SIMD_BATCH_SIZE;
    let delta_vec = f32x16::splat(delta_time);

    // Process complete SIMD batches
    for chunk in 0..chunks {
        let base = chunk * SIMD_BATCH_SIZE;

        // Load particle data
        let pos_x = f32x16::from_slice(&pool.particle_positions_x[base..base + SIMD_BATCH_SIZE]);
        let pos_y = f32x16::from_slice(&pool.particle_positions_y[base..base + SIMD_BATCH_SIZE]);
        let pos_z = f32x16::from_slice(&pool.particle_positions_z[base..base + SIMD_BATCH_SIZE]);
        let vel_x = f32x16::from_slice(&pool.particle_velocities_x[base..base + SIMD_BATCH_SIZE]);
        let vel_y = f32x16::from_slice(&pool.particle_velocities_y[base..base + SIMD_BATCH_SIZE]);
        let vel_z = f32x16::from_slice(&pool.particle_velocities_z[base..base + SIMD_BATCH_SIZE]);

        // Update positions
        let new_pos_x = pos_x + (vel_x * delta_vec);
        let new_pos_y = pos_y + (vel_y * delta_vec);
        let new_pos_z = pos_z + (vel_z * delta_vec);

        // Store results
        new_pos_x.copy_to_slice(&mut pool.particle_positions_x[base..base + SIMD_BATCH_SIZE]);
        new_pos_y.copy_to_slice(&mut pool.particle_positions_y[base..base + SIMD_BATCH_SIZE]);
        new_pos_z.copy_to_slice(&mut pool.particle_positions_z[base..base + SIMD_BATCH_SIZE]);
    }

    // Handle remaining elements with scalar operations
    let remaining_start = chunks * SIMD_BATCH_SIZE;
    for i in remaining_start..particle_count {
        pool.particle_positions_x[i] += pool.particle_velocities_x[i] * delta_time;
        pool.particle_positions_y[i] += pool.particle_velocities_y[i] * delta_time;
        pool.particle_positions_z[i] += pool.particle_velocities_z[i] * delta_time;
    }
}

// Update glow intensity based on hover states and proficiency
fn update_glow_intensity_simd(pool: &mut SkillSystemMemory, time: f32) {
    let count = pool.count;
    if count == 0 {
        return;
    }

    let chunks = count / SIMD_BATCH_SIZE;
    let time_vec = f32x16::splat(time);
    let base_glow = f32x16::splat(0.6);
    let pulse_amplitude = f32x16::splat(0.3);
    let pulse_frequency = f32x16::splat(2.0);

    // Process complete SIMD batches
    for chunk in 0..chunks {
        let base = chunk * SIMD_BATCH_SIZE;

        // Load proficiency values
        let proficiency_vec = f32x16::from_slice(&pool.proficiency[base..base + SIMD_BATCH_SIZE]);

        // Calculate pulsing effect
        let pulse_phase = time_vec * pulse_frequency;
        let pulse_value = fast_sin_lookup_simd_16(pulse_phase);
        let pulse_effect = pulse_value * pulse_amplitude;

        // Calculate final glow intensity
        let glow_intensity = base_glow + (proficiency_vec * f32x16::splat(0.4)) + pulse_effect;

        // Store results
        glow_intensity.copy_to_slice(&mut pool.glow_intensity[base..base + SIMD_BATCH_SIZE]);
    }

    // Handle remaining elements with scalar operations
    let remaining_start = chunks * SIMD_BATCH_SIZE;
    for i in remaining_start..count {
        let pulse_value = crate::math::fast_sin_lookup(time * 2.0);
        pool.glow_intensity[i] = 0.6 + pool.proficiency[i] * 0.4 + pulse_value * 0.3;
    }
}

#[wasm_bindgen]
pub struct SkillSystemUpdateResult {
    pub positions_dirty: bool,
    pub effects_dirty: bool,
    pub particles_dirty: bool,
    pub connections_dirty: bool,
}

// Main update function called every frame
#[wasm_bindgen]
pub fn update_skill_system(
    time: f32,
    delta_time: f32,
    mouse_x: f32,
    mouse_y: f32,
) -> SkillSystemUpdateResult {
    SKILL_SYSTEM_POOL.with(|pool_cell| {
        if let Some(pool) = pool_cell.borrow_mut().as_mut() {
            // Update orbital positions
            update_skill_positions_simd(pool, time);

            // Update particle system
            update_particle_system_simd(pool, delta_time);

            // Update glow intensity
            update_glow_intensity_simd(pool, time);

            // TODO: Add mouse parallax effect using mouse_x and mouse_y

            SkillSystemUpdateResult {
                positions_dirty: true,
                effects_dirty: true,
                particles_dirty: true,
                connections_dirty: false,
            }
        } else {
            SkillSystemUpdateResult {
                positions_dirty: false,
                effects_dirty: false,
                particles_dirty: false,
                connections_dirty: false,
            }
        }
    })
}

// Set hover state for a skill
#[wasm_bindgen]
pub fn set_skill_hover_state(skill_index: usize, is_hovered: bool) {
    SKILL_SYSTEM_POOL.with(|pool_cell| {
        if let Some(pool) = pool_cell.borrow_mut().as_mut() {
            if skill_index < pool.count {
                if is_hovered {
                    pool.hover_states |= 1u64 << skill_index;
                } else {
                    pool.hover_states &= !(1u64 << skill_index);
                }
            }
        }
    });
}

// Get hover state for a skill
#[wasm_bindgen]
pub fn get_skill_hover_state(skill_index: usize) -> bool {
    SKILL_SYSTEM_POOL.with(|pool_cell| {
        if let Some(pool) = pool_cell.borrow().as_ref() {
            if skill_index < pool.count {
                return (pool.hover_states & (1u64 << skill_index)) != 0;
            }
        }
        false
    })
}
