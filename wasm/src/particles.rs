use wasm_bindgen::prelude::*;
use js_sys::{Float32Array, Uint8Array};

// Maximum meteors and particles to pre-allocate
const MAX_METEORS: usize = 20;
const MAX_PARTICLES_PER_METEOR: usize = 10;
const MAX_TOTAL_PARTICLES: usize = MAX_METEORS * MAX_PARTICLES_PER_METEOR;
const BEZIER_SEGMENTS: usize = 60;

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub struct Vec2 {
    pub x: f32,
    pub y: f32,
}

#[wasm_bindgen]
impl Vec2 {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f32, y: f32) -> Vec2 {
        Vec2 { x, y }
    }
}

#[derive(Clone, Copy)]
struct Particle {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    life: f32,
    size: f32,
    opacity: f32,
    color_r: u8,
    color_g: u8,
    color_b: u8,
    active: bool,
}

impl Default for Particle {
    fn default() -> Self {
        Particle {
            x: 0.0,
            y: 0.0,
            vx: 0.0,
            vy: 0.0,
            life: 0.0,
            size: 0.0,
            opacity: 1.0,
            color_r: 255,
            color_g: 255,
            color_b: 255,
            active: false,
        }
    }
}

#[derive(Clone)]
struct Meteor {
    // Position and velocity
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    
    // Bezier path data
    start_x: f32,
    start_y: f32,
    control_x: f32,
    control_y: f32,
    end_x: f32,
    end_y: f32,
    
    // Pre-calculated path points (flattened x,y pairs)
    path_points: Vec<f32>,
    
    // Animation state
    life: f32,
    max_life: f32,
    size: f32,
    speed: f32,
    angle: f32,
    
    // Visual properties
    color_r: u8,
    color_g: u8,
    color_b: u8,
    glow_r: u8,
    glow_g: u8,
    glow_b: u8,
    glow_intensity: f32,
    
    // State
    active: bool,
    visible: bool,
    meteor_type: u8, // 0: cool, 1: warm, 2: bright
    
    // Particle indices (start, count)
    particle_start: usize,
    particle_count: usize,
}

impl Default for Meteor {
    fn default() -> Self {
        Meteor {
            x: 0.0,
            y: 0.0,
            vx: 0.0,
            vy: 0.0,
            start_x: 0.0,
            start_y: 0.0,
            control_x: 0.0,
            control_y: 0.0,
            end_x: 0.0,
            end_y: 0.0,
            path_points: vec![0.0; (BEZIER_SEGMENTS + 1) * 2],
            life: 0.0,
            max_life: 100.0,
            size: 0.5,
            speed: 1.0,
            angle: 0.0,
            color_r: 255,
            color_g: 255,
            color_b: 255,
            glow_r: 255,
            glow_g: 255,
            glow_b: 255,
            glow_intensity: 1.0,
            active: false,
            visible: true,
            meteor_type: 0,
            particle_start: 0,
            particle_count: 0,
        }
    }
}

#[wasm_bindgen]
pub struct MeteorSystem {
    meteors: Vec<Meteor>,
    particles: Vec<Particle>,
    particle_pool_cursor: usize,
    canvas_width: f32,
    canvas_height: f32,
}

#[wasm_bindgen]
impl MeteorSystem {
    #[wasm_bindgen(constructor)]
    pub fn new(canvas_width: f32, canvas_height: f32) -> MeteorSystem {
        let mut meteors = Vec::with_capacity(MAX_METEORS);
        for _ in 0..MAX_METEORS {
            meteors.push(Meteor::default());
        }
        
        let mut particles = Vec::with_capacity(MAX_TOTAL_PARTICLES);
        for _ in 0..MAX_TOTAL_PARTICLES {
            particles.push(Particle::default());
        }
        
        MeteorSystem {
            meteors,
            particles,
            particle_pool_cursor: 0,
            canvas_width,
            canvas_height,
        }
    }
    
    pub fn update_canvas_size(&mut self, width: f32, height: f32) {
        self.canvas_width = width;
        self.canvas_height = height;
    }
    
