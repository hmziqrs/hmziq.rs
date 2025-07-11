use wasm_bindgen::prelude::*;

pub struct SpawnPoint {
    pub meteor_id: usize,
    pub x: f32,
    pub y: f32,
    pub vx: f32,
    pub vy: f32,
    pub meteor_type: u8, // 0: cool, 1: warm, 2: bright
    pub should_spawn: bool,
}

const MAX_METEORS: usize = 20;
const BEZIER_SEGMENTS: usize = 60;

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
    
    // Animation state
    distance_traveled: f32,
    path_length: f32,
    size: f32,
    speed: f32,
    angle: f32,
    max_life: f32,
    
    // Visual properties
    color_r: f32,
    color_g: f32,
    color_b: f32,
    glow_r: f32,
    glow_g: f32,
    glow_b: f32,
    glow_intensity: f32,
    
    // State
    active: bool,
    meteor_type: u8, // 0: cool, 1: warm, 2: bright
    
    // Trail
    trail_points: Vec<(f32, f32, f32)>, // x, y, opacity
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
            distance_traveled: 0.0,
            path_length: 0.0,
            size: 0.5,
            speed: 1.0,
            angle: 0.0,
            max_life: 100.0,
            color_r: 1.0,
            color_g: 1.0,
            color_b: 1.0,
            glow_r: 1.0,
            glow_g: 1.0,
            glow_b: 1.0,
            glow_intensity: 1.0,
            active: false,
            meteor_type: 0,
            trail_points: Vec::new(),
        }
    }
}

#[wasm_bindgen]
pub struct MeteorSystem {
    meteors: Vec<Meteor>,
    canvas_width: f32,
    canvas_height: f32,
    last_significant_change: f32,
}

#[wasm_bindgen]
impl MeteorSystem {
    #[wasm_bindgen(constructor)]
    pub fn new(canvas_width: f32, canvas_height: f32) -> MeteorSystem {
        let mut meteors = Vec::with_capacity(MAX_METEORS);
        for _ in 0..MAX_METEORS {
            meteors.push(Meteor::default());
        }
        
        MeteorSystem {
            meteors,
            canvas_width,
            canvas_height,
            last_significant_change: 0.0,
        }
    }
    
    pub fn update_canvas_size(&mut self, width: f32, height: f32) {
        self.canvas_width = width;
        self.canvas_height = height;
    }
    
    pub fn init_meteor(
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
        // Find inactive meteor
        if let Some(meteor) = self.meteors.iter_mut().find(|m| !m.active) {
            meteor.active = true;
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
            meteor.meteor_type = meteor_type;
            meteor.color_r = color_r;
            meteor.color_g = color_g;
            meteor.color_b = color_b;
            meteor.glow_r = glow_r;
            meteor.glow_g = glow_g;
            meteor.glow_b = glow_b;
            meteor.glow_intensity = glow_intensity;
            meteor.distance_traveled = 0.0;
            meteor.trail_points.clear();
            
            // Calculate path length
            meteor.path_length = Self::calculate_path_length(
                meteor.start_x, meteor.start_y,
                meteor.control_x, meteor.control_y,
                meteor.end_x, meteor.end_y
            );
            
            self.last_significant_change = web_sys::window().unwrap().performance().unwrap().now() as f32;
            true
        } else {
            false
        }
    }
    
