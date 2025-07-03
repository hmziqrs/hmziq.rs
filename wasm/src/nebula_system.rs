use wasm_bindgen::prelude::*;
use js_sys::Float32Array;
use crate::particle_pool::{ParticlePool, ParticleData};
use crate::physics_utils::{PhysicsUtils, FastRandom};
use crate::batch_transfer::TypedBatchTransfer;

const MAX_NEBULA_PARTICLES: usize = 100;
const SYSTEM_ID: usize = 2; // Unique ID for nebula system

#[wasm_bindgen]
pub struct NebulaSystem {
    // Particle management
    particle_indices: Vec<usize>,
    particle_data: Vec<ParticleData>,
    active_count: usize,
    
    // Physics
    random: FastRandom,
    time: f32,
    
    // Canvas dimensions
    canvas_width: f32,
    canvas_height: f32,
}

#[wasm_bindgen]
impl NebulaSystem {
    #[wasm_bindgen(constructor)]
    pub fn new(canvas_width: f32, canvas_height: f32) -> NebulaSystem {
        NebulaSystem {
            particle_indices: Vec::with_capacity(MAX_NEBULA_PARTICLES),
            particle_data: vec![ParticleData::default(); MAX_NEBULA_PARTICLES],
            active_count: 0,
            random: FastRandom::new(42),
            time: 0.0,
            canvas_width,
            canvas_height,
        }
    }
    
    pub fn update_canvas_size(&mut self, width: f32, height: f32) {
        self.canvas_width = width;
        self.canvas_height = height;
    }
    
    // Initialize nebula particles using the shared pool
    pub fn init_particles(&mut self, pool: &mut ParticlePool, count: usize) -> bool {
        let actual_count = count.min(MAX_NEBULA_PARTICLES);
        
        // Try to allocate from pool
        if let Some(indices) = pool.allocate_block(actual_count, SYSTEM_ID) {
            self.particle_indices = indices;
            self.active_count = actual_count;
            
            // Initialize particle data
            for i in 0..actual_count {
                let particle = &mut self.particle_data[i];
                
                // Random position across canvas
                particle.x = self.random.range(0.0, self.canvas_width);
                particle.y = self.random.range(0.0, self.canvas_height);
                
                // Very slow movement for nebula effect
                let angle = self.random.angle();
                let speed = self.random.range(0.05, 0.2);
                particle.vx = angle.cos() * speed;
                particle.vy = angle.sin() * speed;
                
                // Size varies for depth effect
                particle.size = self.random.range(20.0, 80.0);
                
                // Low opacity for ethereal effect
                particle.opacity = self.random.range(0.1, 0.3);
                
                // Life cycle for pulsing
                particle.life = self.random.range(0.0, 100.0);
                particle.custom1 = self.random.range(0.5, 2.0); // Pulse speed
                particle.custom2 = self.random.range(0.0, std::f32::consts::PI * 2.0); // Phase offset
                
                // Bluish/purplish colors
                let color_type = self.random.next();
                let (r, g, b) = if color_type < 0.5 {
                    // Blue variant
                    (
                        (100.0 + self.random.range(0.0, 50.0)) as u8,
                        (150.0 + self.random.range(0.0, 50.0)) as u8,
                        255
                    )
                } else {
                    // Purple variant
                    (
                        (150.0 + self.random.range(0.0, 50.0)) as u8,
                        (100.0 + self.random.range(0.0, 50.0)) as u8,
                        (200.0 + self.random.range(0.0, 55.0)) as u8
                    )
                };
                
                particle.color_packed = ParticleData::pack_color(r, g, b, 255);
            }
            
            true
        } else {
            false
        }
    }
    
