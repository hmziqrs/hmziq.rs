# WebAssembly Module Development Guide

This guide outlines the patterns and best practices for creating new WebAssembly modules in this project, based on the architecture established by our star field implementation.

## Module Structure

When creating a new WASM module:

1. Create your module file in `wasm/src/your_module.rs`
2. Register it in `wasm/src/lib.rs`:
   ```rust
   mod your_module;
   pub use your_module::*;
   ```
3. Expose functions with `#[wasm_bindgen]` for JavaScript access

## Memory Management Patterns

### Thread-Local Storage

WASM runs in a single-threaded environment, making `thread_local!` safe for global state:

**Reference**: `wasm/src/star_field.rs:11-14`

Use this pattern for module-wide state that needs to persist between function calls.

### Memory Pool Pattern

Pre-allocate memory pools for efficient memory management:

**Reference**: `wasm/src/star_field.rs:17-35`

Key benefits:
- Reduced allocation overhead
- Predictable memory layout
- Easy zero-copy sharing with JavaScript

### Structure of Arrays (SoA)

Organize data for cache efficiency and SIMD operations:

**Reference**: `wasm/src/star_field.rs:17-35`

Instead of Array of Structures:
```rust
struct Star { x: f32, y: f32, z: f32, color: f32 }
stars: Vec<Star>
```

Use Structure of Arrays:
```rust
positions_x: Vec<f32>
positions_y: Vec<f32>
positions_z: Vec<f32>
colors: Vec<f32>
```

## SIMD Optimization

**SIMD is enabled by default** in this project. Modern browsers support WebAssembly SIMD, so we implement SIMD-only solutions without fallbacks.

### 16-Element Batch Processing

Process data in batches of 16 elements using SIMD instructions:

**Reference**: `wasm/src/star_field.rs:369-414`

Key pattern:
1. Define `const SIMD_BATCH_SIZE: usize = 16`
2. Align data to SIMD boundaries
3. Process complete chunks with SIMD
4. Handle remaining elements with scalar operations (only for remainder after SIMD batches)

### SIMD Helper Functions

Create reusable SIMD utilities:

**Reference**: `wasm/src/math.rs:44-86`

Common operations:
- Batch trigonometric functions
- Vectorized random number generation
- Parallel arithmetic operations

## Zero-Copy Memory Sharing

### Pointer Structures

Expose memory pointers to JavaScript:

**Reference**: `wasm/src/star_field.rs:52-75`

Pattern:
```rust
#[wasm_bindgen]
pub struct ModuleMemoryPointers {
    pub data_ptr: u32,
    pub data_length: usize,
    // ... more pointers
}
```

### Direct Memory Views

Create TypeScript views into WASM memory:

**Reference**: `lib/wasm/index.ts:133-190`

This enables JavaScript to directly read/write WASM memory without copying.

### Memory Safety

- Always return both pointer and length
- Validate bounds in JavaScript
- Handle memory growth gracefully

## Performance Patterns

### Lookup Tables

Pre-compute expensive operations:

**Reference**: `wasm/src/math.rs:7-43`

Ideal for:
- Trigonometric functions
- Complex mathematical operations
- Frequently accessed computations

### Loop Unrolling

Process multiple iterations per loop:

**Reference**: `wasm/src/star_field.rs:373-414`

Benefits:
- Reduced loop overhead
- Better instruction pipelining
- Improved cache utilization

### Bitpacking

Store boolean arrays efficiently:

**Reference**: `wasm/src/star_field.rs:30` (declaration)
**Reference**: `lib/wasm/index.ts:195-234` (usage)

64 boolean values in a single `u64` - 64x memory reduction!

## TypeScript Integration

### Module Interface Definition

Define the TypeScript interface for your module:

**Reference**: `lib/wasm/index.ts:38-64`

Include:
- Function signatures
- Memory pointer structures
- Return types

### Shared Memory Wrapper Class

Create a wrapper for convenient memory access:

**Reference**: `lib/wasm/index.ts:112-284`

Features:
- Automatic view creation
- Memory growth handling
- Utility methods

### Frame Update Pattern

For real-time modules, implement efficient update cycles:

**Reference**: `lib/wasm/index.ts:261-283`

Return update results indicating what changed to minimize JavaScript work.

## Common Utilities

### Fast Math Functions

Leverage shared math utilities:

**Reference**: `wasm/src/math.rs:24-43`

Available utilities:
- `fast_sin_lookup` - Table-based sine
- `fast_sin_lookup_simd_16` - SIMD sine for 16 values

### Random Number Generation

Use seedable PRNG for deterministic behavior:

**Reference**: `wasm/src/math.rs:89-94`

Provides consistent results across runs with the same seed.

### SIMD Helpers

Reuse batch operation patterns:

**Reference**: `wasm/src/math.rs:96-117`

Common patterns for vectorized random numbers and math operations.

## Best Practices

1. **Data Alignment**: Always align to 16-element boundaries for SIMD
   ```rust
   let aligned_count = count.div_ceil(SIMD_BATCH_SIZE) * SIMD_BATCH_SIZE;
   ```

2. **Minimize Boundary Crossings**: Batch operations to reduce JS/WASM calls

3. **SIMD-First Approach**: Write SIMD implementations directly without non-SIMD fallbacks. SIMD is enabled by default and supported by all modern browsers.

4. **Handle Remainder Elements**: After processing complete SIMD batches, handle remaining elements with simple scalar operations (not full fallback implementations)

