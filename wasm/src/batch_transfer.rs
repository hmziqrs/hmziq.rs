use wasm_bindgen::prelude::*;
use js_sys::{Float32Array, Uint32Array};

// Optimized batch data transfer utilities
// Minimize JS-WASM boundary crossings by batching data

#[wasm_bindgen]
pub struct BatchTransfer;

#[wasm_bindgen]
impl BatchTransfer {
    // Transfer particle render data in a single packed array
    // Format: [x, y, size, opacity, rotation] repeated
    pub fn pack_render_data(
        positions_x: &[f32],
        positions_y: &[f32],
        sizes: &[f32],
        opacities: &[f32],
        rotations: &[f32],
        active_flags: &[u8],
    ) -> Float32Array {
        let mut packed = Vec::new();
        let count = positions_x.len();
        
        for i in 0..count {
            if i < active_flags.len() && active_flags[i] == 0 {
                continue;
            }
            
            packed.push(positions_x.get(i).copied().unwrap_or(0.0));
            packed.push(positions_y.get(i).copied().unwrap_or(0.0));
            packed.push(sizes.get(i).copied().unwrap_or(1.0));
            packed.push(opacities.get(i).copied().unwrap_or(1.0));
            packed.push(rotations.get(i).copied().unwrap_or(0.0));
        }
        
        Float32Array::from(&packed[..])
    }
    
    // Pack color data efficiently
    // Convert from separate RGB to packed format
    pub fn pack_colors_rgb(
        r_values: &[u8],
        g_values: &[u8],
        b_values: &[u8],
        active_flags: &[u8],
    ) -> Uint32Array {
        let mut packed = Vec::new();
        let count = r_values.len();
        
        for i in 0..count {
            if i < active_flags.len() && active_flags[i] == 0 {
                continue;
            }
            
            let r = r_values.get(i).copied().unwrap_or(255) as u32;
            let g = g_values.get(i).copied().unwrap_or(255) as u32;
            let b = b_values.get(i).copied().unwrap_or(255) as u32;
            let a = 255u32; // Full alpha
            
            // Pack as RGBA
            let color = (a << 24) | (b << 16) | (g << 8) | r;
            packed.push(color);
        }
        
        Uint32Array::from(&packed[..])
    }
    
    // Optimized transfer for meteor-specific data
    pub fn pack_meteor_data(
        positions_x: &[f32],
        positions_y: &[f32],
        sizes: &[f32],
        angles: &[f32],
        glow_intensities: &[f32],
        life_ratios: &[f32],
        active_flags: &[u8],
    ) -> Float32Array {
        let mut packed = Vec::new();
        
        for i in 0..positions_x.len() {
            if i < active_flags.len() && active_flags[i] == 0 {
                // Use sentinel values for inactive meteors
                packed.extend_from_slice(&[-1.0, -1.0, 0.0, 0.0, 0.0, 0.0]);
                continue;
            }
            
            packed.push(positions_x.get(i).copied().unwrap_or(0.0));
            packed.push(positions_y.get(i).copied().unwrap_or(0.0));
            packed.push(sizes.get(i).copied().unwrap_or(1.0));
            packed.push(angles.get(i).copied().unwrap_or(0.0));
            packed.push(glow_intensities.get(i).copied().unwrap_or(1.0));
            packed.push(life_ratios.get(i).copied().unwrap_or(0.0));
        }
        
        Float32Array::from(&packed[..])
    }
    
    // Efficient particle subset extraction
    pub fn extract_active_particles(
        all_data: &[f32],
        active_indices: &[usize],
        stride: usize,
    ) -> Float32Array {
        let mut extracted = Vec::with_capacity(active_indices.len() * stride);
        
        for &idx in active_indices {
            let offset = idx * stride;
            for i in 0..stride {
                extracted.push(all_data.get(offset + i).copied().unwrap_or(0.0));
            }
        }
        
        Float32Array::from(&extracted[..])
    }
    
    // Delta compression for position updates
    // Only send changes, not full positions
    pub fn pack_position_deltas(
        old_x: &[f32],
        old_y: &[f32],
        new_x: &[f32],
        new_y: &[f32],
        threshold: f32,
    ) -> Float32Array {
        let mut deltas = Vec::new();
        
        for i in 0..old_x.len() {
            let dx = new_x.get(i).copied().unwrap_or(0.0) - old_x.get(i).copied().unwrap_or(0.0);
            let dy = new_y.get(i).copied().unwrap_or(0.0) - old_y.get(i).copied().unwrap_or(0.0);
            
            // Only include if change is significant
            if dx.abs() > threshold || dy.abs() > threshold {
                deltas.push(i as f32); // Index
                deltas.push(dx);       // Delta X
                deltas.push(dy);       // Delta Y
            }
        }
        
        Float32Array::from(&deltas[..])
    }
}

