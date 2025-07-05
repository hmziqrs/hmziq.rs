use wasm_bindgen::prelude::*;
use crate::particles::MeteorSystem;
use crate::particle_system::ParticleSystem;

bitflags::bitflags! {
    pub struct DirtyFlags: u8 {
        const METEORS = 0b00000001;
        const PARTICLES = 0b00000010;
        const STARS = 0b00000100;
        const ALL = 0b11111111;
    }
}

pub struct HighWaterMarks {
    pub meteor_count: usize,
    pub particle_count: usize,
    pub memory_usage: usize,
    pub frame_time: f32,
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

pub struct MemoryStats {
    pub meteor_buffer_size: usize,
    pub particle_buffer_size: usize,
    pub total_allocated: usize,
    pub high_water_mark: usize,
}

#[wasm_bindgen]
pub struct RenderPipeline {
    // Independent subsystems
    meteor_system: MeteorSystem,
    particle_system: ParticleSystem,
    
    // Render infrastructure  
    render_buffer: AdaptiveRenderBuffer,
    dirty_flags: DirtyFlags,
    
    // Performance tracking
    frame_counter: u32,
    high_water_marks: HighWaterMarks,
    metrics: PerformanceMetrics,
    
    // Temporal coherence
    last_significant_change: f32,
    significant_change_threshold: f32,
}

#[wasm_bindgen]
impl RenderPipeline {
    #[wasm_bindgen(constructor)]
    pub fn new(canvas_width: f32, canvas_height: f32) -> RenderPipeline {
        RenderPipeline {
            meteor_system: MeteorSystem::new(canvas_width, canvas_height),
            particle_system: ParticleSystem::new(500), // max particles
            render_buffer: AdaptiveRenderBuffer::new(20, 500), // max meteors, max particles
            dirty_flags: DirtyFlags::ALL,
            frame_counter: 0,
            high_water_marks: HighWaterMarks {
                meteor_count: 0,
                particle_count: 0,
                memory_usage: 0,
                frame_time: 0.0,
            },
            metrics: PerformanceMetrics {
                update_times: RingBuffer::new(),
                pack_times: RingBuffer::new(),
                memory_usage: MemoryStats {
                    meteor_buffer_size: 0,
                    particle_buffer_size: 0,
                    total_allocated: 0,
                    high_water_mark: 0,
                },
                cache_hits: 0,
                cache_misses: 0,
            },
            last_significant_change: 0.0,
            significant_change_threshold: 0.1,
        }
    }
    
    pub fn update_all(&mut self, dt: f32, speed_multiplier: f32) -> u32 {
        let start_time = web_sys::window().unwrap().performance().unwrap().now() as f32;
        self.frame_counter += 1;
        
        // Temporal coherence - skip updates when possible
        let should_update_meteors = self.should_update_meteors();
        let should_update_particles = self.should_update_particles();
        
        // Update meteors
        if should_update_meteors {
            let active_meteors = self.meteor_system.update_meteors(speed_multiplier, 0); // quality_tier = 0
            if active_meteors > 0 || self.has_meteor_significant_changes() {
                self.dirty_flags |= DirtyFlags::METEORS;
            }
            
            // Update high water mark
            if active_meteors > self.high_water_marks.meteor_count {
                self.high_water_marks.meteor_count = active_meteors;
            }
        }
        
        // Generate spawn points from active meteors
        let spawn_points = self.get_meteor_spawn_points();
        let mut particles_spawned = false;
        
        for spawn_point in spawn_points {
            if spawn_point.should_spawn {
                if self.particle_system.spawn_for_meteor(
                    spawn_point.meteor_id,
                    spawn_point.x,
                    spawn_point.y,
                    spawn_point.vx,
                    spawn_point.vy,
                    &spawn_point.meteor_type
                ) {
                    particles_spawned = true;
                }
            }
        }
        
        // Update particles  
        if should_update_particles {
            self.particle_system.update_all(dt);
            if particles_spawned || self.particle_system.has_new_spawns() {
                self.dirty_flags |= DirtyFlags::PARTICLES;
            }
            
            // Update high water mark
            let active_particles = self.particle_system.get_active_count();
            if active_particles > self.high_water_marks.particle_count {
                self.high_water_marks.particle_count = active_particles;
            }
        }
        
        // Clean up particles for dying meteors
        let dying_meteors = self.get_dying_meteors();
        for meteor_id in dying_meteors {
            self.particle_system.free_meteor_particles(meteor_id);
        }
        
        // Pack render data if dirty
        let pack_start = web_sys::window().unwrap().performance().unwrap().now() as f32;
        if !self.dirty_flags.is_empty() {
            self.pack_render_data();
        }
        let pack_time = web_sys::window().unwrap().performance().unwrap().now() as f32 - pack_start;
        
        // Track performance
        let update_time = web_sys::window().unwrap().performance().unwrap().now() as f32 - start_time;
        self.metrics.update_times.push(update_time);
        self.metrics.pack_times.push(pack_time);
        
        if update_time > self.high_water_marks.frame_time {
            self.high_water_marks.frame_time = update_time;
        }
        
        self.dirty_flags.bits() as u32
    }
    
