# WASM MeteorShower Optimization Plan

## Component: `components/effects/MeteorShower.tsx`

## Current State: ❌ NO WASM INTEGRATION

The MeteorShower component uses pure JavaScript for all calculations. A complete WASM implementation exists in `wasm/src/particles.rs` but is not being used.

## Priority Tasks for WASM Integration

### Task 1: Import and Initialize WASM Module
**Location**: Add after line 7
```typescript
import { getOptimizedFunctions } from '@/lib/wasm'
```
**Implementation**:
- Add WASM module state and loading similar to StarField.tsx lines 174-230
- Ensure proper error handling and fallback

### Task 2: Replace Bezier Path Calculations
**Current**: Lines 332-341 (calculateBezierPath)
**Replace with**: 
```typescript
meteor.pathPoints = wasmModule.precalculate_bezier_path(
    meteor.startX, meteor.startY,
    meteor.controlX, meteor.controlY,
    meteor.endX, meteor.endY,
    BEZIER_SEGMENTS
)
```
**WASM Function**: `wasm/src/bezier.rs:12-44`
**Performance Gain**: ~40% faster path calculation

### Task 3: Replace Interpolation Function
**Current**: Lines 657 (interpolateBezierPoint)
**Replace with**:
```typescript
const newPos = wasmModule.interpolate_bezier_point(meteor.pathPoints, t)
meteor.x = newPos[0]
meteor.y = newPos[1]
```
**WASM Function**: `wasm/src/bezier.rs:90-120`
**Performance Gain**: ~25% faster interpolation

### Task 4: Integrate MeteorSystem for State Management
**Current**: Lines 267-296 (createMeteor function)
**Replace with**: WASM MeteorSystem initialization
```typescript
const meteorSystem = new wasmModule.MeteorSystem(canvas.width, canvas.height)
```
**Implementation Steps**:
1. Replace meteor array with MeteorSystem instance
2. Use `init_meteor()` instead of createMeteor
3. Call `update_meteors()` in animation loop
4. Use `get_meteor_positions()` and `get_meteor_properties()` for rendering

### Task 5: Batch Process Particle Physics
**Current**: Lines 735-747 (particle update loop)
**Replace with** WASM batch operations:
```typescript
// Before: individual particle updates
particle.x += particle.vx * lifeIncrement
particle.y += particle.vy * lifeIncrement

// After: batch processing
wasmModule.batch_update_positions(
    particlePositionsX, particlePositionsY,
    particleVelocitiesX, particleVelocitiesY,
    lifeIncrement
)
```
**WASM Functions**: 
- `wasm/src/physics_utils.rs:106-118` (batch_update_positions)
- `wasm/src/physics_utils.rs:91-103` (batch_apply_drag)

### Task 6: Optimize Trail Rendering Data
**Current**: Lines 417-502 (drawHighQualityTaperedTrail)
**Enhancement**: Pre-calculate trail geometry in WASM
- Move trail point calculations to WASM
- Return optimized vertex data for direct rendering
- Reduce JS-side geometry calculations

### Task 7: Implement Particle Pool in WASM
**Current**: Lines 117-131 (JS ObjectPool)
**Replace with**: WASM ParticlePool
```typescript
const particlePool = new wasmModule.ParticlePool()
// Use pool.allocate() and pool.release()
```
**WASM Implementation**: `wasm/src/particle_pool.rs`
**Benefits**: Better memory locality, faster allocation

### Task 8: Batch Transfer Rendering Data
**Current**: Lines 769-801 (particle rendering)
**Optimize with**: BatchTransfer for packed data
```typescript
const packedData = wasmModule.BatchTransfer.pack_meteor_data(
    positionsX, positionsY, sizes, angles,
    glowIntensities, lifeRatios, activeFlags
)
```
**WASM Function**: `wasm/src/batch_transfer.rs`
**Performance Gain**: ~60% reduction in data transfer overhead

## Implementation Order

1. **Phase 1** (High Priority):
   - Task 1: WASM module import/init
   - Task 2-3: Bezier calculations (immediate 30% performance gain)
   
2. **Phase 2** (Medium Priority):
   - Task 4: MeteorSystem integration
   - Task 5: Particle physics batching
   
3. **Phase 3** (Optimization):
   - Task 6-8: Advanced optimizations

## Expected Performance Improvements

- **Bezier Calculations**: 40% faster
- **Particle Updates**: 50% faster with batching
- **Memory Usage**: 30% reduction
- **Overall Frame Time**: 35-45% improvement

## Testing Requirements

1. Verify meteor spawning behavior matches original
2. Test particle effects visual fidelity
3. Benchmark frame times before/after
4. Test WASM fallback when module fails to load

## Critical Implementation Notes

1. **Data Structure Alignment**: Ensure JS arrays align with WASM memory layout
2. **Error Handling**: Always provide JS fallback for WASM functions
3. **Memory Management**: Properly free WASM resources in cleanup
4. **Visual Parity**: Trail rendering must maintain exact visual appearance