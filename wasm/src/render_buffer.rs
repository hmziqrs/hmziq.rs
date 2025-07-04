use crate::particles::MeteorSystem;
use crate::particle_system::ParticleSystem;
use crate::render_pipeline::{PerformanceMetrics, MemoryStats};

pub struct AdaptiveRenderBuffer {
    // Separate buffers for each system
    header_buffer: Vec<u32>,
    meteor_buffer: Vec<f32>,
    particle_buffer: Vec<f32>,
    
    // Track actual usage
    meteor_count: usize,
    particle_count: usize,
    max_meteors: usize,
    max_particles: usize,
    
    // Grow/shrink based on high water marks
    reallocation_threshold: f32,
    last_reallocation: f32,
}

impl AdaptiveRenderBuffer {
    pub fn new(max_meteors: usize, max_particles: usize) -> Self {
        let header_size = 16; // u32 values
        let meteor_buffer_size = max_meteors * 8; // [x, y, size, angle, glow, life, type, active]
        let particle_buffer_size = max_particles * 6; // [x, y, vx, vy, size, opacity]
        
        Self {
            header_buffer: vec![0; header_size],
            meteor_buffer: vec![0.0; meteor_buffer_size],
            particle_buffer: vec![0.0; particle_buffer_size],
            meteor_count: 0,
            particle_count: 0,
            max_meteors,
            max_particles,
            reallocation_threshold: 0.8, // Reallocate when 80% full
            last_reallocation: 0.0,
        }
    }
    
    pub fn pack_header(
        &mut self,
        meteor_count: usize,
        particle_count: usize,
        dirty_flags: u32,
        frame_number: u32,
        metrics: &PerformanceMetrics,
    ) {
        self.header_buffer[0] = meteor_count as u32;
        self.header_buffer[1] = particle_count as u32;
        self.header_buffer[2] = dirty_flags;
        self.header_buffer[3] = frame_number;
        self.header_buffer[4] = metrics.update_times.average() as u32;
        self.header_buffer[5] = metrics.memory_usage.total_allocated as u32;
        self.header_buffer[6] = metrics.memory_usage.high_water_mark as u32;
        self.header_buffer[7] = metrics.cache_hits;
        self.header_buffer[8] = metrics.cache_misses;
        self.header_buffer[9] = metrics.update_times.average() as u32;
        self.header_buffer[10] = metrics.pack_times.average() as u32;
        // 11-15: reserved
        
        self.meteor_count = meteor_count;
        self.particle_count = particle_count;
        
        // Check if we need to reallocate
        self.check_reallocation_needed();
    }
    
    pub fn pack_meteor_data(&mut self, meteor_system: &MeteorSystem) {
        // Pack meteor data from separate arrays
        let positions = meteor_system.get_meteor_positions();
        let properties = meteor_system.get_meteor_properties();
        let active_count = meteor_system.get_active_meteor_count();
        
        let mut write_pos = 0;
        for i in 0..active_count {
            if write_pos + 8 > self.meteor_buffer.len() {
                break;
            }
            
            // Pack as [x, y, size, angle, glow, life, type, active]
            self.meteor_buffer[write_pos] = positions.get_index((i * 2) as u32) as f32;
            self.meteor_buffer[write_pos + 1] = positions.get_index((i * 2 + 1) as u32) as f32;
            self.meteor_buffer[write_pos + 2] = properties.get_index((i * 5) as u32) as f32; // size
            self.meteor_buffer[write_pos + 3] = properties.get_index((i * 5 + 3) as u32) as f32; // angle
            self.meteor_buffer[write_pos + 4] = properties.get_index((i * 5 + 1) as u32) as f32; // glow_intensity
            self.meteor_buffer[write_pos + 5] = properties.get_index((i * 5 + 2) as u32) as f32; // life_progress
            self.meteor_buffer[write_pos + 6] = properties.get_index((i * 5 + 4) as u32) as f32; // type
            self.meteor_buffer[write_pos + 7] = 1.0; // active
            
            write_pos += 8;
        }
    }
    