    // Initialize a meteor with bezier path
    pub fn init_meteor(
        &mut self,
        index: usize,
        start_x: f32,
        start_y: f32,
        control_x: f32,
        control_y: f32,
        end_x: f32,
        end_y: f32,
        size: f32,
        speed: f32,
        max_life: f32,
        meteor_type: u8,
        color_r: u8,
        color_g: u8,
        color_b: u8,
        glow_r: u8,
        glow_g: u8,
        glow_b: u8,
        glow_intensity: f32,
    ) {
        if index >= MAX_METEORS {
            return;
        }
        
        let meteor = &mut self.meteors[index];
        meteor.start_x = start_x;
        meteor.start_y = start_y;
        meteor.control_x = control_x;
        meteor.control_y = control_y;
        meteor.end_x = end_x;
        meteor.end_y = end_y;
        meteor.x = start_x;
        meteor.y = start_y;
        meteor.size = size;
        meteor.speed = speed;
        meteor.max_life = max_life;
        meteor.life = 0.0;
        meteor.meteor_type = meteor_type;
        meteor.color_r = color_r;
        meteor.color_g = color_g;
        meteor.color_b = color_b;
        meteor.glow_r = glow_r;
        meteor.glow_g = glow_g;
        meteor.glow_b = glow_b;
        meteor.glow_intensity = glow_intensity;
        meteor.active = true;
        meteor.visible = true;
        meteor.particle_start = 0;
        meteor.particle_count = 0;
        
        // Calculate angle from path
        let dx = end_x - start_x;
        let dy = end_y - start_y;
        meteor.angle = dy.atan2(dx);
        
        // Pre-calculate bezier path
        self.precalculate_meteor_path(index);
    }
    
    // Pre-calculate the bezier path for a meteor
    fn precalculate_meteor_path(&mut self, index: usize) {
        let meteor = &mut self.meteors[index];
        let segments = BEZIER_SEGMENTS;
        
        for i in 0..=segments {
            let t = i as f32 / segments as f32;
            let one_minus_t = 1.0 - t;
            let one_minus_t_sq = one_minus_t * one_minus_t;
            let t_sq = t * t;
            
            let x = one_minus_t_sq * meteor.start_x + 
                    2.0 * one_minus_t * t * meteor.control_x + 
                    t_sq * meteor.end_x;
            let y = one_minus_t_sq * meteor.start_y + 
                    2.0 * one_minus_t * t * meteor.control_y + 
                    t_sq * meteor.end_y;
            
            meteor.path_points[i * 2] = x;
            meteor.path_points[i * 2 + 1] = y;
        }
    }
    
    // Batch update all active meteors
    pub fn update_meteors(&mut self, speed_multiplier: f32, _quality_tier: u8) -> usize {
        let mut active_count = 0;
        let life_increment = speed_multiplier.min(2.0);
        
        // Collect position data and done status
        let mut meteor_updates = Vec::with_capacity(MAX_METEORS);
        
        for i in 0..MAX_METEORS {
            if !self.meteors[i].active {
                meteor_updates.push(None);
                continue;
            }
            
            active_count += 1;
            
            let meteor = &mut self.meteors[i];
            
            // Update life
            meteor.life += life_increment;
            let t = (meteor.life / meteor.max_life).min(1.0);
            
            // Interpolate position from pre-calculated path
            let segment_float = t * BEZIER_SEGMENTS as f32;
            let segment = segment_float as usize;
            let segment_t = segment_float - segment as f32;
            
            if segment < BEZIER_SEGMENTS {
                let idx = segment * 2;
                let next_idx = idx + 2;
                
                meteor.x = meteor.path_points[idx] + 
                          (meteor.path_points[next_idx] - meteor.path_points[idx]) * segment_t;
                meteor.y = meteor.path_points[idx + 1] + 
                          (meteor.path_points[next_idx + 1] - meteor.path_points[idx + 1]) * segment_t;
            } else {
                meteor.x = meteor.end_x;
                meteor.y = meteor.end_y;
            }
            
            // Update velocity for particle calculations
            if segment > 0 && segment < BEZIER_SEGMENTS {
                let prev_idx = (segment - 1) * 2;
                meteor.vx = (meteor.x - meteor.path_points[prev_idx]) / life_increment;
                meteor.vy = (meteor.y - meteor.path_points[prev_idx + 1]) / life_increment;
            }
            
            // Store update data
            let is_done = t >= 1.0 || meteor.life >= meteor.max_life;
            meteor_updates.push(Some((meteor.x, meteor.y, is_done, meteor.particle_start, meteor.particle_count)));
        }
        
        // Apply updates after mutable borrow is done
        for (i, update) in meteor_updates.iter().enumerate() {
            if let Some((x, y, is_done, particle_start, particle_count)) = update {
                // Check visibility
                self.meteors[i].visible = self.is_in_viewport(*x, *y, 50.0);
                
                // Handle done meteors
                if *is_done {
                    self.meteors[i].active = false;
                    // Release particles
                    for j in 0..*particle_count {
                        let particle_idx = (particle_start + j) % MAX_TOTAL_PARTICLES;
                        self.particles[particle_idx].active = false;
                    }
                    self.meteors[i].particle_count = 0;
                }
            }
        }
        
        active_count
    }
    
