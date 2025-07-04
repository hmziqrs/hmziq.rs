# WASM Unified Rendering Architecture Plan - V2 (Render Pipeline Approach)

## Objective: Implement modular render pipeline with single-pass bulk data transfer

## Current Architecture Problems
- Multiple WASM boundary crossings per frame (6+ calls)
- Separate ParticlePool causing state synchronization issues
- Particles not rendering due to loose coupling between systems
- Memory allocations every frame for TypedArray conversions
- Fragmented memory access patterns across systems

## Target Architecture: Render Pipeline with Independent Subsystems

### Core Design Principles
1. **Modular subsystems** - Keep MeteorSystem and ParticleSystem separate for flexibility
2. **Unified render pipeline** - Single coordinator for all visual systems
3. **Zero-copy transfers** - Use persistent TypedArrays with views into WASM memory
4. **Differential updates** - Only transfer changed data using dirty tracking
5. **Extensible architecture** - Easy to add stars, explosions, or other effects

### Phase 1: Create RenderPipeline Infrastructure

#### Task 1.1: Implement RenderPipeline coordinator in WASM
**File**: `wasm/src/render_pipeline.rs` (new file)
**Implementation**:
```rust
pub struct RenderPipeline {
    // Independent subsystems
    meteor_system: MeteorSystem,
    particle_system: ParticleSystem,
    
    // Render infrastructure
    render_buffer: AdaptiveRenderBuffer,
    dirty_flags: DirtyFlags,
    
    // Performance tracking
    frame_counter: u32,
    high_water_marks: HighWaterMarks,
}

#[wasm_bindgen]
impl RenderPipeline {
    pub fn new(canvas_width: f32, canvas_height: f32) -> RenderPipeline
    pub fn update_all(&mut self, dt: f32, speed_multiplier: f32) -> u32
    pub fn get_render_packet(&self) -> RenderPacket
    pub fn mark_dirty(&mut self, system: u8)
}
```

#### Task 1.2: Create AdaptiveRenderBuffer with smart allocation
**File**: `wasm/src/render_buffer.rs` (new file)  
**Implementation**:
```rust
pub struct AdaptiveRenderBuffer {
    // Separate buffers for each system
    meteor_buffer: Vec<f32>,
    particle_buffer: Vec<f32>,
    
    // Track actual usage
    meteor_count: usize,
    particle_count: usize,
    
    // Grow/shrink based on high water marks
    reallocation_threshold: f32,
}
```

#### Task 1.3: Implement DirtyFlags for differential updates
**File**: `wasm/src/render_pipeline.rs`
**Implementation**:
```rust
bitflags! {
    pub struct DirtyFlags: u8 {
        const METEORS = 0b00000001;
        const PARTICLES = 0b00000010;
        const STARS = 0b00000100; // Future
        const ALL = 0b11111111;
    }
}
```

### Phase 2: Refactor ParticleSystem as Independent Module

#### Task 2.1: Create standalone ParticleSystem
**File**: `wasm/src/particle_system.rs` (new file)
**Implementation**:
```rust
pub struct ParticleSystem {
    particles: Vec<Particle>,
    free_indices: VecDeque<usize>,
    meteor_associations: HashMap<usize, Vec<usize>>, // meteor_id -> particle_indices
    active_count: usize,
}

impl ParticleSystem {
    pub fn spawn_for_meteor(&mut self, meteor_id: usize, x: f32, y: f32, meteor_type: u8) -> bool
    pub fn update_all(&mut self, dt: f32)
    pub fn free_meteor_particles(&mut self, meteor_id: usize)
    pub fn pack_render_data(&self, buffer: &mut [f32]) -> usize
}
```

#### Task 2.2: Remove particle management from MeteorSystem
**File**: `wasm/src/particles.rs`
**Actions**:
- Remove all particle-related fields from MeteorSystem
- Remove spawn_particle, update_particles methods
- Keep MeteorSystem focused only on meteor physics/rendering

#### Task 2.3: Add meteor lifecycle hooks
**File**: `wasm/src/particles.rs`
**Add methods**:
```rust
impl MeteorSystem {
    pub fn get_spawn_points(&self) -> Vec<SpawnPoint> // For particle system
    pub fn get_dying_meteors(&self) -> Vec<usize> // For cleanup
}
```

### Phase 3: Implement Zero-Copy Data Transfer

#### Task 3.1: Create persistent TypedArray views in TypeScript
**File**: `lib/wasm/render-pipeline.ts` (new file)
**Implementation**:
```typescript
export class RenderPipeline {
    private pipeline: any // WASM instance
    private wasmMemory: WebAssembly.Memory
    
    // Persistent typed arrays - no allocations per frame
    private meteorDataView: Float32Array
    private particleDataView: Float32Array
    private headerView: Uint32Array
    
    constructor(wasmModule: any, width: number, height: number) {
        this.pipeline = new wasmModule.RenderPipeline(width, height)
        this.wasmMemory = wasmModule.memory
        this.allocateViews()
    }
    
    private allocateViews() {
        // Pre-allocate views based on max expected sizes
        const maxMeteors = 20
        const maxParticles = 500
        
        // These are views into WASM memory - no copying!
        const headerPtr = this.pipeline.get_header_ptr()
        this.headerView = new Uint32Array(this.wasmMemory.buffer, headerPtr, 16)
    }
    
    updateAndGetRenderData(dt: number, speedMultiplier: number): RenderData {
        // Single WASM call
        const dirtyFlags = this.pipeline.update_all(dt, speedMultiplier)
        
        // Read header to know what changed
        const meteorCount = this.headerView[0]
        const particleCount = this.headerView[1]
        const changedSystems = this.headerView[2]
        
        // Return only changed data
        return {
            dirtyFlags: changedSystems,
            meteors: changedSystems & 1 ? this.getMeteorView(meteorCount) : null,
            particles: changedSystems & 2 ? this.getParticleView(particleCount) : null
        }
    }
}
```