// Specialized batch operations for different particle types
#[wasm_bindgen]
pub struct TypedBatchTransfer;

#[wasm_bindgen]
impl TypedBatchTransfer {
    // Meteor particles: optimized for trail rendering
    pub fn pack_meteor_particles(
        x: &[f32],
        y: &[f32],
        sizes: &[f32],
        opacities: &[f32],
        trail_lengths: &[u8],
        colors: &[u32],
        count: usize,
    ) -> Float32Array {
        let mut packed = Vec::with_capacity(count * 7);
        
        for i in 0..count {
            packed.push(x.get(i).copied().unwrap_or(0.0));
            packed.push(y.get(i).copied().unwrap_or(0.0));
            packed.push(sizes.get(i).copied().unwrap_or(1.0));
            packed.push(opacities.get(i).copied().unwrap_or(1.0));
            packed.push(trail_lengths.get(i).copied().unwrap_or(0) as f32);
            
            // Unpack color for easier use in JS
            let color = colors.get(i).copied().unwrap_or(0xFFFFFFFF);
            packed.push(((color & 0xFF) as f32) / 255.0);       // R
            packed.push((((color >> 8) & 0xFF) as f32) / 255.0); // G
        }
        
        Float32Array::from(&packed[..])
    }
    
    // Nebula particles: optimized for overlapping/blending
    pub fn pack_nebula_particles(
        x: &[f32],
        y: &[f32],
        radii: &[f32],
        inner_radii: &[f32],
        opacities: &[f32],
        pulse_phases: &[f32],
        count: usize,
    ) -> Float32Array {
        let mut packed = Vec::with_capacity(count * 6);
        
        for i in 0..count {
            packed.push(x.get(i).copied().unwrap_or(0.0));
            packed.push(y.get(i).copied().unwrap_or(0.0));
            packed.push(radii.get(i).copied().unwrap_or(10.0));
            packed.push(inner_radii.get(i).copied().unwrap_or(5.0));
            packed.push(opacities.get(i).copied().unwrap_or(0.5));
            packed.push(pulse_phases.get(i).copied().unwrap_or(0.0));
        }
        
        Float32Array::from(&packed[..])
    }
    
    // Sparkle particles: minimal data for performance
    pub fn pack_sparkle_particles(
        x: &[f32],
        y: &[f32],
        brightness: &[f32],
        count: usize,
    ) -> Float32Array {
        let mut packed = Vec::with_capacity(count * 3);
        
        for i in 0..count {
            packed.push(x.get(i).copied().unwrap_or(0.0));
            packed.push(y.get(i).copied().unwrap_or(0.0));
            packed.push(brightness.get(i).copied().unwrap_or(1.0));
        }
        
        Float32Array::from(&packed[..])
    }
}

// Memory-efficient transfer using views
#[wasm_bindgen]
pub struct ViewTransfer {
    buffer: Vec<u8>,
}

#[wasm_bindgen]
impl ViewTransfer {
    #[wasm_bindgen(constructor)]
    pub fn new(capacity: usize) -> ViewTransfer {
        ViewTransfer {
            buffer: Vec::with_capacity(capacity),
        }
    }
    
    // Get a view into the internal buffer as Float32Array
    pub fn get_float32_view(&self, offset: usize, length: usize) -> Float32Array {
        let byte_offset = offset * 4;
        let byte_length = length * 4;
        
        if byte_offset + byte_length <= self.buffer.len() {
            let slice = &self.buffer[byte_offset..byte_offset + byte_length];
            // Convert bytes to f32 slice
            let float_slice = unsafe {
                std::slice::from_raw_parts(
                    slice.as_ptr() as *const f32,
                    length
                )
            };
            Float32Array::from(float_slice)
        } else {
            Float32Array::new_with_length(0)
        }
    }
    
    // Write data to buffer
    pub fn write_floats(&mut self, offset: usize, data: &[f32]) {
        let byte_offset = offset * 4;
        let bytes = unsafe {
            std::slice::from_raw_parts(
                data.as_ptr() as *const u8,
                data.len() * 4
            )
        };
        
        // Ensure buffer is large enough
        let required_size = byte_offset + bytes.len();
        if required_size > self.buffer.capacity() {
            self.buffer.reserve(required_size - self.buffer.capacity());
        }
        
        // Resize if needed
        if required_size > self.buffer.len() {
            self.buffer.resize(required_size, 0);
        }
        
        // Copy data
        self.buffer[byte_offset..byte_offset + bytes.len()].copy_from_slice(bytes);
    }
}