    // Update nebula particles
    pub fn update(&mut self, delta_time: f32, _pool: &ParticlePool) {
        self.time += delta_time;
        let dt = delta_time.min(0.1);
        
        for i in 0..self.active_count {
            let particle = &mut self.particle_data[i];
            
            // Swirling motion
            let swirl_strength = 0.02;
            let center_x = self.canvas_width * 0.5;
            let center_y = self.canvas_height * 0.5;
            
            // Calculate distance from center
            let dx = particle.x - center_x;
            let dy = particle.y - center_y;
            let dist = (dx * dx + dy * dy).sqrt();
            
            if dist > 10.0 {
                // Apply vortex force
                let angle = dy.atan2(dx);
                let tangent_x = -angle.sin();
                let tangent_y = angle.cos();
                
                particle.vx += tangent_x * swirl_strength * dt;
                particle.vy += tangent_y * swirl_strength * dt;
            }
            
            // Apply slight drag
            let drag_result = PhysicsUtils::apply_drag_2d(particle.vx, particle.vy, 0.01);
            particle.vx = drag_result[0];
            particle.vy = drag_result[1];
            
            // Update position
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            
            // Wrap around edges
            if particle.x < -particle.size {
                particle.x = self.canvas_width + particle.size;
            } else if particle.x > self.canvas_width + particle.size {
                particle.x = -particle.size;
            }
            
            if particle.y < -particle.size {
                particle.y = self.canvas_height + particle.size;
            } else if particle.y > self.canvas_height + particle.size {
                particle.y = -particle.size;
            }
            
            // Update life and pulsing
            particle.life += dt;
            
            // Calculate pulsing opacity
            let pulse_phase = particle.life * particle.custom1 + particle.custom2;
            let pulse = (pulse_phase.sin() + 1.0) * 0.5;
            let base_opacity = particle.opacity;
            particle.opacity = base_opacity * (0.7 + pulse * 0.3);
            
            // Size pulsing
            let base_size = particle.size;
            particle.size = base_size * (0.9 + pulse * 0.2);
        }
    }
    
    // Get render data optimized for nebula rendering
    pub fn get_render_data(&self) -> Float32Array {
        let mut x = Vec::with_capacity(self.active_count);
        let mut y = Vec::with_capacity(self.active_count);
        let mut radii = Vec::with_capacity(self.active_count);
        let mut inner_radii = Vec::with_capacity(self.active_count);
        let mut opacities = Vec::with_capacity(self.active_count);
        let mut pulse_phases = Vec::with_capacity(self.active_count);
        
        for i in 0..self.active_count {
            let particle = &self.particle_data[i];
            x.push(particle.x);
            y.push(particle.y);
            radii.push(particle.size);
            inner_radii.push(particle.size * 0.3); // Inner glow radius
            opacities.push(particle.opacity);
            
            // Calculate current pulse phase for smooth animation
            let phase = particle.life * particle.custom1 + particle.custom2;
            pulse_phases.push(phase);
        }
        
        TypedBatchTransfer::pack_nebula_particles(
            &x, &y, &radii, &inner_radii, &opacities, &pulse_phases,
            self.active_count
        )
    }
    
    // Get color data for rendering
    pub fn get_color_data(&self) -> Float32Array {
        let mut colors = Vec::with_capacity(self.active_count * 3);
        
        for i in 0..self.active_count {
            let (r, g, b, _) = self.particle_data[i].unpack_color();
            colors.push(r as f32 / 255.0);
            colors.push(g as f32 / 255.0);
            colors.push(b as f32 / 255.0);
        }
        
        Float32Array::from(&colors[..])
    }
    
    // Check for overlapping particles (for glow intensification)
    pub fn find_overlaps(&self, overlap_threshold: f32) -> Float32Array {
        let mut overlaps = Vec::new();
        
        for i in 0..self.active_count {
            let p1 = &self.particle_data[i];
            
            for j in (i + 1)..self.active_count {
                let p2 = &self.particle_data[j];
                
                let dist_sq = PhysicsUtils::distance_squared(p1.x, p1.y, p2.x, p2.y);
                let combined_radius = p1.size + p2.size;
                let overlap_dist = combined_radius * overlap_threshold;
                
                if dist_sq < overlap_dist * overlap_dist {
                    // Calculate overlap intensity
                    let dist = dist_sq.sqrt();
                    let overlap_amount = 1.0 - (dist / overlap_dist);
                    
                    // Store overlap data: [x1, y1, x2, y2, intensity]
                    overlaps.push(p1.x);
                    overlaps.push(p1.y);
                    overlaps.push(p2.x);
                    overlaps.push(p2.y);
                    overlaps.push(overlap_amount);
                }
            }
        }
        
        Float32Array::from(&overlaps[..])
    }
    
    // Cleanup
    pub fn release(&mut self, pool: &mut ParticlePool) {
        pool.free_system(SYSTEM_ID);
        self.particle_indices.clear();
        self.active_count = 0;
    }
    
    pub fn get_active_count(&self) -> usize {
        self.active_count
    }
}