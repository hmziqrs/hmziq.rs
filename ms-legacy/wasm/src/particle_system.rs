use std::collections::{HashMap, VecDeque};

#[derive(Clone, Copy)]
pub struct Particle {
    pub active: bool,
    pub x: f32,
    pub y: f32,
    pub vx: f32,
    pub vy: f32,
    pub size: f32,
    pub opacity: f32,
    pub life: f32,
    pub color_r: u8,
    pub color_g: u8,
    pub color_b: u8,
}

impl Default for Particle {
    fn default() -> Self {
        Self {
            active: false,
            x: 0.0,
            y: 0.0,
            vx: 0.0,
            vy: 0.0,
            size: 0.0,
            opacity: 0.0,
            life: 0.0,
            color_r: 255,
            color_g: 255,
            color_b: 255,
        }
    }
}

pub struct ParticleSystem {
    particles: Vec<Particle>,
    free_indices: VecDeque<usize>,
    meteor_associations: HashMap<usize, Vec<usize>>,
    active_count: usize,
    has_new_spawns: bool,
    last_spawn_time: f32,
    max_particles: usize,
}

impl ParticleSystem {
    pub fn new(max_particles: usize) -> Self {
        let mut particles = Vec::with_capacity(max_particles);
        let mut free_indices = VecDeque::with_capacity(max_particles);
        
        for i in 0..max_particles {
            particles.push(Particle::default());
            free_indices.push_back(i);
        }
        
        Self {
            particles,
            free_indices,
            meteor_associations: HashMap::new(),
            active_count: 0,
            has_new_spawns: false,
            last_spawn_time: 0.0,
            max_particles,
        }
    }
    
    pub fn spawn_for_meteor(
        &mut self, 
        meteor_id: usize, 
        x: f32, 
        y: f32,
        vx: f32,
        vy: f32,
        meteor_type: u8
    ) -> bool {
        if let Some(index) = self.free_indices.pop_front() {
            let particle = &mut self.particles[index];
            
            // Initialize particle
            particle.active = true;
            particle.x = x + (rand() - 0.5) * 4.0;
            particle.y = y + (rand() - 0.5) * 4.0;
            particle.vx = -vx * (0.1 + rand() * 0.15);
            particle.vy = -vy * (0.1 + rand() * 0.15);
            
            // Add lateral velocity for natural spread
            let lateral_speed = 0.4 + rand() * 0.4;
            let lateral_angle = rand() * std::f32::consts::PI * 2.0;
            particle.vx += lateral_angle.cos() * lateral_speed;
            particle.vy += lateral_angle.sin() * lateral_speed;
            
            particle.life = 0.0;
            particle.size = 0.21 * (0.9 + rand() * 0.2);
            particle.opacity = 0.64;
            
            // Set color based on meteor type
            match meteor_type {
                0 => { // cool
                    particle.color_r = 100;
                    particle.color_g = 180;
                    particle.color_b = 255;
                },
                1 => { // warm
                    particle.color_r = 255;
                    particle.color_g = 200;
                    particle.color_b = 100;
                },
                _ => { // bright
                    particle.color_r = 255;
                    particle.color_g = 255;
                    particle.color_b = 255;
                }
            }
            
            // Track association
            self.meteor_associations
                .entry(meteor_id)
                .or_insert_with(Vec::new)
                .push(index);
            
            self.active_count += 1;
            self.has_new_spawns = true;
            self.last_spawn_time = web_sys::window().unwrap().performance().unwrap().now() as f32;
            
            true
        } else {
            false
        }
    }
    
    pub fn update_all(&mut self, dt: f32) {
        self.has_new_spawns = false;
        
        for i in 0..self.particles.len() {
            let particle = &mut self.particles[i];
            if !particle.active { continue; }
            
            // Update physics
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.life += dt;
            
            // Apply drag
            particle.vx *= 0.99;
            particle.vy *= 0.99;
            
            // Random drift for more natural movement
            particle.vx += (rand() - 0.5) * 0.02 * dt;
            particle.vy += (rand() - 0.5) * 0.02 * dt;
            
            // Fade out over lifetime
            let fade_ratio = (1.0 - particle.life / 50.0).powf(0.3);
            particle.opacity = 0.64 * fade_ratio;
            
            // Check lifetime
            if particle.life >= 50.0 || particle.opacity <= 0.01 {
                self.free_particle(i);
            }
        }
    }
    
    fn free_particle(&mut self, index: usize) {
        let particle = &mut self.particles[index];
        if !particle.active { return; }
        
        particle.active = false;
        self.free_indices.push_back(index);
        self.active_count -= 1;
        
        // Remove from associations
        for (_, indices) in self.meteor_associations.iter_mut() {
            if let Some(pos) = indices.iter().position(|&i| i == index) {
                indices.swap_remove(pos);
                break;
            }
        }
    }
    
    pub fn free_meteor_particles(&mut self, meteor_id: usize) {
        if let Some(indices) = self.meteor_associations.remove(&meteor_id) {
            for index in indices {
                self.free_particle(index);
            }
        }
    }
    
    pub fn get_packed_render_data(&self) -> Vec<f32> {
        let mut data = Vec::with_capacity(self.active_count * 6);
        
        for particle in &self.particles {
            if particle.active {
                // Pack as [x, y, vx, vy, size, opacity]
                data.push(particle.x);
                data.push(particle.y);
                data.push(particle.vx);
                data.push(particle.vy);
                data.push(particle.size);
                data.push(particle.opacity);
            }
        }
        
        data
    }
    
    pub fn get_active_count(&self) -> usize {
        self.active_count
    }
    
    pub fn has_new_spawns(&self) -> bool {
        let current_time = web_sys::window().unwrap().performance().unwrap().now() as f32;
        self.has_new_spawns || (current_time - self.last_spawn_time < 50.0)
    }
    
    pub fn get_free_count(&self) -> usize {
        self.free_indices.len()
    }
    
    pub fn get_capacity(&self) -> usize {
        self.max_particles
    }
}

// Simple random number generator for demo (replace with proper RNG)
fn rand() -> f32 {
    js_sys::Math::random() as f32
}