# WASM Unified Rendering Architecture Plan - V4 Complete (All Optimizations + JS Fallback)

## Objective: Implement dual-mode render pipeline with ALL performance optimizations and seamless fallback

## Missing from V3 that was in V2:
- Temporal coherence optimization
- Packed data format specification  
- Differential rendering details
- PerformanceMetrics with RingBuffer
- Adaptive particle limits
- Debug visualization tools
- Direct memory pointer methods
- Comprehensive testing suite

## Complete Task List (Merging V2 + V3)

### Phase 1: Define Common Interfaces and Architecture

#### Task 1.1: Create IRenderPipeline interface
**File**: `lib/rendering/interfaces.ts` (new file)
**Implementation**: As in V3 - defines common interface for both WASM and JS

#### Task 1.2: Create RenderPipelineFactory
**File**: `lib/rendering/pipeline-factory.ts` (new file)
**Implementation**: As in V3 - runtime selection between WASM and JS

#### Task 1.3: Define packed data format specification
**File**: `lib/rendering/data-format.ts` (new file)
**Implementation**: FROM V2 - Critical for optimization
```typescript
export const RENDER_DATA_FORMAT = {
  HEADER_SIZE: 16, // u32 values
  METEOR_STRIDE: 8, // [x, y, size, angle, glow_intensity, life_ratio, type, active]
  PARTICLE_STRIDE: 6, // [x, y, vx, vy, size, opacity]
  TRAIL_STRIDE: 3, // [x, y, opacity]
} as const

export interface PackedDataLayout {
  header: {
    meteorCount: 0,
    particleCount: 1,
    dirtyFlags: 2,
    frameNumber: 3,
    avgFrameTime: 4,
    memoryUsage: 5,
    // 6-15: reserved
  }
}
```

### Phase 2: Implement JavaScript Fallback System

#### Task 2.1: Create JSMeteorSystem
**File**: `lib/rendering/js-fallback/js-meteor-system.ts`
**Implementation**: As in V3

#### Task 2.2: Create JSParticleSystem
**File**: `lib/rendering/js-fallback/js-particle-system.ts`
**Implementation**: As in V3

#### Task 2.3: Create JSRenderPipeline
**File**: `lib/rendering/js-fallback/js-render-pipeline.ts`
**Implementation**: As in V3 but WITH temporal coherence from V2

#### Task 2.4: Add temporal coherence to JS implementation
**File**: `lib/rendering/js-fallback/js-render-pipeline.ts`
**Add methods**: FROM V2
```typescript
private shouldUpdateMeteors(): boolean {
  // Skip update if no significant changes
  return this.meteorSystem.hasSignificantChanges() || 
         this.frameCounter % 3 === 0
}

private shouldUpdateParticles(): boolean {
  // Update every other frame unless new spawns
  return this.frameCounter % 2 === 0 || 
         this.particleSystem.hasNewSpawns()
}
```

### Phase 3: WASM Infrastructure

#### Task 3.1: Create render_pipeline.rs with RenderPipeline coordinator
**File**: `wasm/src/render_pipeline.rs` (new file)
**Implementation**: FROM V2 - Complete implementation with all fields

#### Task 3.2: Implement AdaptiveRenderBuffer
**File**: `wasm/src/render_buffer.rs` (new file)  
**Implementation**: FROM V2 - Smart allocation with high-water marks

#### Task 3.3: Implement DirtyFlags bitflags
**File**: `wasm/src/render_pipeline.rs`
**Implementation**: FROM V2 - Essential for differential updates

#### Task 3.4: Add direct memory pointer methods
**File**: `wasm/src/render_pipeline.rs`
**Implementation**: FROM V2 - Critical for zero-copy
```rust
#[wasm_bindgen]
impl RenderPipeline {
    pub fn get_header_ptr(&self) -> *const u32
    pub fn get_meteor_data_ptr(&self) -> *const f32  
    pub fn get_particle_data_ptr(&self) -> *const f32
}
```

### Phase 4: Refactor WASM Systems

#### Task 4.1: Create standalone ParticleSystem
**File**: `wasm/src/particle_system.rs` (new file)
**Implementation**: FROM V2

#### Task 4.2: Remove particle management from MeteorSystem
**File**: `wasm/src/particles.rs`
**Actions**: FROM V2

#### Task 4.3: Add lifecycle hooks to MeteorSystem
**File**: `wasm/src/particles.rs`
**Implementation**: FROM V2 - get_spawn_points, get_dying_meteors

