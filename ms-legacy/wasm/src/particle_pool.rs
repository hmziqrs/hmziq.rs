use wasm_bindgen::prelude::*;
use std::collections::VecDeque;

// Shared memory pool for particle allocation
// This provides a common allocation strategy for all particle systems
const POOL_SIZE: usize = 2000; // Total particles across all systems

#[wasm_bindgen]
pub struct ParticlePool {
    // Free indices available for allocation
    free_indices: VecDeque<usize>,
    // Track which system owns which particles
    allocations: Vec<Option<usize>>, // System ID or None if free
    total_allocated: usize,
}

#[wasm_bindgen]
impl ParticlePool {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ParticlePool {
        let mut free_indices = VecDeque::with_capacity(POOL_SIZE);
        let mut allocations = Vec::with_capacity(POOL_SIZE);
        
        // Initialize all indices as free
        for i in 0..POOL_SIZE {
            free_indices.push_back(i);
            allocations.push(None);
        }
        
        ParticlePool {
            free_indices,
            allocations,
            total_allocated: 0,
        }
    }
    
    // Allocate a block of particles for a system
    pub fn allocate_block(&mut self, count: usize, system_id: usize) -> Option<Vec<usize>> {
        if self.free_indices.len() < count {
            return None;
        }
        
        let mut indices = Vec::with_capacity(count);
        for _ in 0..count {
            if let Some(idx) = self.free_indices.pop_front() {
                self.allocations[idx] = Some(system_id);
                indices.push(idx);
                self.total_allocated += 1;
            }
        }
        
        Some(indices)
    }
    
    // Allocate a single particle
    pub fn allocate(&mut self, system_id: usize) -> Option<usize> {
        if let Some(idx) = self.free_indices.pop_front() {
            self.allocations[idx] = Some(system_id);
            self.total_allocated += 1;
            Some(idx)
        } else {
            None
        }
    }
    
    // Free a block of particles
    pub fn free_block(&mut self, indices: &[usize]) {
        for &idx in indices {
            self.free(idx);
        }
    }
    
    // Free a single particle
    pub fn free(&mut self, index: usize) {
        if index < POOL_SIZE && self.allocations[index].is_some() {
            self.allocations[index] = None;
            self.free_indices.push_back(index);
            self.total_allocated = self.total_allocated.saturating_sub(1);
        }
    }
    
    // Free all particles for a system
    pub fn free_system(&mut self, system_id: usize) {
        let mut to_free = Vec::new();
        for (idx, &alloc) in self.allocations.iter().enumerate() {
            if alloc == Some(system_id) {
                to_free.push(idx);
            }
        }
        
        for idx in to_free {
            self.free(idx);
        }
    }
    
    // Get statistics
    pub fn get_free_count(&self) -> usize {
        self.free_indices.len()
    }
    
    pub fn get_allocated_count(&self) -> usize {
        self.total_allocated
    }
    
    pub fn get_total_capacity(&self) -> usize {
        POOL_SIZE
    }
    
    // Check if index is allocated to a specific system
    pub fn is_allocated_to(&self, index: usize, system_id: usize) -> bool {
        index < POOL_SIZE && self.allocations[index] == Some(system_id)
    }
}

// Shared particle data structure for efficient memory layout
#[repr(C)]
#[derive(Clone, Copy, Default)]
pub struct ParticleData {
    pub x: f32,
    pub y: f32,
    pub vx: f32,
    pub vy: f32,
    pub size: f32,
    pub opacity: f32,
    pub life: f32,
    pub custom1: f32, // System-specific data
    pub custom2: f32, // System-specific data
    pub color_packed: u32, // RGBA packed
}

impl ParticleData {
    pub fn pack_color(r: u8, g: u8, b: u8, a: u8) -> u32 {
        ((a as u32) << 24) | ((b as u32) << 16) | ((g as u32) << 8) | (r as u32)
    }
    
    pub fn unpack_color(&self) -> (u8, u8, u8, u8) {
        let c = self.color_packed;
        (
            (c & 0xFF) as u8,
            ((c >> 8) & 0xFF) as u8,
            ((c >> 16) & 0xFF) as u8,
            ((c >> 24) & 0xFF) as u8,
        )
    }
}

// Global particle data arrays - shared across all systems
pub struct ParticleArrays {
    pub data: Vec<ParticleData>,
}

impl ParticleArrays {
    pub fn new() -> Self {
        let mut data = Vec::with_capacity(POOL_SIZE);
        data.resize(POOL_SIZE, ParticleData::default());
        
        ParticleArrays { data }
    }
}