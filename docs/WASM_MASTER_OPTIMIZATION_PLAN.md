# WASM Master Optimization Plan

## Overview

This master plan coordinates WASM optimization across all visual components in the hmziq.rs project. Each component has a detailed optimization plan with line-by-line implementation instructions.

## Component Status Summary

| Component | WASM Status | Priority | Plan Document |
|-----------|-------------|----------|---------------|
| StarField | ⚠️ Partial | MEDIUM | [WASM_STARFIELD_OPTIMIZATION.md](./WASM_STARFIELD_OPTIMIZATION.md) |
| MeteorShower | ❌ None | HIGH | [WASM_METEOR_OPTIMIZATION.md](./WASM_METEOR_OPTIMIZATION.md) |
| LightNebula | ⚠️ Partial | MEDIUM | [WASM_NEBULA_OPTIMIZATION.md](./WASM_NEBULA_OPTIMIZATION.md) |

## Implementation Priority Order

### Phase 1: MeteorShower Integration (Highest Impact)
**File**: `components/effects/MeteorShower.tsx`
**Tasks**: 
1. WASM module import (Line 7) - [Details](./WASM_METEOR_OPTIMIZATION.md#task-1-import-and-initialize-wasm-module)
2. Bezier calculations (Lines 332-341, 657) - [Details](./WASM_METEOR_OPTIMIZATION.md#task-2-replace-bezier-path-calculations)
3. Particle physics batching (Lines 735-747) - [Details](./WASM_METEOR_OPTIMIZATION.md#task-5-batch-process-particle-physics)

**Expected Gain**: 35-45% performance improvement

### Phase 2: LightNebula Full Integration
**File**: `components/effects/LightNebula.tsx`
**Tasks**:
1. Extend WASM imports (Line 11) - [Details](./WASM_NEBULA_OPTIMIZATION.md#task-1-extend-wasm-module-import)
2. NebulaSystem integration (Lines 187-231) - [Details](./WASM_NEBULA_OPTIMIZATION.md#task-2-replace-cloud-initialization-with-nebulasystem)
3. Orbital motion batching (Lines 384-386) - [Details](./WASM_NEBULA_OPTIMIZATION.md#task-3-move-orbital-motion-calculations-to-wasm)

**Expected Gain**: 30-40% performance improvement

### Phase 3: StarField Advanced Optimizations
**File**: `components/three/StarField.tsx`
**Tasks**:
1. Direct buffer updates (Lines 424-478) - [Details](./WASM_STARFIELD_OPTIMIZATION.md#6-direct-buffer-updates-lines-464-478-)
2. Speed multiplier calculations (Lines 496-511) - [Details](./WASM_STARFIELD_OPTIMIZATION.md#5-speed-multiplier-calculations-lines-496-511-)
3. Camera frustum culling - [Details](./WASM_STARFIELD_OPTIMIZATION.md#8-camera-frustum-culling-)

**Expected Gain**: 30-50% performance improvement for high star counts

### Phase 4: System-wide Advanced Optimizations
1. MeteorSystem full state management
2. Batch transfer optimizations
3. Multi-threaded particle updates (future)
4. Shared memory pools across components

## Key WASM Implementations to Integrate

### From `wasm/src/particles.rs`:
- **MeteorSystem** (Lines 139-467): Complete meteor lifecycle management
- **Meteor struct** (Lines 59-136): Optimized data structure
- **Particle management** (Lines 26-56): Efficient particle pool

### From `wasm/src/nebula_system.rs`:
- **NebulaSystem** (Lines 11-210): Full nebula particle system
- **Swirl physics** (Lines 116-133): Vortex force calculations
- **Visual effects** (Lines 169-179): Pulsing and opacity

### From `wasm/src/physics_utils.rs`:
- **batch_apply_gravity** (Lines 80-88): Batch gravity updates
- **batch_apply_drag** (Lines 91-103): Batch drag calculations
- **batch_update_positions** (Lines 106-118): Batch position updates

### From `wasm/src/bezier.rs`:
- **precalculate_bezier_path** (Lines 12-44): Quadratic bezier
- **interpolate_bezier_point** (Lines 90-120): Path interpolation
- **batch_interpolate_meteor_positions** (special for meteors)

## Implementation Guidelines

### For AI Agents:

1. **Always maintain visual parity** - The rendered output must look identical
2. **Implement with fallback** - Every WASM function needs a JS fallback
3. **Test incrementally** - Implement one task, test, then proceed
4. **Profile performance** - Measure before/after each optimization
5. **Handle errors gracefully** - WASM loading can fail

### Code Pattern to Follow:

```typescript
// 1. Import WASM module
const [wasmModule, setWasmModule] = useState<any>(null)

// 2. Load with fallback
useEffect(() => {
  getOptimizedFunctions().then(module => {
    setWasmModule(module)
  }).catch(err => {
    console.warn('WASM failed, using JS fallback:', err)
  })
}, [])

// 3. Use with conditional
if (wasmModule && wasmModule.function_name) {
  // WASM path
  result = wasmModule.function_name(params)
} else {
  // JS fallback
  result = jsFallbackFunction(params)
}
```

## Success Metrics

1. **Performance**:
   - 60 FPS maintained at all quality tiers
   - 35%+ reduction in frame times
   - 30%+ reduction in memory usage

2. **Visual Quality**:
   - Pixel-perfect matching with original
   - No visual artifacts or glitches
   - Smooth animations maintained

3. **Code Quality**:
   - Clean separation of WASM/JS code
   - Comprehensive error handling
   - Well-documented integration points

## Next Steps After Implementation

1. Remove old `WASM_OPTIMIZATION_PLAN.md` file
2. Update performance benchmarks
3. Document actual performance gains
4. Consider additional components for optimization

## Resources

- WASM source: `/wasm/src/`
- Build command: `bun run build:wasm`
- Type definitions: `/public/wasm/pkg/hmziq_wasm.d.ts`
- Integration helper: `/lib/wasm/index.ts`