    // Update particles
    pub fn update_particles(&mut self, speed_multiplier: f32) {
        let life_increment = speed_multiplier.min(2.0);
        
        for particle in &mut self.particles {
            if !particle.active {
                continue;
            }
            
            // Update position
            particle.x += particle.vx * life_increment;
            particle.y += particle.vy * life_increment;
            particle.life += life_increment;
            
            // Air resistance
            particle.vx *= 0.99;
            particle.vy *= 0.99;
            
            // Slight drift
            particle.vx += (js_sys::Math::random() as f32 - 0.5) * 0.02 * life_increment;
            particle.vy += (js_sys::Math::random() as f32 - 0.5) * 0.02 * life_increment;
            
            // Check lifetime
            if particle.life >= 50.0 {
                particle.active = false;
            }
        }
    }
    
    // Spawn particle for a meteor
    pub fn spawn_particle(
        &mut self,
        meteor_index: usize,
        spawn_rate: f32,
        max_particles: usize,
    ) -> bool {
        if meteor_index >= MAX_METEORS {
            return false;
        }
        
        let meteor = &self.meteors[meteor_index];
        if !meteor.active || meteor.particle_count >= max_particles {
            return false;
        }
        
        // Check spawn rate
        if js_sys::Math::random() as f32 >= spawn_rate {
            return false;
        }
        
        // Find free particle slot
        let mut particle_idx = self.particle_pool_cursor;
        let mut found = false;
        
        for _ in 0..MAX_TOTAL_PARTICLES {
            if !self.particles[particle_idx].active {
                found = true;
                break;
            }
            particle_idx = (particle_idx + 1) % MAX_TOTAL_PARTICLES;
        }
        
        if !found {
            return false;
        }
        
        // Initialize particle
        let particle = &mut self.particles[particle_idx];
        let meteor = &self.meteors[meteor_index];
        
        // Position with random offset
        particle.x = meteor.x + (js_sys::Math::random() as f32 - 0.5) * meteor.size * 2.0;
        particle.y = meteor.y + (js_sys::Math::random() as f32 - 0.5) * meteor.size * 2.0;
        
        // Backward motion
        particle.vx = -meteor.vx * (0.1 + js_sys::Math::random() as f32 * 0.15);
        particle.vy = -meteor.vy * (0.1 + js_sys::Math::random() as f32 * 0.15);
        
        // Lateral spread
        let lateral_speed = 0.4 + js_sys::Math::random() as f32 * 0.4;
        let lateral_angle = js_sys::Math::random() as f32 * std::f32::consts::PI * 2.0;
        
        particle.vx += lateral_angle.cos() * lateral_speed;
        particle.vy += lateral_angle.sin() * lateral_speed;
        
        particle.life = 0.0;
        particle.size = 0.21 * (0.9 + js_sys::Math::random() as f32 * 0.2);
        particle.opacity = 0.64;
        particle.color_r = meteor.glow_r;
        particle.color_g = meteor.glow_g;
        particle.color_b = meteor.glow_b;
        particle.active = true;
        
        // Update cursor
        self.particle_pool_cursor = (particle_idx + 1) % MAX_TOTAL_PARTICLES;
        
        // Track particle with meteor
        if meteor.particle_count == 0 {
            self.meteors[meteor_index].particle_start = particle_idx;
        }
        self.meteors[meteor_index].particle_count += 1;
        
        true
    }
    