    pub fn pack_particle_data(&mut self, particle_system: &ParticleSystem) {
        // Pack particle data efficiently
        let data = particle_system.get_packed_render_data();
        let copy_size = std::cmp::min(data.len(), self.particle_buffer.len());
        self.particle_buffer[..copy_size].copy_from_slice(&data[..copy_size]);
    }
    
    fn check_reallocation_needed(&mut self) {
        let meteor_usage = self.meteor_count as f32 / self.max_meteors as f32;
        let particle_usage = self.particle_count as f32 / self.max_particles as f32;
        
        // Grow if we're near capacity
        if meteor_usage > self.reallocation_threshold {
            self.grow_meteor_buffer();
        }
        if particle_usage > self.reallocation_threshold {
            self.grow_particle_buffer();
        }
        
        // Shrink if we're using much less than allocated (but not too frequently)
        let current_time = web_sys::window().unwrap().performance().unwrap().now() as f32;
        if current_time - self.last_reallocation > 5000.0 { // 5 seconds
            if meteor_usage < 0.3 && self.max_meteors > 10 {
                self.shrink_meteor_buffer();
            }
            if particle_usage < 0.3 && self.max_particles > 100 {
                self.shrink_particle_buffer();
            }
        }
    }
    
    fn grow_meteor_buffer(&mut self) {
        let new_size = (self.max_meteors as f32 * 1.5) as usize;
        self.max_meteors = new_size;
        self.meteor_buffer.resize(new_size * 8, 0.0);
        self.last_reallocation = web_sys::window().unwrap().performance().unwrap().now() as f32;
        
        web_sys::console::log_1(&format!("Meteor buffer grown to {}", new_size).into());
    }
    
    fn grow_particle_buffer(&mut self) {
        let new_size = (self.max_particles as f32 * 1.5) as usize;
        self.max_particles = new_size;
        self.particle_buffer.resize(new_size * 6, 0.0);
        self.last_reallocation = web_sys::window().unwrap().performance().unwrap().now() as f32;
        
        web_sys::console::log_1(&format!("Particle buffer grown to {}", new_size).into());
    }
    
    fn shrink_meteor_buffer(&mut self) {
        let new_size = std::cmp::max(10, (self.max_meteors as f32 * 0.7) as usize);
        self.max_meteors = new_size;
        self.meteor_buffer.resize(new_size * 8, 0.0);
        self.last_reallocation = web_sys::window().unwrap().performance().unwrap().now() as f32;
        
        web_sys::console::log_1(&format!("Meteor buffer shrunk to {}", new_size).into());
    }
    
    fn shrink_particle_buffer(&mut self) {
        let new_size = std::cmp::max(100, (self.max_particles as f32 * 0.7) as usize);
        self.max_particles = new_size;
        self.particle_buffer.resize(new_size * 6, 0.0);
        self.last_reallocation = web_sys::window().unwrap().performance().unwrap().now() as f32;
        
        web_sys::console::log_1(&format!("Particle buffer shrunk to {}", new_size).into());
    }
    
    // Direct memory access methods for zero-copy
    pub fn get_header_ptr(&self) -> *const u32 {
        self.header_buffer.as_ptr()
    }
    
    pub fn get_meteor_data_ptr(&self) -> *const f32 {
        self.meteor_buffer.as_ptr()
    }
    
    pub fn get_particle_data_ptr(&self) -> *const f32 {
        self.particle_buffer.as_ptr()
    }
    
    pub fn get_memory_stats(&self) -> MemoryStats {
        MemoryStats {
            meteor_buffer_size: self.meteor_buffer.len() * 4, // f32 = 4 bytes
            particle_buffer_size: self.particle_buffer.len() * 4,
            total_allocated: (self.header_buffer.len() * 4) + 
                           (self.meteor_buffer.len() * 4) + 
                           (self.particle_buffer.len() * 4),
            high_water_mark: std::cmp::max(
                self.meteor_count * 8 * 4,
                self.particle_count * 6 * 4
            ),
        }
    }
}