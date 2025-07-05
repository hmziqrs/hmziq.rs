use wasm_bindgen::prelude::*;
use crate::particles::MeteorSystem;
use crate::particle_system::ParticleSystem;
use crate::render_buffer::{AdaptiveRenderBuffer, PerformanceMetrics, MemoryStats, RingBuffer};

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
            let active_meteors = self.meteor_system.update_meteors(dt, speed_multiplier);
            if active_meteors > 0 || self.meteor_system.has_significant_changes() {
                self.dirty_flags |= DirtyFlags::METEORS;
            }
            
            // Update high water mark
            if active_meteors > self.high_water_marks.meteor_count {
                self.high_water_marks.meteor_count = active_meteors;
            }
        }
        
        // Get spawn points and spawn particles
        let spawn_points = self.meteor_system.get_spawn_points();
        let mut particles_spawned = false;
        
        for spawn_point in spawn_points {
            if spawn_point.should_spawn {
                if self.particle_system.spawn_for_meteor(
                    spawn_point.meteor_id,
                    spawn_point.x,
                    spawn_point.y,
                    spawn_point.vx,
                    spawn_point.vy,
                    spawn_point.meteor_type
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
        let dying_meteors = self.meteor_system.get_dying_meteors();
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
    
    fn should_update_meteors(&self) -> bool {
        // Skip update if no active meteors moved significantly
        self.meteor_system.has_significant_changes() || self.frame_counter % 3 == 0
    }
    
    fn should_update_particles(&self) -> bool {
        // Skip if particle count stable and no new spawns
        self.frame_counter % 2 == 0 || self.particle_system.has_new_spawns()
    }
    
    fn pack_render_data(&mut self) {
        // Pack header
        self.render_buffer.pack_header(
            self.meteor_system.get_active_count(),
            self.particle_system.get_active_count(),
            self.dirty_flags.bits(),
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
    
    pub fn update_canvas_size(&mut self, width: f32, height: f32) {
        self.meteor_system.update_canvas_size(width, height);
        // Mark as dirty to force re-render
        self.dirty_flags |= DirtyFlags::ALL;
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
        let success = self.meteor_system.init_meteor(
            start_x, start_y, control_x, control_y, end_x, end_y,
            size, speed, max_life, meteor_type,
            color_r, color_g, color_b,
            glow_r, glow_g, glow_b,
            glow_intensity
        );
        
        if success {
            self.dirty_flags |= DirtyFlags::METEORS;
        }
        
        success
    }
    
    pub fn mark_dirty(&mut self, system: u8) {
        self.dirty_flags |= DirtyFlags::from_bits_truncate(system);
    }
    
    pub fn get_metrics(&self) -> JsValue {
        let metrics = js_sys::Object::new();
        
        js_sys::Reflect::set(&metrics, &"frame_time".into(), &self.metrics.update_times.average().into()).unwrap();
        js_sys::Reflect::set(&metrics, &"active_meteors".into(), &self.meteor_system.get_active_count().into()).unwrap();
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