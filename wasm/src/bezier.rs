use wasm_bindgen::prelude::*;

// Note: BezierPoint is not exposed through wasm_bindgen as we use flattened arrays
// for better performance when transferring data between JS and WASM
pub struct BezierPoint {
    pub x: f32,
    pub y: f32,
}

/// Pre-calculate quadratic Bezier path points
#[wasm_bindgen]
pub fn precalculate_bezier_path(
    start_x: f32,
    start_y: f32,
    control_x: f32,
    control_y: f32,
    end_x: f32,
    end_y: f32,
    segments: usize,
) -> Vec<f32> {
    // Return flattened array of x,y pairs for efficient transfer
    let mut points = Vec::with_capacity((segments + 1) * 2);
    
    for i in 0..=segments {
        let t = i as f32 / segments as f32;
        let one_minus_t = 1.0 - t;
        let one_minus_t_sq = one_minus_t * one_minus_t;
        let t_sq = t * t;
        
        // Quadratic Bezier formula: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
        let x = one_minus_t_sq * start_x + 
                2.0 * one_minus_t * t * control_x + 
                t_sq * end_x;
        
        let y = one_minus_t_sq * start_y + 
                2.0 * one_minus_t * t * control_y + 
                t_sq * end_y;
        
        points.push(x);
        points.push(y);
    }
    
    points
}

/// Batch pre-calculate multiple Bezier paths
#[wasm_bindgen]
pub fn precalculate_bezier_paths_batch(
    paths_data: &[f32], // Flattened array of [start_x, start_y, control_x, control_y, end_x, end_y] per path
    segments: usize,
) -> Vec<f32> {
    let path_count = paths_data.len() / 6;
    let points_per_path = (segments + 1) * 2;
    let mut all_points = Vec::with_capacity(path_count * points_per_path);
    
    for path_idx in 0..path_count {
        let base_idx = path_idx * 6;
        let start_x = paths_data[base_idx];
        let start_y = paths_data[base_idx + 1];
        let control_x = paths_data[base_idx + 2];
        let control_y = paths_data[base_idx + 3];
        let end_x = paths_data[base_idx + 4];
        let end_y = paths_data[base_idx + 5];
        
        // Calculate path points
        for i in 0..=segments {
            let t = i as f32 / segments as f32;
            let one_minus_t = 1.0 - t;
            let one_minus_t_sq = one_minus_t * one_minus_t;
            let t_sq = t * t;
            
            let x = one_minus_t_sq * start_x + 
                    2.0 * one_minus_t * t * control_x + 
                    t_sq * end_x;
            
            let y = one_minus_t_sq * start_y + 
                    2.0 * one_minus_t * t * control_y + 
                    t_sq * end_y;
            
            all_points.push(x);
            all_points.push(y);
        }
    }
    
    all_points
}

/// Interpolate point on pre-calculated Bezier path
#[wasm_bindgen]
pub fn interpolate_bezier_point(
    points: &[f32], // Flattened x,y array
    t: f32,
) -> Vec<f32> {
    let point_count = points.len() / 2;
    if point_count == 0 {
        return vec![0.0, 0.0];
    }
    
    let index = (t * (point_count - 1) as f32).floor() as usize;
    let local_t = (t * (point_count - 1) as f32) % 1.0;
    
    if index >= point_count - 1 {
        // Return last point
        let last_idx = (point_count - 1) * 2;
        return vec![points[last_idx], points[last_idx + 1]];
    }
    
    let p1_idx = index * 2;
    let p2_idx = (index + 1) * 2;
    
    let p1_x = points[p1_idx];
    let p1_y = points[p1_idx + 1];
    let p2_x = points[p2_idx];
    let p2_y = points[p2_idx + 1];
    
    vec![
        p1_x + (p2_x - p1_x) * local_t,
        p1_y + (p2_y - p1_y) * local_t,
    ]
}

/// Cubic Bezier calculation for more complex paths
#[wasm_bindgen]
pub fn precalculate_cubic_bezier_path(
    p0x: f32, p0y: f32,
    p1x: f32, p1y: f32,
    p2x: f32, p2y: f32,
    p3x: f32, p3y: f32,
    segments: usize,
) -> Vec<f32> {
    let mut points = Vec::with_capacity((segments + 1) * 2);
    
    for i in 0..=segments {
        let t = i as f32 / segments as f32;
        let one_minus_t = 1.0 - t;
        let one_minus_t_sq = one_minus_t * one_minus_t;
        let one_minus_t_cube = one_minus_t_sq * one_minus_t;
        let t_sq = t * t;
        let t_cube = t_sq * t;
        
        // Cubic Bezier formula: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
        let x = one_minus_t_cube * p0x + 
                3.0 * one_minus_t_sq * t * p1x + 
                3.0 * one_minus_t * t_sq * p2x + 
                t_cube * p3x;
        
        let y = one_minus_t_cube * p0y + 
                3.0 * one_minus_t_sq * t * p1y + 
                3.0 * one_minus_t * t_sq * p2y + 
                t_cube * p3y;
        
        points.push(x);
        points.push(y);
    }
    
    points
}