#### Task 4.4: Implement temporal coherence in WASM
**File**: `wasm/src/render_pipeline.rs`
**Implementation**: FROM V2
```rust
impl RenderPipeline {
    fn should_update_meteors(&self) -> bool {
        self.meteor_system.has_significant_changes() ||
        self.frame_counter % 3 == 0
    }
    
    fn should_update_particles(&self) -> bool {
        self.frame_counter % 2 == 0 || 
        self.particle_system.has_new_spawns()
    }
}
```

### Phase 5: TypeScript Integration Layer

#### Task 5.1: Create WASMRenderPipeline wrapper
**File**: `lib/rendering/wasm-render-pipeline.ts` (new file)
**Implementation**: FROM V3 - with zero-copy views

#### Task 5.2: Create persistent TypedArray manager
**File**: `lib/rendering/typed-array-manager.ts` (new file)
**Implementation**: FROM V2 - Pre-allocated views
```typescript
export class TypedArrayManager {
  private views: Map<string, ArrayBufferView> = new Map()
  
  allocateViews(memory: WebAssembly.Memory, config: ViewConfig) {
    // Pre-allocate all views once
    this.views.set('header', new Uint32Array(memory.buffer, config.headerPtr, 16))
    this.views.set('meteors', new Float32Array(memory.buffer, config.meteorPtr, config.maxMeteors * 8))
    this.views.set('particles', new Float32Array(memory.buffer, config.particlePtr, config.maxParticles * 6))
  }
  
  getView<T extends ArrayBufferView>(name: string): T {
    return this.views.get(name) as T
  }
}
```

#### Task 5.3: Implement unified rendering functions
**File**: `lib/rendering/unified-renderer.ts` (new file)
**Implementation**: FROM V3

### Phase 6: Update MeteorShower Component

#### Task 6.1: Replace multiple WASM calls with single pipeline call
**File**: `components/effects/MeteorShower.tsx`
**Implementation**: FROM V2/V3 - Single updateAll call

#### Task 6.2: Implement differential rendering
**File**: `components/effects/MeteorShower.tsx`
**Implementation**: FROM V2
```typescript
// Only re-render changed subsystems
if (renderData.dirtyFlags & DirtyFlags.METEORS) {
  // Clear only meteor region if possible
  clearMeteorRegions(ctx, previousMeteorBounds)
  renderMeteors(ctx, renderData.meteors)
}

if (renderData.dirtyFlags & DirtyFlags.PARTICLES) {
  // Clear only particle regions
  clearParticleRegions(ctx, previousParticleBounds)
  renderParticles(ctx, renderData.particles)
}
```

### Phase 7: Performance Optimization

#### Task 7.1: Add PerformanceMetrics with RingBuffer
**File**: `wasm/src/performance.rs` (new file)
**Implementation**: FROM V2
```rust
pub struct PerformanceMetrics {
    update_times: RingBuffer<f32, 60>,
    pack_times: RingBuffer<f32, 60>,
    memory_usage: MemoryStats,
    cache_hits: u32,
    cache_misses: u32,
}

pub struct RingBuffer<T, const N: usize> {
    data: [T; N],
    head: usize,
    count: usize,
}
```

#### Task 7.2: Implement adaptive particle limits
**File**: `wasm/src/render_pipeline.rs`
**Implementation**: FROM V2
```rust
impl RenderPipeline {
    fn adaptive_particle_limit(&self) -> usize {
        match self.metrics.get_average_frame_time() {
            t if t < 8.0 => 500,   // 120fps headroom
            t if t < 12.0 => 300,  // 60fps target
            t if t < 16.0 => 200,  // 60fps struggling
            _ => 150,              // Degraded mode
        }
    }
}
```

#### Task 7.3: Add performance monitoring
**File**: `lib/rendering/performance-monitor.ts` (new file)
**Implementation**: FROM V3 - Enhanced with auto-downgrade

### Phase 8: Debug and Visualization Tools

#### Task 8.1: Create RenderPipelineDebug class
**File**: `lib/rendering/debug/pipeline-debug.ts` (new file)
**Implementation**: FROM V2
```typescript
export class RenderPipelineDebug {
  visualizeDirtyRegions(ctx: CanvasRenderingContext2D, dirtyFlags: number) {
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
    ctx.lineWidth = 2
    
    if (dirtyFlags & DirtyFlags.METEORS) {
      ctx.strokeRect(0, 0, ctx.canvas.width / 2, ctx.canvas.height)
    }
    
    if (dirtyFlags & DirtyFlags.PARTICLES) {
      ctx.strokeRect(ctx.canvas.width / 2, 0, ctx.canvas.width / 2, ctx.canvas.height)
    }
    
    ctx.restore()
  }
  
  showMemoryLayout(pipeline: IRenderPipeline) {
    const metrics = pipeline.getMetrics()
    console.table({
      'Meteor Buffer': `${metrics.meteorBufferSize} bytes`,
      'Particle Buffer': `${metrics.particleBufferSize} bytes`,
      'Total Memory': `${metrics.memoryUsage} bytes`,
      'High Water Mark': `${metrics.highWaterMark} bytes`
    })
  }
}
```

