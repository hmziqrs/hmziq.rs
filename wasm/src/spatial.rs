use wasm_bindgen::prelude::*;
use std::collections::HashMap;

/// A 2D spatial hash grid for efficient neighbor queries
/// Divides space into uniform grid cells to reduce collision checks from O(n²) to O(n)
#[wasm_bindgen]
pub struct SpatialGrid {
    cell_size: f32,
    cells: HashMap<(i32, i32), Vec<usize>>,
    objects: Vec<SpatialObject>,
    canvas_width: f32,
    canvas_height: f32,
}

/// Represents an object in the spatial grid
#[derive(Clone, Debug)]
pub struct SpatialObject {
    pub id: usize,
    pub x: f32,
    pub y: f32,
    pub radius: f32,
    pub is_visible: bool,
}

/// Results from overlap detection
#[wasm_bindgen]
pub struct OverlapResult {
    pub id1: usize,
    pub id2: usize,
    pub distance: f32,
    pub overlap_strength: f32,
    pub mid_x: f32,
    pub mid_y: f32,
}

#[wasm_bindgen]
impl SpatialGrid {
    #[wasm_bindgen(constructor)]
    pub fn new(cell_size: f32, canvas_width: f32, canvas_height: f32) -> SpatialGrid {
        SpatialGrid {
            cell_size,
            cells: HashMap::new(),
            objects: Vec::new(),
            canvas_width,
            canvas_height,
        }
    }

    /// Clear all objects from the grid
    pub fn clear(&mut self) {
        self.cells.clear();
        self.objects.clear();
    }

    /// Add an object to the spatial grid
    pub fn add_object(&mut self, id: usize, x: f32, y: f32, radius: f32, is_visible: bool) {
        // Ensure object vector is large enough
        if id >= self.objects.len() {
            self.objects.resize(id + 1, SpatialObject {
                id: 0,
                x: 0.0,
                y: 0.0,
                radius: 0.0,
                is_visible: false,
            });
        }

        // Update object data
        self.objects[id] = SpatialObject {
            id,
            x,
            y,
            radius,
            is_visible,
        };

        // Only add visible objects to the grid
        if is_visible {
            self.insert_into_grid(id);
        }
    }

    /// Batch update object positions
    pub fn update_positions(&mut self, positions: &[f32], radii: &[f32], visibilities: &[u8]) {
        // Clear existing grid
        self.cells.clear();
        
        let count = positions.len() / 2;
        
        // Ensure object vector is large enough
        if count > self.objects.len() {
            self.objects.resize(count, SpatialObject {
                id: 0,
                x: 0.0,
                y: 0.0,
                radius: 0.0,
                is_visible: false,
            });
        }

        // Update all objects and rebuild grid
        for i in 0..count {
            let x = positions[i * 2];
            let y = positions[i * 2 + 1];
            let radius = radii[i];
            let is_visible = visibilities[i] > 0;

            self.objects[i] = SpatialObject {
                id: i,
                x,
                y,
                radius,
                is_visible,
            };

            // Only add visible objects to grid
            if is_visible {
                self.insert_into_grid(i);
            }
        }
    }

    /// Insert an object into the grid cells it overlaps
    fn insert_into_grid(&mut self, id: usize) {
        let obj = &self.objects[id];
        
        // Calculate grid bounds for this object
        let min_x = ((obj.x - obj.radius) / self.cell_size).floor() as i32;
        let max_x = ((obj.x + obj.radius) / self.cell_size).ceil() as i32;
        let min_y = ((obj.y - obj.radius) / self.cell_size).floor() as i32;
        let max_y = ((obj.y + obj.radius) / self.cell_size).ceil() as i32;

        // Insert into all overlapping cells
        for cell_x in min_x..=max_x {
            for cell_y in min_y..=max_y {
                self.cells
                    .entry((cell_x, cell_y))
                    .or_insert_with(Vec::new)
                    .push(id);
            }
        }
    }