    pub fn update_meteors(&mut self, dt: f32, speed_multiplier: f32) -> usize {
        let mut active_count = 0;
        let mut has_significant_changes = false;
        
        for meteor in &mut self.meteors {
            if !meteor.active { continue; }
            active_count += 1;
            
            let old_x = meteor.x;
            let old_y = meteor.y;
            
            // Update distance-based movement
            meteor.distance_traveled += meteor.speed * speed_multiplier * dt;
            let distance_ratio = meteor.distance_traveled / meteor.path_length;
            
            if distance_ratio >= 1.0 {
                meteor.active = false;
                has_significant_changes = true;
                continue;
            }
            
            // Calculate position on bezier curve
            let t = distance_ratio;
            let t_inv = 1.0 - t;
            meteor.x = t_inv * t_inv * meteor.start_x + 
                      2.0 * t_inv * t * meteor.control_x + 
                      t * t * meteor.end_x;
            meteor.y = t_inv * t_inv * meteor.start_y + 
                      2.0 * t_inv * t * meteor.control_y + 
                      t * t * meteor.end_y;
            
            // Check for significant movement
            let delta_x = (meteor.x - old_x).abs();
            let delta_y = (meteor.y - old_y).abs();
            if delta_x > 0.1 || delta_y > 0.1 {
                has_significant_changes = true;
            }
            
            // Update velocity for particle spawning
            meteor.vx = (meteor.x - old_x) / dt;
            meteor.vy = (meteor.y - old_y) / dt;
            
            // Update angle
            meteor.angle = meteor.vy.atan2(meteor.vx);
            
            // Update trail
            meteor.trail_points.push((meteor.x, meteor.y, 1.0));
            let max_trail_length = (50.0 * (0.5 + meteor.size * 0.5)) as usize;
            if meteor.trail_points.len() > max_trail_length {
                meteor.trail_points.remove(0);
            }
            
            // Fade trail
            let trail_len = meteor.trail_points.len() as f32;
            for (i, point) in meteor.trail_points.iter_mut().enumerate() {
                let fade_ratio = i as f32 / trail_len;
                point.2 = fade_ratio * 0.8;
            }
        }
        
        if has_significant_changes {
            self.last_significant_change = web_sys::window().unwrap().performance().unwrap().now() as f32;
        }
        
        active_count
    }
    
    fn calculate_path_length(start_x: f32, start_y: f32, control_x: f32, control_y: f32, end_x: f32, end_y: f32) -> f32 {
        let mut length = 0.0;
        let segments = 100;
        
        let mut prev_x = start_x;
        let mut prev_y = start_y;
        
        for i in 1..=segments {
            let t = i as f32 / segments as f32;
            let t_inv = 1.0 - t;
            
            let x = t_inv * t_inv * start_x + 
                   2.0 * t_inv * t * control_x + 
                   t * t * end_x;
            let y = t_inv * t_inv * start_y + 
                   2.0 * t_inv * t * control_y + 
                   t * t * end_y;
            
            let dx = x - prev_x;
            let dy = y - prev_y;
            length += (dx * dx + dy * dy).sqrt();
            
            prev_x = x;
            prev_y = y;
        }
        
        length
    }
    
    pub fn get_active_count(&self) -> usize {
        self.meteors.iter().filter(|m| m.active).count()
    }
}

// Internal methods not exposed to WASM
impl MeteorSystem {
    pub fn get_spawn_points(&self) -> Vec<SpawnPoint> {
        let mut points = Vec::new();
        
        for (i, meteor) in self.meteors.iter().enumerate() {
            if meteor.active && meteor.trail_points.len() > 5 {
                let should_spawn = match meteor.meteor_type {
                    2 => js_sys::Math::random() < 0.3, // bright meteors spawn more
                    _ => js_sys::Math::random() < 0.2,
                };
                
                points.push(SpawnPoint {
                    meteor_id: i,
                    x: meteor.x,
                    y: meteor.y,
                    vx: meteor.vx,
                    vy: meteor.vy,
                    meteor_type: meteor.meteor_type,
                    should_spawn,
                });
            }
        }
        
        points
    }
    
    pub fn get_dying_meteors(&self) -> Vec<usize> {
        self.meteors.iter()
            .enumerate()
            .filter(|(_, m)| m.active && m.distance_traveled / m.path_length > 0.9)
            .map(|(i, _)| i)
            .collect()
    }
    
    pub fn has_significant_changes(&self) -> bool {
        let current_time = web_sys::window().unwrap().performance().unwrap().now() as f32;
        current_time - self.last_significant_change < 100.0
    }
    
    pub fn get_packed_render_data(&self) -> Vec<f32> {
        let mut data = Vec::with_capacity(self.meteors.len() * 8);
        
        for meteor in &self.meteors {
            data.push(meteor.x);
            data.push(meteor.y);
            data.push(meteor.size);
            data.push(meteor.angle);
            data.push(meteor.glow_intensity);
            data.push(meteor.distance_traveled / meteor.path_length);
            data.push(meteor.meteor_type as f32);
            data.push(if meteor.active { 1.0 } else { 0.0 });
        }
        
        data
    }
}