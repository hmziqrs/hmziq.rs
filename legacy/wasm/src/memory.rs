use wasm_bindgen::prelude::*;

/// Shared memory buffer for efficient data transfer
#[wasm_bindgen]
pub struct SharedBuffer {
    data: Vec<f32>,
}

#[wasm_bindgen]
impl SharedBuffer {
    /// Create a new shared buffer with the specified size
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize) -> SharedBuffer {
        SharedBuffer {
            data: vec![0.0; size],
        }
    }

    /// Create a buffer from existing data
    pub fn from_data(data: Vec<f32>) -> SharedBuffer {
        SharedBuffer { data }
    }

    /// Get the size of the buffer
    #[wasm_bindgen(getter)]
    pub fn size(&self) -> usize {
        self.data.len()
    }

    /// Get a pointer to the buffer data (for internal WASM use)
    #[wasm_bindgen(getter)]
    pub fn ptr(&self) -> *const f32 {
        self.data.as_ptr()
    }

    /// Get a mutable pointer to the buffer data
    pub fn ptr_mut(&mut self) -> *mut f32 {
        self.data.as_mut_ptr()
    }

    /// Write data to the buffer from JavaScript
    pub fn write(&mut self, data: &[f32], offset: usize) {
        let len = data.len().min(self.data.len() - offset);
        self.data[offset..offset + len].copy_from_slice(&data[..len]);
    }

    /// Read data from the buffer to JavaScript
    pub fn read(&self) -> Vec<f32> {
        self.data.clone()
    }

    /// Read a slice of the buffer
    pub fn read_slice(&self, start: usize, length: usize) -> Vec<f32> {
        let end = (start + length).min(self.data.len());
        self.data[start..end].to_vec()
    }

    /// Apply a sin operation to all elements
    pub fn apply_sin(&mut self) {
        for val in &mut self.data {
            *val = val.sin();
        }
    }

    /// Apply a cos operation to all elements
    pub fn apply_cos(&mut self) {
        for val in &mut self.data {
            *val = val.cos();
        }
    }

    /// Apply a custom operation to all elements
    pub fn apply_operation(&mut self, op: &str) {
        match op {
            "sin" => self.apply_sin(),
            "cos" => self.apply_cos(),
            "square" => {
                for val in &mut self.data {
                    *val = *val * *val;
                }
            }
            "sqrt" => {
                for val in &mut self.data {
                    *val = val.sqrt();
                }
            }
            _ => {}
        }
    }
}

/// Direct memory operations for high-performance scenarios
#[wasm_bindgen]
pub struct DirectMemory;

#[wasm_bindgen]
impl DirectMemory {
    /// Allocate a new Float32Array in WASM memory and return its pointer
    pub fn allocate_f32_array(size: usize) -> *mut f32 {
        let mut vec = vec![0.0f32; size];
        let ptr = vec.as_mut_ptr();
        std::mem::forget(vec); // Prevent deallocation
        ptr
    }

    /// Free a previously allocated array
    pub fn free_f32_array(ptr: *mut f32, size: usize) {
        unsafe {
            Vec::from_raw_parts(ptr, size, size);
            // The vector will be dropped here, freeing the memory
        }
    }

    /// Copy data from JS array to WASM memory
    pub fn copy_from_js(ptr: *mut f32, data: &[f32]) {
        unsafe {
            std::ptr::copy_nonoverlapping(data.as_ptr(), ptr, data.len());
        }
    }

    /// Copy data from WASM memory to JS array
    pub fn copy_to_js(ptr: *const f32, size: usize) -> Vec<f32> {
        unsafe {
            std::slice::from_raw_parts(ptr, size).to_vec()
        }
    }
}

/// Batch operations using direct memory access
#[wasm_bindgen]
pub fn batch_process_sin(input: &[f32]) -> Vec<f32> {
    input.iter().map(|x| x.sin()).collect()
}

#[wasm_bindgen]
pub fn batch_process_cos(input: &[f32]) -> Vec<f32> {
    input.iter().map(|x| x.cos()).collect()
}

#[wasm_bindgen]
pub fn batch_process_with_operation(input: &[f32], operation: &str) -> Vec<f32> {
    match operation {
        "sin" => batch_process_sin(input),
        "cos" => batch_process_cos(input),
        "square" => input.iter().map(|x| x * x).collect(),
        "sqrt" => input.iter().map(|x| x.sqrt()).collect(),
        _ => input.to_vec(),
    }
}

/// Memory pool for reusable buffers
#[wasm_bindgen]
pub struct MemoryPool {
    buffers: Vec<SharedBuffer>,
    available: Vec<usize>,
    buffer_size: usize,
}

#[wasm_bindgen]
impl MemoryPool {
    #[wasm_bindgen(constructor)]
    pub fn new(buffer_size: usize, pool_size: usize) -> MemoryPool {
        let mut buffers = Vec::with_capacity(pool_size);
        let mut available = Vec::with_capacity(pool_size);
        
        for i in 0..pool_size {
            buffers.push(SharedBuffer::new(buffer_size));
            available.push(i);
        }
        
        MemoryPool {
            buffers,
            available,
            buffer_size,
        }
    }

    /// Acquire a buffer from the pool
    pub fn acquire(&mut self) -> Option<usize> {
        self.available.pop()
    }

    /// Release a buffer back to the pool
    pub fn release(&mut self, index: usize) {
        if index < self.buffers.len() && !self.available.contains(&index) {
            // Clear the buffer before returning to pool
            self.buffers[index].data.fill(0.0);
            self.available.push(index);
        }
    }

    /// Write to a buffer in the pool
    pub fn write_to_buffer(&mut self, index: usize, data: &[f32], offset: usize) -> bool {
        if let Some(buffer) = self.buffers.get_mut(index) {
            buffer.write(data, offset);
            true
        } else {
            false
        }
    }

    /// Read from a buffer in the pool
    pub fn read_from_buffer(&self, index: usize) -> Vec<f32> {
        if let Some(buffer) = self.buffers.get(index) {
            buffer.read()
        } else {
            vec![]
        }
    }

    /// Apply an operation to a buffer in the pool
    pub fn apply_operation_to_buffer(&mut self, index: usize, operation: &str) -> bool {
        if let Some(buffer) = self.buffers.get_mut(index) {
            buffer.apply_operation(operation);
            true
        } else {
            false
        }
    }
}