5. **Console Logging**: Use the provided macro for debugging:
   ```rust
   console_log!("Debug info: {}", value);
   ```

6. **Memory Efficiency**: Use bitpacking for boolean data, SoA for numerical data

7. **Import Pattern**: Use conditional imports for SIMD:
   ```rust
   #[cfg(feature = "simd")]
   use core::arch::wasm32::*;
   ```

## Example Module Template

```rust
use wasm_bindgen::prelude::*;
use std::cell::RefCell;

#[cfg(feature = "simd")]
use core::arch::wasm32::*;

const SIMD_BATCH_SIZE: usize = 16;

thread_local! {
    static MODULE_STATE: RefCell<Option<ModuleState>> = RefCell::new(None);
}

#[repr(C)]
struct ModuleState {
    // Your SoA data arrays
    data_x: Vec<f32>,
    data_y: Vec<f32>,
    count: usize,
}

#[wasm_bindgen]
pub struct ModulePointers {
    pub data_x_ptr: u32,
    pub data_y_ptr: u32,
    pub count: usize,
}

#[wasm_bindgen]
pub fn initialize_module(count: usize) -> ModulePointers {
    let aligned_count = count.div_ceil(SIMD_BATCH_SIZE) * SIMD_BATCH_SIZE;
    
    let state = ModuleState {
        data_x: vec![0.0; aligned_count],
        data_y: vec![0.0; aligned_count],
        count,
    };
    
    let pointers = ModulePointers {
        data_x_ptr: state.data_x.as_ptr() as u32,
        data_y_ptr: state.data_y.as_ptr() as u32,
        count: state.count,
    };
    
    MODULE_STATE.with(|cell| {
        *cell.borrow_mut() = Some(state);
    });
    
    pointers
}

#[wasm_bindgen]
pub fn update_data() {
    MODULE_STATE.with(|cell| {
        let mut state_ref = cell.borrow_mut();
        let state = state_ref.as_mut().expect("Module not initialized");
        
        let count = state.count;
        if count == 0 {
            return;
        }
        
        // Process complete SIMD batches
        let simd_chunks = count / SIMD_BATCH_SIZE;
        for chunk in 0..simd_chunks {
            let base = chunk * SIMD_BATCH_SIZE;
            update_batch_simd(state, base);
        }
        
        // Handle remaining elements with scalar operations
        let remaining_start = simd_chunks * SIMD_BATCH_SIZE;
        for i in remaining_start..count {
            update_element_scalar(state, i);
        }
    });
}

fn update_batch_simd(state: &mut ModuleState, base: usize) {
    unsafe {
        // Load 16 elements (4 vectors of 4 f32 each)
        let x_vec1 = v128_load(&state.data_x[base] as *const f32 as *const v128);
        let x_vec2 = v128_load(&state.data_x[base + 4] as *const f32 as *const v128);
        let x_vec3 = v128_load(&state.data_x[base + 8] as *const f32 as *const v128);
        let x_vec4 = v128_load(&state.data_x[base + 12] as *const f32 as *const v128);
        
        // Apply SIMD operations
        let multiplier = f32x4_splat(1.1);
        let new_x1 = f32x4_mul(x_vec1, multiplier);
        let new_x2 = f32x4_mul(x_vec2, multiplier);
        let new_x3 = f32x4_mul(x_vec3, multiplier);
        let new_x4 = f32x4_mul(x_vec4, multiplier);
        
        // Store results
        v128_store(state.data_x[base..].as_mut_ptr() as *mut v128, new_x1);
        v128_store(state.data_x[base + 4..].as_mut_ptr() as *mut v128, new_x2);
        v128_store(state.data_x[base + 8..].as_mut_ptr() as *mut v128, new_x3);
        v128_store(state.data_x[base + 12..].as_mut_ptr() as *mut v128, new_x4);
    }
}

fn update_element_scalar(state: &mut ModuleState, index: usize) {
    // Simple scalar operation for remainder elements
    state.data_x[index] *= 1.1;
}
```

This template demonstrates all the key patterns for high-performance WASM modules in this project.

## SIMD-First Philosophy

This project follows a **SIMD-first approach** for maximum performance:

### ✅ **Do This:**
- Write SIMD implementations directly using `core::arch::wasm32::*`
- Process data in batches of 16 elements (4 vectors × 4 f32 each)
- Handle remainder elements with simple scalar operations
- Assume SIMD support is available (it's enabled by default)

### ❌ **Don't Do This:**
- Create full non-SIMD fallback implementations
- Use feature flags to conditionally compile SIMD code
- Write JavaScript fallbacks for WASM functions
- Implement dual code paths for SIMD vs non-SIMD

### Why SIMD-First?
- **Modern Browser Support**: All target browsers support WebAssembly SIMD
- **Performance**: 4x faster processing compared to scalar operations
- **Simplicity**: Single code path reduces complexity and maintenance
- **Future-Proof**: SIMD is the standard for high-performance web applications

### Handling Non-SIMD Elements
Only implement simple scalar operations for remainder elements that don't fit into complete SIMD batches:

```rust
// After processing complete SIMD batches of 16 elements
let remaining_start = simd_chunks * SIMD_BATCH_SIZE;
for i in remaining_start..count {
    // Simple scalar operation - not a full fallback implementation
    data[i] = data[i] * 2.0;
}
```