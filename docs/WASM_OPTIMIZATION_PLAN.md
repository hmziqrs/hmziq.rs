# WebAssembly Performance Optimization Plan

## Overview
This plan outlines the migration of computation-heavy JavaScript logic to Rust-based WebAssembly modules for significant performance improvements in the space-themed landing page.

## Task Checklist

### ✅ Phase 1: Infrastructure Setup
- [x] **Task 1: Development Environment Setup**
  - [x] Install Rust toolchain (already installed)
  - [x] Add wasm32-unknown-unknown target 
  - [x] Install wasm-pack
  - [x] Install wasm-bindgen-cli

- [x] **Task 2: Project Structure**
  - [x] Create `wasm/` directory with Rust crate
  - [x] Set up `wasm/Cargo.toml` with dependencies
  - [x] Create `lib/wasm/` for JS/TS bindings
  - [x] Add build scripts to `package.json`

**Implemented Structure:**
```
hmziq.rs/
├── wasm/                    # Rust WASM module
│   ├── Cargo.toml          # ✅ Created with wasm-bindgen deps
│   ├── src/
│   │   ├── lib.rs          # ✅ Main WASM module entry
│   │   ├── star_field.rs   # 🚧 Star calculations (pending)
│   │   ├── particles.rs    # 🚧 Particle system (pending)
│   │   ├── math.rs         # 🚧 Math utilities (pending)
│   │   └── bezier.rs       # 🚧 Bezier calculations (pending)
│   └── pkg/                # ✅ Generated WASM output
├── lib/wasm/               # ✅ JS/TS bindings
│   └── index.ts            # ✅ WASM loader with fallbacks
├── scripts/                # ✅ Build automation
│   └── copy-wasm.js        # ✅ WASM file deployment
└── components/debug/       # ✅ Testing
    └── WASMTest.tsx        # ✅ Integration verification
```

- [x] **Task 3: Integration Test**
  - [x] Create basic WASM module in `wasm/src/lib.rs`
  - [x] Implement test functions (add, greet)
  - [x] Add test component `components/debug/WASMTest.tsx`
  - [x] Verify WASM loads and executes in browser

**Test Implementation:**
```rust
// wasm/src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn add(a: f32, b: f32) -> f32 {
    a + b
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello from Rust WASM, {}!", name)
}
```

- [x] **Task 13: Build Pipeline Updates**
  - [x] Configure Next.js webpack for WASM support in `next.config.ts`
  - [x] Add wasm-pack build scripts to `package.json`
  - [x] Create WASM file copy script `scripts/copy-wasm.js`
  - [x] Update `.gitignore` for WASM artifacts

- [x] **Task 14: Fallback System**
  - [x] Implement WASM loader with graceful degradation in `lib/wasm/index.ts`
  - [x] Add JavaScript fallback implementations
  - [x] Create unified API for WASM/JS functions

**Fallback Implementation:**
```typescript
// lib/wasm/index.ts
export async function loadWASM(): Promise<WASMModule | null> {
  try {
    const { default: init, add, greet } = await import('/wasm/pkg/hmziq_wasm.js');
    await init('/wasm/pkg/hmziq_wasm_bg.wasm');
    return { add, greet };
  } catch (error) {
    console.warn('WASM failed to load, using JS fallback');
    return null;
  }
}

export const jsFallbacks = {
  add: (a: number, b: number) => a + b,
  greet: (name: string) => `Hello from JS fallback, ${name}!`,
};
```

### 🚧 Phase 2: Core Optimizations (Pending)
- [ ] **Task 4: Star Field Position Generation**
  - [ ] Port spherical coordinate conversion from `StarField.tsx:232-350`
  - [ ] Implement `generate_star_positions()` in `wasm/src/star_field.rs`
  - [ ] Return Float32Array for direct GPU buffer use
  - [ ] Integration testing with Three.js

**Target Implementation:**
```rust
// wasm/src/star_field.rs
#[wasm_bindgen]
pub fn generate_star_positions(count: usize, radius: f32) -> Vec<f32> {
    let mut positions = Vec::with_capacity(count * 3);
    for i in 0..count {
        // Spherical coordinate conversion (port from StarField.tsx:232-350)
        let phi = (i as f32 / count as f32) * 2.0 * PI;
        let theta = ((i % 17) as f32 / 17.0) * PI;
        
        let x = radius * theta.sin() * phi.cos();
        let y = radius * theta.sin() * phi.sin();
        let z = radius * theta.cos();
        
        positions.extend([x, y, z]);
    }
    positions
}
```

- [ ] **Task 10: Math Utilities Module**
  - [ ] Port fast sin/cos approximations from `performance-utils.ts:126-140`
  - [ ] Implement SIMD vector operations in `wasm/src/math.rs`
  - [ ] Create batch processing functions
  - [ ] Performance benchmarking vs JS implementation

**Target Implementation:**
```rust
// wasm/src/math.rs
#[wasm_bindgen]
pub fn fast_sin_batch(values: &[f32]) -> Vec<f32> {
    // Port lookup table from performance-utils.ts:126-140
    // SIMD-optimized sin approximation
    values.iter().map(|&x| fast_sin_lookup(x)).collect()
}

#[wasm_bindgen]
pub fn fast_cos_batch(values: &[f32]) -> Vec<f32> {
    values.iter().map(|&x| fast_sin_lookup(x + PI / 2.0)).collect()
}
```

- [ ] **Task 6: Bezier Path Pre-calculation**
  - [ ] Port Bezier calculations from `MeteorShower.tsx:262-292`
  - [ ] Implement `precalculate_bezier_path()` in `wasm/src/bezier.rs`
  - [ ] Optimize with const generics and SIMD
  - [ ] Integration with meteor animation system