    /// Find all overlapping object pairs
    pub fn find_overlaps(&self, overlap_factor: f32) -> Vec<f32> {
        let mut overlaps = Vec::new();
        let mut checked_pairs = HashMap::new();

        // Check each cell
        for (_, object_ids) in &self.cells {
            // Check all pairs within this cell
            for i in 0..object_ids.len() {
                for j in (i + 1)..object_ids.len() {
                    let id1 = object_ids[i];
                    let id2 = object_ids[j];
                    
                    // Skip if we've already checked this pair
                    let pair_key = if id1 < id2 { (id1, id2) } else { (id2, id1) };
                    if checked_pairs.contains_key(&pair_key) {
                        continue;
                    }
                    checked_pairs.insert(pair_key, true);

                    // Check for actual overlap
                    let obj1 = &self.objects[id1];
                    let obj2 = &self.objects[id2];

                    let dx = obj1.x - obj2.x;
                    let dy = obj1.y - obj2.y;
                    let distance = (dx * dx + dy * dy).sqrt();
                    let combined_radius = (obj1.radius + obj2.radius) * overlap_factor;

                    if distance < combined_radius {
                        let overlap_strength = 1.0 - distance / combined_radius;
                        let mid_x = (obj1.x + obj2.x) / 2.0;
                        let mid_y = (obj1.y + obj2.y) / 2.0;

                        // Return flat array: [id1, id2, distance, overlap_strength, mid_x, mid_y]
                        overlaps.push(id1 as f32);
                        overlaps.push(id2 as f32);
                        overlaps.push(distance);
                        overlaps.push(overlap_strength);
                        overlaps.push(mid_x);
                        overlaps.push(mid_y);
                    }
                }
            }
        }

        overlaps
    }

    /// Get statistics about the spatial grid
    pub fn get_stats(&self) -> Vec<f32> {
        let total_objects = self.objects.len() as f32;
        let visible_objects = self.objects.iter().filter(|o| o.is_visible).count() as f32;
        let total_cells = self.cells.len() as f32;
        let max_objects_per_cell = self.cells.values()
            .map(|v| v.len())
            .max()
            .unwrap_or(0) as f32;
        
        vec![total_objects, visible_objects, total_cells, max_objects_per_cell]
    }

    /// Debug: Get cell occupancy for visualization
    pub fn get_cell_occupancy(&self) -> Vec<f32> {
        let mut occupancy = Vec::new();
        
        for ((cell_x, cell_y), objects) in &self.cells {
            occupancy.push(*cell_x as f32);
            occupancy.push(*cell_y as f32);
            occupancy.push(objects.len() as f32);
        }
        
        occupancy
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spatial_grid_creation() {
        let grid = SpatialGrid::new(100.0, 800.0, 600.0);
        assert_eq!(grid.cell_size, 100.0);
        assert_eq!(grid.objects.len(), 0);
    }

    #[test]
    fn test_add_objects() {
        let mut grid = SpatialGrid::new(100.0, 800.0, 600.0);
        
        grid.add_object(0, 50.0, 50.0, 20.0, true);
        grid.add_object(1, 150.0, 150.0, 30.0, true);
        
        assert_eq!(grid.objects.len(), 2);
        assert!(grid.cells.len() > 0);
    }

    #[test]
    fn test_overlap_detection() {
        let mut grid = SpatialGrid::new(100.0, 800.0, 600.0);
        
        // Add two overlapping objects
        grid.add_object(0, 100.0, 100.0, 50.0, true);
        grid.add_object(1, 120.0, 100.0, 50.0, true);
        
        let overlaps = grid.find_overlaps(0.8);
        assert!(overlaps.len() > 0);
        assert_eq!(overlaps.len(), 6); // One overlap = 6 values
    }

    #[test]
    fn test_no_overlap() {
        let mut grid = SpatialGrid::new(100.0, 800.0, 600.0);
        
        // Add two non-overlapping objects
        grid.add_object(0, 100.0, 100.0, 20.0, true);
        grid.add_object(1, 300.0, 300.0, 20.0, true);
        
        let overlaps = grid.find_overlaps(0.8);
        assert_eq!(overlaps.len(), 0);
    }
}