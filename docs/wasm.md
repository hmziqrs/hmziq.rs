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

### 16-Element Batch Processing

Process data in batches of 16 elements using `f32x16`:

**Reference**: `wasm/src/star_field.rs:369-414`

Key pattern:
1. Define `const SIMD_BATCH_SIZE: usize = 16`
2. Align data to SIMD boundaries
3. Process complete chunks with SIMD
4. Handle remaining elements with scalar fallback

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

3. **Handle Partial Batches**: Always implement scalar fallback for remaining elements

4. **Console Logging**: Use the provided macro for debugging:
   ```rust
   console_log!("Debug info: {}", value);
   ```

5. **Memory Efficiency**: Use bitpacking for boolean data, SoA for numerical data

6. **Feature Flags**: Enable SIMD features in `Cargo.toml`:
   ```toml
   [features]
   default = ["simd"]
   simd = []
   ```

## Example Module Template

```rust
use wasm_bindgen::prelude::*;
use std::cell::RefCell;

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
    
    let mut state = ModuleState {
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
```

This template demonstrates all the key patterns for high-performance WASM modules in this project.