#### Task 3.2: Implement direct memory views
**File**: `wasm/src/render_pipeline.rs`
**Add methods**:
```rust
#[wasm_bindgen]
impl RenderPipeline {
    pub fn get_header_ptr(&self) -> *const u32
    pub fn get_meteor_data_ptr(&self) -> *const f32  
    pub fn get_particle_data_ptr(&self) -> *const f32
    
    // These return stable pointers that JS can create views from
}
```

### Phase 4: Implement Smart Update Logic

#### Task 4.1: Add temporal coherence to reduce updates
**File**: `wasm/src/render_pipeline.rs`
**Implementation**:
```rust
impl RenderPipeline {
    fn should_update_meteors(&self) -> bool {
        // Skip update if no active meteors moved significantly
        self.meteor_system.has_significant_changes()
    }
    
    fn should_update_particles(&self) -> bool {
        // Skip if particle count stable and no new spawns
        self.frame_counter % 2 == 0 || self.particle_system.has_new_spawns()
    }
}
```

#### Task 4.2: Implement packed data format
**File**: `wasm/src/render_pipeline.rs`
**Data layout**:
```
Header (16 u32s):
[0]: meteor_count
[1]: particle_count  
[2]: dirty_flags
[3]: frame_number
[4-15]: reserved

Meteor Data (per meteor, 8 f32s):
[x, y, size, angle, glow_intensity, life_ratio, type, active]

Particle Data (per particle, 6 f32s):
[x, y, vx, vy, size, opacity]
```

### Phase 5: Update MeteorShower.tsx Integration

#### Task 5.1: Replace multiple WASM calls with RenderPipeline
**File**: `components/effects/MeteorShower.tsx`
**Replace**:
```typescript
// Old: 6+ WASM calls
meteorSystem.updateMeteors()
meteorSystem.updateParticles()
const positions = meteorSystem.getMeteorPositions()
const properties = meteorSystem.getMeteorProperties()
const particleData = meteorSystem.getParticleData()
const particleColors = meteorSystem.getParticleColors()

// New: Single call
const renderData = renderPipeline.updateAndGetRenderData(dt, speedMultiplier)
if (renderData.meteors) { /* render meteors */ }
if (renderData.particles) { /* render particles */ }
```

#### Task 5.2: Implement differential rendering
**File**: `components/effects/MeteorShower.tsx`
**Add logic**:
```typescript
// Only re-render changed subsystems
if (renderData.dirtyFlags & DirtyFlags.METEORS) {
    drawMeteors(renderData.meteors)
}
if (renderData.dirtyFlags & DirtyFlags.PARTICLES) {
    drawParticles(renderData.particles)  
}
```

### Phase 6: Performance Optimization

#### Task 6.1: Add performance metrics
**File**: `wasm/src/render_pipeline.rs`
**Implementation**:
```rust
pub struct PerformanceMetrics {
    update_times: RingBuffer<f32>,
    pack_times: RingBuffer<f32>,
    memory_usage: MemoryStats,
    cache_hits: u32,
}
```

#### Task 6.2: Implement adaptive quality
**File**: `wasm/src/render_pipeline.rs`
**Add logic**:
```rust
impl RenderPipeline {
    fn adaptive_particle_limit(&self) -> usize {
        // Reduce particles if frame time exceeds budget
        match self.get_average_frame_time() {
            t if t < 8.0 => 500,  // 120fps headroom
            t if t < 12.0 => 300, // 60fps target
            _ => 150,             // Degraded mode
        }
    }
}
```

### Phase 7: Testing and Validation

#### Task 7.1: Create comprehensive test suite
**File**: `tests/render_pipeline.test.ts`
**Test cases**:
1. Verify single WASM call per frame
2. Validate dirty flag behavior
3. Test memory view stability (no allocations)
4. Benchmark vs current implementation
5. Visual regression tests

#### Task 7.2: Add debug visualizations
**File**: `lib/wasm/render-pipeline.ts`
**Debug methods**:
```typescript
export class RenderPipelineDebug {
    visualizeDirtyRegions(ctx: CanvasRenderingContext2D)
    showMemoryLayout()
    getFrameMetrics(): PerformanceMetrics
}
```

## Implementation Order

1. **Phase 1**: RenderPipeline infrastructure (Critical - establishes architecture)
2. **Phase 2**: Refactor ParticleSystem (Fixes current visibility issue)
3. **Phase 3**: Zero-copy transfers (Major performance gain)
4. **Phase 4**: Smart update logic (Optimization)
5. **Phase 5**: TypeScript integration (Connects everything)
6. **Phase 6**: Performance tuning (Polish)
7. **Phase 7**: Testing (Validation)

## Benefits Over Original Unified Plan

1. **Modularity**: Systems remain independent, easier to extend
2. **Flexibility**: Can add new visual systems without modifying existing ones
3. **Performance**: Zero-copy transfers, differential updates
4. **Debugging**: Each system can be inspected independently
5. **Future-proof**: Easy to add stars, explosions, shields, etc.

## Migration Path

1. Start with RenderPipeline wrapping existing systems
2. Gradually optimize each subsystem
3. No breaking changes - can run side-by-side with current code
4. Feature flag to toggle between old and new approach