#### Task 8.2: Add visual performance overlay
**File**: `lib/rendering/debug/performance-overlay.ts` (new file)
**Implementation**: New addition
```typescript
export class PerformanceOverlay {
  render(ctx: CanvasRenderingContext2D, metrics: PerformanceMetrics) {
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(10, 10, 200, 100)
    
    ctx.fillStyle = metrics.isWASM ? '#00ff00' : '#ffff00'
    ctx.font = '12px monospace'
    ctx.fillText(`Mode: ${metrics.isWASM ? 'WASM' : 'JavaScript'}`, 20, 30)
    ctx.fillText(`FPS: ${(1000 / metrics.frameTime).toFixed(1)}`, 20, 50)
    ctx.fillText(`Meteors: ${metrics.activeMeteors}`, 20, 70)
    ctx.fillText(`Particles: ${metrics.activeParticles}`, 20, 90)
    
    ctx.restore()
  }
}
```

### Phase 9: Comprehensive Testing

#### Task 9.1: Create unit tests for both implementations
**File**: `tests/render_pipeline.test.ts` (new file)
**Implementation**: FROM V2 - Enhanced
```typescript
describe('RenderPipeline', () => {
  describe.each(['WASM', 'JavaScript'])('%s implementation', (mode) => {
    let pipeline: IRenderPipeline
    
    beforeEach(async () => {
      const canvas = document.createElement('canvas')
      pipeline = await RenderPipelineFactory.create(canvas, {
        forceJavaScript: mode === 'JavaScript'
      })
    })
    
    test('single update call per frame', () => {
      const spy = jest.spyOn(pipeline, 'updateAll')
      pipeline.updateAll(16.67, 1.0)
      expect(spy).toHaveBeenCalledTimes(1)
    })
    
    test('dirty flags behavior', () => {
      const flags = pipeline.updateAll(16.67, 1.0)
      const data = pipeline.getRenderData()
      expect(data.dirtyFlags).toBe(0) // Cleared after read
    })
    
    test('zero allocations during runtime', () => {
      // Measure heap before/after update cycle
      const heapBefore = performance.memory.usedJSHeapSize
      
      for (let i = 0; i < 100; i++) {
        pipeline.updateAll(16.67, 1.0)
        pipeline.getRenderData()
      }
      
      const heapAfter = performance.memory.usedJSHeapSize
      expect(heapAfter - heapBefore).toBeLessThan(10000) // < 10KB
    })
  })
})
```

#### Task 9.2: Create performance benchmarks
**File**: `tests/render_pipeline.bench.ts` (new file)
**Implementation**: New addition
```typescript
import { bench, describe } from 'vitest'

describe('RenderPipeline Performance', () => {
  bench('WASM update cycle', async () => {
    const pipeline = await createWASMPipeline()
    pipeline.updateAll(16.67, 1.0)
    pipeline.getRenderData()
  })
  
  bench('JavaScript update cycle', async () => {
    const pipeline = await createJSPipeline()
    pipeline.updateAll(16.67, 1.0)
    pipeline.getRenderData()
  })
  
  bench('Boundary crossing comparison', async () => {
    // Measure old vs new approach
  })
})
```

#### Task 9.3: Visual regression tests
**File**: `tests/visual-regression.test.ts` (new file)
**Implementation**: Ensure both paths render identically

## Complete Implementation Order

1. **Interfaces & Architecture** (Tasks 1.1-1.3)
2. **JavaScript Fallback** (Tasks 2.1-2.4)  
3. **WASM Infrastructure** (Tasks 3.1-3.4)
4. **WASM System Refactor** (Tasks 4.1-4.4)
5. **TypeScript Integration** (Tasks 5.1-5.3)
6. **Component Update** (Tasks 6.1-6.2)
7. **Performance Optimization** (Tasks 7.1-7.3)
8. **Debug Tools** (Tasks 8.1-8.2)
9. **Testing** (Tasks 9.1-9.3)

## Total Task Count: 28 tasks (vs 16 in V2, 15 in V3)

This plan includes:
- ALL optimizations from V2
- Complete JavaScript fallback from V3
- Additional debug and testing enhancements
- No features have been removed