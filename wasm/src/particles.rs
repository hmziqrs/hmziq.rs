use wasm_bindgen::prelude::*;
use js_sys::Float32Array;

pub struct SpawnPoint {
    pub meteor_id: usize,
    pub x: f32,
    pub y: f32,
    pub vx: f32,
    pub vy: f32,
    pub meteor_type: String,
    pub should_spawn: bool,
}

// Maximum meteors to pre-allocate
const MAX_METEORS: usize = 20;
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
            meteor_updates.push(Some((meteor.x, meteor.y, is_done)));
        }
        
        // Apply updates after mutable borrow is done
        for (i, update) in meteor_updates.iter().enumerate() {
            if let Some((x, y, is_done)) = update {
                // Check visibility
                self.meteors[i].visible = self.is_in_viewport(*x, *y, 50.0);
                
                // Handle done meteors
                if *is_done {
                    self.meteors[i].active = false;
                    self.last_significant_change = web_sys::window().unwrap().performance().unwrap().now() as f32;
                }
            }
        }
        
        active_count
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
}

// Lifecycle hooks for particle system integration
impl MeteorSystem {
    pub fn get_spawn_points(&self) -> Vec<SpawnPoint> {
        let mut points = Vec::new();
        
        for (i, meteor) in self.meteors.iter().enumerate() {
            if meteor.active && meteor.visible {
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
                    meteor_type: match meteor.meteor_type {
                        0 => "cool".to_string(),
                        1 => "warm".to_string(),
                        _ => "bright".to_string(),
                    },
                    should_spawn,
                });
            }
        }
        
        points
    }
    
    pub fn get_dying_meteors(&self) -> Vec<usize> {
        self.meteors.iter()
            .enumerate()
            .filter(|(_, m)| m.active && m.life / m.max_life > 0.9)
            .map(|(i, _)| i)
            .collect()
    }
    
    pub fn has_significant_changes(&self) -> bool {
        // Check if any meteors moved significantly
        let current_time = web_sys::window().unwrap().performance().unwrap().now() as f32;
        current_time - self.last_significant_change < 100.0 // 100ms threshold
    }
    
    pub fn get_packed_render_data(&self) -> Vec<f32> {
        let mut data = Vec::with_capacity(self.meteors.len() * 8);
        
        for meteor in &self.meteors {
            // Pack as [x, y, size, angle, glow_intensity, life_ratio, type, active]
            data.push(meteor.x);
            data.push(meteor.y);
            data.push(meteor.size);
            data.push(meteor.angle);
            data.push(meteor.glow_intensity);
            data.push(meteor.life / meteor.max_life);
            data.push(meteor.meteor_type as f32);
            data.push(if meteor.active { 1.0 } else { 0.0 });
        }
        
        data
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

// Trail rendering optimization for Task 6
#[wasm_bindgen]
pub fn calculate_trail_geometry(
    trail_x_values: &[f32],
    trail_y_values: &[f32],
    max_width: f32,
    min_width: f32,
    taper_exponent: f32, // 2.5 for current behavior
) -> Vec<f32> {
    let trail_length = trail_x_values.len();
    if trail_length < 2 {
        return Vec::new();
    }
    
    // Pre-allocate for all vertices (top edge + bottom edge)
    // Each point contributes 2 vertices (top and bottom), so 4 floats per point
    let mut vertices = Vec::with_capacity(trail_length * 4);
    
    // Calculate trail points with optimized operations
    let mut trail_points = Vec::with_capacity(trail_length);
    
    for i in 0..trail_length {
        let progress = i as f32 / (trail_length - 1) as f32; // 0 = tail, 1 = head
        
        // Optimized width calculation using native pow
        let width = max_width * progress.powf(taper_exponent) + min_width;
        
        trail_points.push((trail_x_values[i], trail_y_values[i], width));
    }
    
    // Calculate angles and perpendicular offsets in one pass
    for i in 0..trail_points.len() {
        let (x, y, width) = trail_points[i];
        
        // Calculate angle between points
        let angle = if i < trail_points.len() - 1 {
            let (next_x, next_y, _) = trail_points[i + 1];
            (next_y - y).atan2(next_x - x)
        } else if i > 0 {
            let (prev_x, prev_y, _) = trail_points[i - 1];
            (y - prev_y).atan2(x - prev_x)
        } else {
            0.0
        };
        
        let perp_angle = angle + std::f32::consts::PI / 2.0;
        let half_width = width / 2.0;
        
        // Calculate perpendicular offsets using fast trigonometry
        let cos_perp = perp_angle.cos();
        let sin_perp = perp_angle.sin();
        let offset_x = cos_perp * half_width;
        let offset_y = sin_perp * half_width;
        
        // Store top vertex
        vertices.push(x + offset_x);
        vertices.push(y + offset_y);
        
        // Store bottom vertex (will be used in reverse order)
        vertices.push(x - offset_x);
        vertices.push(y - offset_y);
    }
    
    vertices
}

// Batch trail geometry calculation for multiple meteors
#[wasm_bindgen]
pub fn batch_calculate_trail_geometries(
    trails_data: &[f32], // Flattened: [trail1_len, x1, y1, x2, y2, ..., trail2_len, x1, y1, ...]
    max_widths: &[f32],
    min_widths: &[f32],
    taper_exponent: f32,
) -> Vec<f32> {
    let mut all_vertices = Vec::new();
    let mut data_index = 0;
    let meteor_count = max_widths.len();
    
    for meteor_idx in 0..meteor_count {
        if data_index >= trails_data.len() {
            break;
        }
        
        let trail_length = trails_data[data_index] as usize;
        data_index += 1;
        
        if trail_length < 2 || data_index + trail_length * 2 > trails_data.len() {
            // Skip invalid trail data
            data_index += trail_length * 2;
            continue;
        }
        
        // Extract trail coordinates
        let mut trail_x = Vec::with_capacity(trail_length);
        let mut trail_y = Vec::with_capacity(trail_length);
        
        for _ in 0..trail_length {
            trail_x.push(trails_data[data_index]);
            trail_y.push(trails_data[data_index + 1]);
            data_index += 2;
        }
        
        // Calculate geometry for this trail
        let vertices = calculate_trail_geometry(
            &trail_x,
            &trail_y,
            max_widths[meteor_idx],
            min_widths[meteor_idx],
            taper_exponent,
        );
        
        // Add vertex count as header, then vertices
        all_vertices.push(vertices.len() as f32);
        all_vertices.extend(vertices);
    }
    
    all_vertices
}

// Optimized trail point width calculations only
#[wasm_bindgen]
pub fn calculate_trail_widths(
    trail_length: usize,
    max_width: f32,
    min_width: f32,
    taper_exponent: f32,
) -> Vec<f32> {
    let mut widths = Vec::with_capacity(trail_length);
    
    for i in 0..trail_length {
        let progress = i as f32 / (trail_length - 1) as f32;
        let width = max_width * progress.powf(taper_exponent) + min_width;
        widths.push(width);
    }
    
    widths
}