/// Calculate Bezier length for physics calculations
#[wasm_bindgen]
pub fn calculate_bezier_length(
    points: &[f32], // Flattened x,y array
) -> f32 {
    let point_count = points.len() / 2;
    if point_count < 2 {
        return 0.0;
    }
    
    let mut length = 0.0;
    
    for i in 1..point_count {
        let prev_idx = (i - 1) * 2;
        let curr_idx = i * 2;
        
        let dx = points[curr_idx] - points[prev_idx];
        let dy = points[curr_idx + 1] - points[prev_idx + 1];
        
        length += (dx * dx + dy * dy).sqrt();
    }
    
    length
}

/// Pre-calculate quadratic Bezier path with arc-length parameterization
/// This ensures uniform speed along the curve
#[wasm_bindgen]
pub fn precalculate_bezier_path_uniform(
    start_x: f32,
    start_y: f32,
    control_x: f32,
    control_y: f32,
    end_x: f32,
    end_y: f32,
    segments: usize,
) -> Vec<f32> {
    // First, generate a high-resolution path to measure arc length
    let high_res_segments = segments * 10; // 10x resolution for accurate measurement
    let mut temp_points = Vec::with_capacity((high_res_segments + 1) * 2);
    let mut arc_lengths = Vec::with_capacity(high_res_segments + 1);
    
    // Generate high-res points and calculate cumulative arc lengths
    arc_lengths.push(0.0);
    let mut total_length = 0.0;
    
    for i in 0..=high_res_segments {
        let t = i as f32 / high_res_segments as f32;
        let one_minus_t = 1.0 - t;
        let one_minus_t_sq = one_minus_t * one_minus_t;
        let t_sq = t * t;
        
        let x = one_minus_t_sq * start_x + 
                2.0 * one_minus_t * t * control_x + 
                t_sq * end_x;
        
        let y = one_minus_t_sq * start_y + 
                2.0 * one_minus_t * t * control_y + 
                t_sq * end_y;
        
        temp_points.push(x);
        temp_points.push(y);
        
        if i > 0 {
            let prev_idx = (i - 1) * 2;
            let curr_idx = i * 2;
            let dx = temp_points[curr_idx] - temp_points[prev_idx];
            let dy = temp_points[curr_idx + 1] - temp_points[prev_idx + 1];
            let segment_length = (dx * dx + dy * dy).sqrt();
            total_length += segment_length;
        }
        
        if i < high_res_segments {
            arc_lengths.push(total_length);
        }
    }
    
    // Now generate the final points with uniform arc-length distribution
    let mut points = Vec::with_capacity((segments + 1) * 2);
    
    for i in 0..=segments {
        let target_length = (i as f32 / segments as f32) * total_length;
        
        // Find the high-res segment containing this arc length
        let mut segment_idx = 0;
        for j in 1..arc_lengths.len() {
            if arc_lengths[j] >= target_length {
                segment_idx = j - 1;
                break;
            }
        }
        
        // Interpolate within the segment
        let segment_start_length = arc_lengths[segment_idx];
        let segment_end_length = if segment_idx + 1 < arc_lengths.len() {
            arc_lengths[segment_idx + 1]
        } else {
            total_length
        };
        
        let segment_t = if segment_end_length > segment_start_length {
            (target_length - segment_start_length) / (segment_end_length - segment_start_length)
        } else {
            0.0
        };
        
        let idx1 = segment_idx * 2;
        let idx2 = idx1 + 2;
        
        if idx2 < temp_points.len() {
            let x = temp_points[idx1] + (temp_points[idx2] - temp_points[idx1]) * segment_t;
            let y = temp_points[idx1 + 1] + (temp_points[idx2 + 1] - temp_points[idx1 + 1]) * segment_t;
            points.push(x);
            points.push(y);
        } else {
            // Use end point
            points.push(end_x);
            points.push(end_y);
        }
    }
    
    points
}