use wasm_bindgen::prelude::*;

// Common physics calculations for particle systems
// These are optimized functions that can be used by any particle system

#[wasm_bindgen]
pub struct PhysicsUtils;

#[wasm_bindgen]
impl PhysicsUtils {
    // Apply gravity to velocity
    #[inline]
    pub fn apply_gravity(vy: f32, gravity: f32, dt: f32) -> f32 {
        vy + gravity * dt
    }
    
    // Apply air resistance/drag
    #[inline]
    pub fn apply_drag(velocity: f32, drag_coefficient: f32) -> f32 {
        velocity * (1.0 - drag_coefficient)
    }
    
    // Apply drag to both x and y components
    // Returns [vx, vy]
    #[inline]
    pub fn apply_drag_2d(vx: f32, vy: f32, drag: f32) -> Vec<f32> {
        vec![vx * (1.0 - drag), vy * (1.0 - drag)]
    }
    
    // Calculate distance squared (avoid sqrt for performance)
    #[inline]
    pub fn distance_squared(x1: f32, y1: f32, x2: f32, y2: f32) -> f32 {
        let dx = x2 - x1;
        let dy = y2 - y1;
        dx * dx + dy * dy
    }
    
    // Check if point is in circle (for collision detection)
    #[inline]
    pub fn point_in_circle(px: f32, py: f32, cx: f32, cy: f32, radius: f32) -> bool {
        Self::distance_squared(px, py, cx, cy) <= radius * radius
    }
    
    // Apply random drift (for natural particle movement)
    #[inline]
    pub fn apply_drift(value: f32, drift_strength: f32, random: f32) -> f32 {
        value + (random - 0.5) * drift_strength
    }
    
    // Interpolate between two values
    #[inline]
    pub fn lerp(a: f32, b: f32, t: f32) -> f32 {
        a + (b - a) * t
    }
    
    // Smooth interpolation (ease in/out)
    #[inline]
    pub fn smooth_step(t: f32) -> f32 {
        t * t * (3.0 - 2.0 * t)
    }
    
    // Calculate opacity based on lifetime
    #[inline]
    pub fn calculate_fade(life: f32, max_life: f32, fade_in: f32, fade_out: f32) -> f32 {
        if life < fade_in {
            // Fade in phase
            life / fade_in
        } else if life > max_life - fade_out {
            // Fade out phase
            (max_life - life) / fade_out
        } else {
            // Full opacity
            1.0
        }
    }
}

// Batch physics operations for better performance
#[wasm_bindgen]
pub fn batch_apply_gravity(
    velocities_y: &mut [f32],
    gravity: f32,
    dt: f32,
) {
    for vy in velocities_y.iter_mut() {
        *vy += gravity * dt;
    }
}

#[wasm_bindgen]
pub fn batch_apply_drag(
    velocities_x: &mut [f32],
    velocities_y: &mut [f32],
    drag: f32,
) {
    let drag_factor = 1.0 - drag;
    for vx in velocities_x.iter_mut() {
        *vx *= drag_factor;
    }
    for vy in velocities_y.iter_mut() {
        *vy *= drag_factor;
    }
}

#[wasm_bindgen]
pub fn batch_update_positions(
    positions_x: &mut [f32],
    positions_y: &mut [f32],
    velocities_x: &[f32],
    velocities_y: &[f32],
    dt: f32,
) {
    let count = positions_x.len().min(velocities_x.len());
    for i in 0..count {
        positions_x[i] += velocities_x[i] * dt;
        positions_y[i] += velocities_y[i] * dt;
    }
}

#[wasm_bindgen]
pub fn batch_calculate_fade(
    opacities: &mut [f32],
    life_values: &[f32],
    max_life: f32,
    fade_in: f32,
    fade_out: f32,
) {
    for (i, &life) in life_values.iter().enumerate() {
        if i >= opacities.len() {
            break;
        }
        
        opacities[i] = if life < fade_in {
            life / fade_in
        } else if life > max_life - fade_out {
            (max_life - life) / fade_out
        } else {
            1.0
        };
    }
}

// Force calculations for advanced physics
#[wasm_bindgen]
pub struct Force {
    pub x: f32,
    pub y: f32,
}

#[wasm_bindgen]
impl Force {
    #[wasm_bindgen(constructor)]
    pub fn new(x: f32, y: f32) -> Force {
        Force { x, y }
    }
    
    // Calculate attractive force (for particle clustering)
    pub fn attraction(x1: f32, y1: f32, x2: f32, y2: f32, strength: f32) -> Force {
        let dx = x2 - x1;
        let dy = y2 - y1;
        let dist_sq = dx * dx + dy * dy;
        
        if dist_sq < 0.01 {
            return Force { x: 0.0, y: 0.0 };
        }
        
        let dist = dist_sq.sqrt();
        let force_mag = strength / dist_sq;
        
        Force {
            x: (dx / dist) * force_mag,
            y: (dy / dist) * force_mag,
        }
    }
    
    // Calculate repulsive force (for particle separation)
    pub fn repulsion(x1: f32, y1: f32, x2: f32, y2: f32, strength: f32) -> Force {
        let f = Self::attraction(x1, y1, x2, y2, strength);
        Force { x: -f.x, y: -f.y }
    }
    
    // Calculate vortex force (for swirling effects)
    pub fn vortex(px: f32, py: f32, vx: f32, vy: f32, strength: f32) -> Force {
        // Perpendicular to position vector
        let dx = -py + vy;
        let dy = px - vx;
        let dist = (dx * dx + dy * dy).sqrt();
        
        if dist < 0.01 {
            return Force { x: 0.0, y: 0.0 };
        }
        
        Force {
            x: (dx / dist) * strength,
            y: (dy / dist) * strength,
        }
    }
}

// Fast random number generation for particle systems
#[wasm_bindgen]
pub struct FastRandom {
    seed: u32,
}

#[wasm_bindgen]
impl FastRandom {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u32) -> FastRandom {
        FastRandom { 
            seed: if seed == 0 { 0x12345678 } else { seed }
        }
    }
    
    // Linear congruential generator
    pub fn next(&mut self) -> f32 {
        self.seed = self.seed.wrapping_mul(1664525).wrapping_add(1013904223);
        (self.seed >> 16) as f32 / 65535.0
    }
    
    // Random in range
    pub fn range(&mut self, min: f32, max: f32) -> f32 {
        min + self.next() * (max - min)
    }
    
    // Random angle in radians
    pub fn angle(&mut self) -> f32 {
        self.next() * std::f32::consts::PI * 2.0
    }
    
    // Random unit vector
    // Returns [x, y]
    pub fn unit_vector(&mut self) -> Vec<f32> {
        let angle = self.angle();
        vec![angle.cos(), angle.sin()]
    }
}