    fn has_meteor_significant_changes(&self) -> bool {
        // Check if significant change happened recently
        let current_time = web_sys::window().unwrap().performance().unwrap().now() as f32;
        current_time - self.last_significant_change < 100.0
    }
    
    fn should_update_meteors(&self) -> bool {
        // Skip update if no active meteors moved significantly
        self.has_meteor_significant_changes() || self.frame_counter % 3 == 0
    }
    
    fn should_update_particles(&self) -> bool {
        // Skip if particle count stable and no new spawns
        self.frame_counter % 2 == 0 || self.particle_system.has_new_spawns()
    }
    
    fn pack_render_data(&mut self) {
        // Pack header
        self.render_buffer.pack_header(
            self.meteor_system.get_active_meteor_count(),
            self.particle_system.get_active_count(),
            self.dirty_flags.bits() as u32,
            self.frame_counter,
            &self.metrics,
        );
        
        // Pack meteor data if dirty
        if self.dirty_flags.contains(DirtyFlags::METEORS) {
            self.render_buffer.pack_meteor_data(&self.meteor_system);
            self.metrics.cache_hits += 1;
        }
        
        // Pack particle data if dirty  
        if self.dirty_flags.contains(DirtyFlags::PARTICLES) {
            self.render_buffer.pack_particle_data(&self.particle_system);
            self.metrics.cache_hits += 1;
        }
    }
    
    pub fn spawn_meteor(
        &mut self,
        start_x: f32, start_y: f32,
        control_x: f32, control_y: f32,
        end_x: f32, end_y: f32,
        size: f32, speed: f32, max_life: f32,
        meteor_type: u8,
        color_r: f32, color_g: f32, color_b: f32,
        glow_r: f32, glow_g: f32, glow_b: f32,
        glow_intensity: f32
    ) -> bool {
        // Find an inactive meteor slot
        let active_count = self.meteor_system.get_active_meteor_count();
        if active_count >= 20 { // MAX_METEORS
            return false;
        }
        
        // Find first inactive meteor
        for i in 0..20 {
            // Try to init at this index
            self.meteor_system.init_meteor(
                i,
                start_x, start_y, control_x, control_y, end_x, end_y,
                size, speed, max_life, meteor_type,
                (color_r * 255.0) as u8,
                (color_g * 255.0) as u8,
                (color_b * 255.0) as u8,
                (glow_r * 255.0) as u8,
                (glow_g * 255.0) as u8,
                (glow_b * 255.0) as u8,
                glow_intensity
            );
            
            // If it worked, we're done
            self.dirty_flags |= DirtyFlags::METEORS;
            self.last_significant_change = web_sys::window().unwrap().performance().unwrap().now() as f32;
            return true;
        }
        
        false
    }
    
    pub fn mark_dirty(&mut self, system: u8) {
        self.dirty_flags |= DirtyFlags::from_bits_truncate(system);
    }
    
