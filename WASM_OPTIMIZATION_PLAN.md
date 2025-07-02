# WebAssembly Performance Optimization Plan

## Overview
This plan outlines the migration of computation-heavy JavaScript logic to Rust-based WebAssembly modules for significant performance improvements in the space-themed landing page.

## Prerequisites & Setup

### Task 1: Development Environment Setup
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM target
rustup target add wasm32-unknown-unknown

# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Install wasm-bindgen CLI
cargo install wasm-bindgen-cli
```

### Task 2: Project Structure
```
hmziq.rs/
├── wasm/                    # New directory for Rust code
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs          # Main WASM module
│   │   ├── star_field.rs   # Star calculations
│   │   ├── particles.rs    # Particle system
│   │   ├── math.rs         # Math utilities
│   │   └── bezier.rs       # Bezier calculations
│   └── pkg/                # Generated WASM output
└── lib/
    └── wasm/               # JS/TS bindings
        └── index.ts

```

## Implementation Tasks

### Task 3: Integration Test
**File:** `wasm/src/lib.rs`
```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn add(a: f32, b: f32) -> f32 {
    a + b
}
```
**Test in:** `app/page.tsx` - Verify WASM loads and executes

### Task 4: Star Field Position Generation
**Current:** `components/three/StarField.tsx:232-350`
**Target:** `wasm/src/star_field.rs`
- Port spherical coordinate conversion
- Batch generate all star positions
- Return Float32Array for direct GPU buffer use
```rust
#[wasm_bindgen]
pub fn generate_star_positions(count: usize, radius: f32) -> Vec<f32> {
    // Implement spherical distribution
}
```

### Task 5: Star Twinkle Effects
**Current:** `components/three/StarField.tsx:353-388`
**Target:** `wasm/src/star_field.rs`
- SIMD-optimized sin calculations
- Batch process all near stars
- Direct buffer manipulation
```rust
#[wasm_bindgen]
pub fn update_star_effects(positions: &mut [f32], time: f32, delta: f32) {
    // Parallel twinkle calculations
}
```

### Task 6: Bezier Path Pre-calculation
**Current:** `components/effects/MeteorShower.tsx:262-292`
**Target:** `wasm/src/bezier.rs`
- Generate cubic Bezier curves
- Pre-calculate path points
- Optimize with const generics
```rust
#[wasm_bindgen]
pub fn precalculate_bezier_path(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, steps: usize) -> Vec<f32> {
    // Efficient Bezier calculation
}
```

### Task 7: Meteor Animation Loop
**Current:** `components/effects/MeteorShower.tsx:625-850`
**Target:** `wasm/src/particles.rs`
- Batch interpolate all meteor positions
- Update particle systems in parallel
- Minimize JS-WASM boundary crossings
```rust
#[wasm_bindgen]
pub struct MeteorSystem {
    meteors: Vec<Meteor>,
    particles: ParticlePool,
}

#[wasm_bindgen]
impl MeteorSystem {
    pub fn update(&mut self, delta: f32) -> UpdateResult {
        // Batch update all meteors
    }
}
```

### Task 8: Spatial Indexing for Overlap Detection
**Current:** `components/effects/LightNebula.tsx:413-463`
**Target:** `wasm/src/spatial.rs`
- Replace O(n²) with spatial hash grid
- Efficient neighbor queries
- Cache-friendly data layout
```rust
#[wasm_bindgen]
pub struct SpatialGrid {
    cells: Vec<Vec<usize>>,
    cell_size: f32,
}

#[wasm_bindgen]
impl SpatialGrid {
    pub fn find_overlaps(&self) -> Vec<u32> {
        // Return pairs of overlapping cloud indices
    }
}
```

### Task 9: Particle System Manager
**Current:** Multiple files use particle effects
**Target:** `wasm/src/particles.rs`
- Unified particle pool management
- Batch particle updates
- Memory-efficient representations
```rust
#[wasm_bindgen]
pub struct ParticlePool {
    positions: Vec<f32>,
    velocities: Vec<f32>,
    lifetimes: Vec<f32>,
    active_count: usize,
}
```

### Task 10: Math Utilities Module
**Current:** `lib/performance/performance-utils.ts:126-140`
**Target:** `wasm/src/math.rs`
- Fast trigonometric approximations
- SIMD vector operations
- Common math functions
```rust
#[wasm_bindgen]
pub fn fast_sin_batch(values: &[f32]) -> Vec<f32> {
    // SIMD-optimized sin approximation
}
```

### Task 11: Memory Management
**Target:** `wasm/src/lib.rs`
- Shared memory buffers
- Zero-copy data transfer
- Efficient array passing
```rust
#[wasm_bindgen]
pub struct SharedBuffer {
    data: Vec<f32>,
}

#[wasm_bindgen]
impl SharedBuffer {
    pub fn as_ptr(&self) -> *const f32 {
        self.data.as_ptr()
    }
}
```

### Task 12: Performance Benchmarking
**File:** `tests/wasm-benchmarks.ts`
- Compare JS vs WASM performance
- Measure memory usage
- Profile hot paths

### Task 13: Build Pipeline Updates
**Files:** 
- `next.config.ts` - Add WASM webpack loader
- `package.json` - Add wasm-pack build script
- `.github/workflows/` - Add Rust compilation

### Task 14: Fallback System
**File:** `lib/wasm/index.ts`
```typescript
export async function loadWASM() {
  try {
    const wasm = await import('../../wasm/pkg');
    return wasm;
  } catch (e) {
    console.warn('WASM failed to load, using JS fallback');
    return null;
  }
}
```

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