    // Get meteor positions for rendering
    pub fn get_meteor_positions(&self) -> Float32Array {
        let mut positions = Vec::with_capacity(MAX_METEORS * 2);
        
        for meteor in &self.meteors {
            if meteor.active && meteor.visible {
                positions.push(meteor.x);
                positions.push(meteor.y);
            } else {
                positions.push(-1.0); // Sentinel value
                positions.push(-1.0);
            }
        }
        
        Float32Array::from(&positions[..])
    }
    
    // Get meteor properties for rendering
    pub fn get_meteor_properties(&self) -> Float32Array {
        let mut props = Vec::with_capacity(MAX_METEORS * 5);
        
        for meteor in &self.meteors {
            if meteor.active {
                props.push(meteor.size);
                props.push(meteor.glow_intensity);
                props.push(meteor.life / meteor.max_life);
                props.push(meteor.angle);
                props.push(meteor.meteor_type as f32);
            } else {
                props.extend(&[0.0; 5]);
            }
        }
        
        Float32Array::from(&props[..])
    }
    
    // Get particle data for rendering
    pub fn get_particle_data(&self) -> Float32Array {
        let mut data = Vec::with_capacity(MAX_TOTAL_PARTICLES * 5);
        
        for particle in &self.particles {
            if particle.active {
                data.push(particle.x);
                data.push(particle.y);
                data.push(particle.size);
                data.push(particle.opacity * (1.0 - particle.life / 50.0).powf(0.3));
                data.push(1.0); // Active flag
            } else {
                data.extend(&[0.0, 0.0, 0.0, 0.0, 0.0]);
            }
        }
        
        Float32Array::from(&data[..])
    }
    
    // Get particle colors
    pub fn get_particle_colors(&self) -> Uint8Array {
        let mut colors = Vec::with_capacity(MAX_TOTAL_PARTICLES * 3);
        
        for particle in &self.particles {
            colors.push(particle.color_r);
            colors.push(particle.color_g);
            colors.push(particle.color_b);
        }
        
        Uint8Array::from(&colors[..])
    }
    
    // Helper: Check if position is in viewport
    fn is_in_viewport(&self, x: f32, y: f32, margin: f32) -> bool {
        x >= -margin && 
        x <= self.canvas_width + margin && 
        y >= -margin && 
        y <= self.canvas_height + margin
    }
    
    // Get active meteor count
    pub fn get_active_meteor_count(&self) -> usize {
        self.meteors.iter().filter(|m| m.active).count()
    }
    
    // Get active particle count
    pub fn get_active_particle_count(&self) -> usize {
        self.particles.iter().filter(|p| p.active).count()
    }
}

// Batch operations for multiple meteors
#[wasm_bindgen]
pub fn batch_interpolate_meteor_positions(
    life_values: &[f32],
    max_life_values: &[f32],
    path_data: &[f32], // Flattened array of all meteor paths
    path_stride: usize, // Number of floats per path
) -> Vec<f32> {
    let meteor_count = life_values.len();
    let mut positions = Vec::with_capacity(meteor_count * 2);
    
    for i in 0..meteor_count {
        let t = (life_values[i] / max_life_values[i]).min(1.0);
        let path_offset = i * path_stride;
        
        let segment_float = t * (BEZIER_SEGMENTS as f32);
        let segment = segment_float as usize;
        let segment_t = segment_float - segment as f32;
        
        if segment < BEZIER_SEGMENTS {
            let idx = path_offset + segment * 2;
            let next_idx = idx + 2;
            
            let x = path_data[idx] + (path_data[next_idx] - path_data[idx]) * segment_t;
            let y = path_data[idx + 1] + (path_data[next_idx + 1] - path_data[idx + 1]) * segment_t;
            
            positions.push(x);
            positions.push(y);
        } else {
            // Use end position
            let end_idx = path_offset + BEZIER_SEGMENTS * 2;
            positions.push(path_data[end_idx]);
            positions.push(path_data[end_idx + 1]);
        }
    }
    
    positions
}