**Target Implementation:**
```rust
// wasm/src/bezier.rs
#[wasm_bindgen]
pub fn precalculate_bezier_path(
    p0x: f32, p0y: f32, p1x: f32, p1y: f32,
    p2x: f32, p2y: f32, p3x: f32, p3y: f32,
    steps: usize
) -> Vec<f32> {
    // Port from MeteorShower.tsx:262-292
    let mut path = Vec::with_capacity(steps * 2);
    for i in 0..steps {
        let t = i as f32 / (steps - 1) as f32;
        let (x, y) = cubic_bezier(t, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y);
        path.extend([x, y]);
    }
    path
}
```

- [ ] **Task 11: Memory Management**
  - [ ] Implement shared memory buffers in `wasm/src/lib.rs`
  - [ ] Create zero-copy data transfer mechanisms
  - [ ] Optimize array passing between JS and WASM
  - [ ] Memory usage profiling

**Target Implementation:**
```rust
// wasm/src/lib.rs
#[wasm_bindgen]
pub struct SharedBuffer {
    data: Vec<f32>,
}

#[wasm_bindgen]
impl SharedBuffer {
    #[wasm_bindgen(constructor)]
    pub fn new(size: usize) -> SharedBuffer {
        SharedBuffer { data: Vec::with_capacity(size) }
    }
    
    #[wasm_bindgen(getter)]
    pub fn ptr(&self) -> *const f32 {
        self.data.as_ptr()
    }
}
```

### 🔄 Phase 3: Advanced Optimizations (Pending)
- [ ] **Task 5: Star Twinkle Effects**
  - [ ] Port twinkle calculations from `StarField.tsx:353-388`
  - [ ] Implement SIMD-optimized sin calculations
  - [ ] Batch process all near stars
  - [ ] Direct buffer manipulation for GPU sync

- [ ] **Task 7: Meteor Animation Loop**
  - [ ] Port animation loop from `MeteorShower.tsx:625-850`
  - [ ] Implement `MeteorSystem` struct in `wasm/src/particles.rs`
  - [ ] Batch interpolate meteor positions
  - [ ] Minimize JS-WASM boundary crossings

- [ ] **Task 8: Spatial Indexing for Overlap Detection**
  - [ ] Replace O(n²) algorithm from `LightNebula.tsx:413-463`
  - [ ] Implement spatial hash grid in `wasm/src/spatial.rs`
  - [ ] Create efficient neighbor queries
  - [ ] Cache-friendly data layout optimization

- [ ] **Task 9: Particle System Manager**
  - [ ] Create unified particle pool in `wasm/src/particles.rs`
  - [ ] Implement batch particle updates
  - [ ] Memory-efficient representations
  - [ ] Cross-component particle management

### 📊 Phase 4: Testing & Optimization (Pending)
- [ ] **Task 12: Performance Benchmarking**
  - [ ] Create benchmark suite in `tests/wasm-benchmarks.ts`
  - [ ] Compare JS vs WASM performance for each function
  - [ ] Measure memory usage and allocation patterns
  - [ ] Profile hot paths and bottlenecks

## Current Status
**Infrastructure:** ✅ Complete  
**WASM Integration:** ✅ Working  
**Ready for:** Core optimization implementation

## Performance Targets
- Star field calculations: 10x speedup
- Particle updates: 5x speedup  
- Overlap detection: O(n²) → O(n log n)
- Overall frame time: <8ms → <4ms

## Implementation Details

### Core Code Examples

**Star Field Position Generation:**
```rust
#[wasm_bindgen]
pub fn generate_star_positions(count: usize, radius: f32) -> Vec<f32> {
    // Port from StarField.tsx:232-350
    // Spherical coordinate conversion with SIMD
}
```

**Bezier Path Pre-calculation:**
```rust
#[wasm_bindgen]
pub fn precalculate_bezier_path(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, steps: usize) -> Vec<f32> {
    // Port from MeteorShower.tsx:262-292
    // Optimize with const generics
}
```

**Math Utilities:**
```rust
#[wasm_bindgen]
pub fn fast_sin_batch(values: &[f32]) -> Vec<f32> {
    // Port from performance-utils.ts:126-140
    // SIMD-optimized trigonometric functions
}
```

**Spatial Indexing:**
```rust
#[wasm_bindgen]
pub struct SpatialGrid {
    cells: Vec<Vec<usize>>,
    cell_size: f32,
}

#[wasm_bindgen]
impl SpatialGrid {
    pub fn find_overlaps(&self) -> Vec<u32> {
        // Replace O(n²) from LightNebula.tsx:413-463
        // Efficient spatial hash grid
    }
}
```

## Integration Points
1. **StarField.tsx:390-443** - Replace animation loop with WASM calls
2. **MeteorShower.tsx:625-850** - Delegate to WASM particle system  
3. **LightNebula.tsx:360-463** - Use WASM for physics and overlap
4. **performance-utils.ts** - Wrap WASM functions with fallbacks

## Performance Targets
- Star field calculations: 10x speedup
- Particle updates: 5x speedup  
- Overlap detection: O(n²) → O(n log n)
- Overall frame time: <8ms → <4ms

## Integration Points
1. **StarField.tsx:390-443** - Replace animation loop with WASM calls
2. **MeteorShower.tsx:625-850** - Delegate to WASM particle system
3. **LightNebula.tsx:360-463** - Use WASM for physics and overlap
4. **performance-utils.ts** - Wrap WASM functions with fallbacks