    pub fn get_metrics(&self) -> JsValue {
        let metrics = js_sys::Object::new();
        
        js_sys::Reflect::set(&metrics, &"frame_time".into(), &self.metrics.update_times.average().into()).unwrap();
        js_sys::Reflect::set(&metrics, &"active_meteors".into(), &self.meteor_system.get_active_meteor_count().into()).unwrap();
        js_sys::Reflect::set(&metrics, &"active_particles".into(), &self.particle_system.get_active_count().into()).unwrap();
        js_sys::Reflect::set(&metrics, &"memory_usage".into(), &self.metrics.memory_usage.total_allocated.into()).unwrap();
        js_sys::Reflect::set(&metrics, &"high_water_mark".into(), &self.metrics.memory_usage.high_water_mark.into()).unwrap();
        js_sys::Reflect::set(&metrics, &"cache_hits".into(), &self.metrics.cache_hits.into()).unwrap();
        js_sys::Reflect::set(&metrics, &"cache_misses".into(), &self.metrics.cache_misses.into()).unwrap();
        
        metrics.into()
    }
    
    fn adaptive_particle_limit(&self) -> usize {
        // Reduce particles if frame time exceeds budget
        match self.metrics.update_times.average() {
            t if t < 8.0 => 500,   // 120fps headroom
            t if t < 12.0 => 300,  // 60fps target  
            t if t < 16.0 => 200,  // 60fps struggling
            _ => 150,              // Degraded mode
        }
    }
    
    fn get_meteor_spawn_points(&self) -> Vec<crate::particle_system::SpawnPoint> {
        let mut spawn_points = Vec::new();
        let positions = self.meteor_system.get_meteor_positions();
        let properties = self.meteor_system.get_meteor_properties();
        let active_count = self.meteor_system.get_active_meteor_count();
        
        // For each active meteor, potentially create spawn points
        for i in 0..active_count {
            let x = positions.get_index((i * 2) as u32) as f32;
            let y = positions.get_index((i * 2 + 1) as u32) as f32;
            let life_progress = properties.get_index((i * 5 + 2) as u32) as f32;
            let meteor_type_idx = properties.get_index((i * 5 + 4) as u32) as f32;
            
            // Only spawn particles for meteors that are in their active phase
            if life_progress > 0.1 && life_progress < 0.9 {
                let meteor_type = match meteor_type_idx as u8 {
                    0 => "cool",
                    1 => "warm",
                    _ => "bright",
                }.to_string();
                
                spawn_points.push(crate::particle_system::SpawnPoint {
                    meteor_id: i,
                    x,
                    y,
                    vx: 0.0, // We'll estimate velocity from meteor angle
                    vy: 0.0,
                    meteor_type,
                    should_spawn: rand() < 0.2, // 20% chance
                });
            }
        }
        
        spawn_points
    }
    
    fn get_dying_meteors(&self) -> Vec<usize> {
        let mut dying = Vec::new();
        let properties = self.meteor_system.get_meteor_properties();
        let active_count = self.meteor_system.get_active_meteor_count();
        
        for i in 0..active_count {
            let life_progress = properties.get_index((i * 5 + 2) as u32) as f32;
            if life_progress > 0.9 {
                dying.push(i);
            }
        }
        
        dying
    }
    
    // Direct memory pointer methods for zero-copy access
    pub fn get_header_ptr(&self) -> *const u32 {
        self.render_buffer.get_header_ptr()
    }
    
    pub fn get_meteor_data_ptr(&self) -> *const f32 {
        self.render_buffer.get_meteor_data_ptr()
    }
    
    pub fn get_particle_data_ptr(&self) -> *const f32 {
        self.render_buffer.get_particle_data_ptr()
    }
    
    pub fn destroy(&mut self) {
        // Clean up resources
        self.dirty_flags = DirtyFlags::empty();
        self.frame_counter = 0;
    }
}

// Import AdaptiveRenderBuffer from render_buffer module
use crate::render_buffer::AdaptiveRenderBuffer;

// Simple pseudo-random number generator for deterministic results
fn rand() -> f32 {
    static mut SEED: u32 = 0x12345678;
    unsafe {
        SEED = SEED.wrapping_mul(1664525).wrapping_add(1013904223);
        (SEED >> 16) as f32 / 65536.0
    }
}