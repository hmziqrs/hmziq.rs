# MeteorShower Refactor Implementation Guide

**Component Path:** `@/components/effects/MeteorShower.tsx`

## Overview

This guide provides step-by-step instructions for implementing the MeteorShower component refactor with dual-mode (WASM/JavaScript) architecture and comprehensive performance optimizations.

## Key Features

- **Dual-mode execution**: Seamless WASM with JavaScript fallback
- **Zero-copy transfers**: Direct memory views into WASM
- **Differential rendering**: Only update changed subsystems
- **Temporal coherence**: Skip unnecessary updates
- **Adaptive performance**: Automatic quality adjustment
- **Complete testing**: Unit tests, benchmarks, visual regression

## Context Reading Instructions

**IMPORTANT**: When working with this refactor, read specific sections from the architecture file using line ranges to avoid token limits.

### Essential Context References
**Reference**: `docs/METEOR_SHOWER_REFACTOR_ARCHITECTURE.md`

| Section | Description | Line Range |
|---------|-------------|------------|
| Objective | High-performance meteor shower goals | Line 5 |
| Architecture Overview | System diagram and structure | Lines 7-24 |
| Core Design Principles | 8 key design principles | Lines 25-34 |

**Usage**: Read these sections first to understand the project context before implementing any phase.

## Implementation Order

### Architecture File Index
**Reference**: `docs/METEOR_SHOWER_REFACTOR_ARCHITECTURE.md`

| Phase | Description | Line Range |
|-------|-------------|------------|
| Phase 1 | Core Interfaces | Lines 37-288 |
| Phase 2 | JavaScript Fallback | Lines 289-1022 |
| Phase 3 | WASM Infrastructure | Lines 1023-1512 |
| Phase 4 | Refactor WASM Systems | Lines 1513-1830 |
| Phase 5 | TypeScript Integration | Lines 1831-2198 |
| Phase 6 | Update MeteorShower | Lines 2199-2234 |
| Phase 7 | Performance Optimization | Lines 2235-2309 |
| Phase 8 | Debug Tools | Lines 2310-2456 |
| Phase 9 | Testing | Lines 2457-2773 |

### 1. Core Interfaces (Phase 1) - Architecture Lines: 37-288
**Prerequisites**: Read Essential Context (Lines 5, 7-24, 25-34) before starting Phase 1

```bash
# Create these files first:
lib/rendering/interfaces.ts
lib/rendering/pipeline-factory.ts
lib/rendering/data-format.ts
```

### 2. JavaScript Fallback (Phase 2) - Architecture Lines: 289-1022
```bash
# Implement JS version for fallback:
lib/rendering/js-fallback/js-meteor-system.ts
lib/rendering/js-fallback/js-particle-system.ts
lib/rendering/js-fallback/js-render-pipeline.ts
```

### 3. WASM Infrastructure (Phase 3-4) - Architecture Lines: 1023-1830
```bash
# Add to Rust codebase:
wasm/src/render_pipeline.rs
wasm/src/render_buffer.rs
wasm/src/particle_system.rs

# Update lib.rs to export RenderPipeline
```

### 4. TypeScript Integration (Phase 5) - Architecture Lines: 1831-2198
```bash
# Create integration layer:
lib/rendering/wasm-render-pipeline.ts
lib/rendering/typed-array-manager.ts
lib/rendering/unified-renderer.ts
```

### 5. Update Components (Phase 6) - Architecture Lines: 2199-2234
Replace multiple WASM calls in MeteorShower.tsx with single pipeline call.

### 6. Add Debug Tools (Phase 7-8) - Architecture Lines: 2235-2456
```bash
# Optional but recommended:
lib/rendering/performance-monitor.ts
lib/rendering/debug/pipeline-debug.ts
lib/rendering/debug/performance-overlay.ts
```

## Usage Example

```typescript
import { RenderPipelineFactory } from '@/lib/rendering/pipeline-factory'
import { UnifiedRenderer } from '@/lib/rendering/unified-renderer'

// Create pipeline (auto-selects WASM or JS)
const pipeline = await RenderPipelineFactory.create(canvas)
const renderer = new UnifiedRenderer(canvas)

// Animation loop
function animate() {
  // Single update call
  const dirtyFlags = pipeline.updateAll(deltaTime, speedMultiplier)
  
  // Get render data
  const renderData = pipeline.getRenderData()
  
  // Render only changed systems
  renderer.render(renderData)
  
  requestAnimationFrame(animate)
}
```

## Performance Monitoring

```typescript
import { PerformanceMonitor } from '@/lib/rendering/performance-monitor'
import { PerformanceOverlay } from '@/lib/rendering/debug/performance-overlay'

const monitor = new PerformanceMonitor(pipeline)
const overlay = new PerformanceOverlay(true, 'top-left')

// In render loop
const metrics = monitor.update()
overlay.render(ctx, metrics)

// Check if should downgrade quality
if (monitor.shouldDowngrade()) {
  // Reduce particle count or effects
}
```

## Testing

```bash
# Run unit tests
bun test tests/rendering/render-pipeline.test.ts

# Run benchmarks
bun test tests/rendering/render-pipeline.bench.ts

# Visual regression
bun test tests/rendering/visual-regression.test.ts
```

## Migration from Current Code

1. Replace direct MeteorSystem usage with RenderPipeline
2. Remove separate ParticlePool
3. Use single updateAll() instead of multiple update calls
4. Implement differential rendering based on dirty flags

## Performance Improvements

- **6x fewer WASM calls**: From 6+ to 1 per frame
- **Zero allocations**: Pre-allocated TypedArrays
- **50% less CPU**: Temporal coherence skips updates
- **Adaptive quality**: Maintains 60fps automatically

## Troubleshooting

### WASM fails to load
- Pipeline automatically falls back to JavaScript
- Check console for specific error
- Ensure wasm file is built and accessible

### Performance issues
- Enable performance overlay to see metrics
- Check if running in WASM or JS mode
- Use adaptive quality settings

### Visual differences between WASM/JS
- Run visual regression tests
- Ensure both implementations use same constants
- Check floating point precision differences