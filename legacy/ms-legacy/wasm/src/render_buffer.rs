use crate::particles::MeteorSystem;
use crate::particle_system::ParticleSystem;

pub struct MemoryStats {
    pub meteor_buffer_size: usize,
    pub particle_buffer_size: usize,
    pub total_allocated: usize,
    pub high_water_mark: usize,
}

pub struct PerformanceMetrics {
    pub update_times: RingBuffer<f32, 60>,
    pub pack_times: RingBuffer<f32, 60>,
    pub memory_usage: MemoryStats,
    pub cache_hits: u32,
    pub cache_misses: u32,
}

pub struct RingBuffer<T, const N: usize> {
    data: [T; N],
    head: usize,
    count: usize,
}

impl<T: Copy + Default, const N: usize> RingBuffer<T, N> {
    pub fn new() -> Self {
        Self {
            data: [T::default(); N],
            head: 0,
            count: 0,
        }
    }
    
    pub fn push(&mut self, value: T) {
        self.data[self.head] = value;
        self.head = (self.head + 1) % N;
        if self.count < N {
            self.count += 1;
        }
    }
    
    pub fn average(&self) -> f32 
    where T: Into<f32> + Copy {
        if self.count == 0 {
            return 0.0;
        }
        let sum: f32 = self.data[..self.count].iter().map(|&x| x.into()).sum();
        sum / self.count as f32
    }
}

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
        dirty_flags: u8,
        frame_number: u32,
        metrics: &PerformanceMetrics,
    ) {
        self.header_buffer[0] = meteor_count as u32;
        self.header_buffer[1] = particle_count as u32;
        self.header_buffer[2] = dirty_flags as u32;
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
        // Pack meteor data efficiently
        let data = meteor_system.get_packed_render_data();
        let copy_size = std::cmp::min(data.len(), self.meteor_buffer.len());
        self.meteor_buffer[..copy_size].copy_from_slice(&data[..copy_size]);
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