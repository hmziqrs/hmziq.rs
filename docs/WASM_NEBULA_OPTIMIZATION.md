# WASM LightNebula Optimization Plan

## Component: `components/effects/LightNebula.tsx`

## Current State: ⚠️ PARTIAL WASM INTEGRATION

The LightNebula component only uses WASM for spatial indexing (`getNebulaSpatialIndexing()`). A complete NebulaSystem exists in `wasm/src/nebula_system.rs` but most functionality remains in JavaScript.

## Priority Tasks for Full WASM Integration

### Task 1: Extend WASM Module Import
**Current**: Line 11
```typescript
import { getNebulaSpatialIndexing } from '@/lib/wasm/nebula-spatial'
```
**Add**:
```typescript
import { getOptimizedFunctions } from '@/lib/wasm'
```
**Implementation**: Add full WASM module loading with NebulaSystem access

### Task 2: Replace Cloud Initialization with NebulaSystem
**Current**: Lines 187-231 (cloud initialization in resizeCanvas)
**Replace with**:
```typescript
const nebulaSystem = new wasmModule.NebulaSystem(canvas.width, canvas.height)
nebulaSystem.init_particles(particlePool, cloudCount)
```
**WASM Implementation**: `wasm/src/nebula_system.rs:47-105`
**Benefits**: Optimized initialization, better memory layout

### Task 3: Move Orbital Motion Calculations to WASM
**Current**: Lines 384-386
```typescript
cloud.orbitAngle += cloud.orbitSpeed * animDeltaTime
cloud.x = cloud.orbitCenterX + Math.cos(cloud.orbitAngle) * cloud.orbitRadius
cloud.y = cloud.orbitCenterY + Math.sin(cloud.orbitAngle) * cloud.orbitRadius
```
**Replace with**: Batch orbital updates in WASM
```typescript
nebulaSystem.update_orbital_positions(orbitalCenters, animDeltaTime)
const positions = nebulaSystem.get_cloud_positions()
```
**Implementation**: Add orbital motion to nebula_system.rs update function

### Task 4: Optimize Opacity Pulsing and Morphing
**Current**: Lines 389-402 (opacity and shape morphing)
**Move to WASM**:
```typescript
// Current: individual calculations
cloud.opacityPhase += animDeltaTime * 2
const opacityPulse = Math.sin(cloud.opacityPhase + cloud.timeOffset) * 0.3 + 1

// After: batch processing in WASM
nebulaSystem.update_visual_effects(animDeltaTime, qualitySettings)
const visualData = nebulaSystem.get_visual_properties()
```
**Benefits**: ~40% faster with SIMD-friendly batch operations

### Task 5: Integrate Full NebulaSystem Update Loop
**Current**: Lines 367-404 (cloud update loop)
**Replace with**:
```typescript
nebulaSystem.update(animDeltaTime, particlePool)
const renderData = nebulaSystem.get_render_data()
```
**WASM Function**: `wasm/src/nebula_system.rs:108-167`
**Features**: Includes swirling motion, edge wrapping, all visual effects

### Task 6: Optimize Gradient Generation
**Current**: Lines 300-312 (gradient creation per cloud)
**Enhancement**: Pre-calculate gradient parameters in WASM
```typescript
const gradientParams = nebulaSystem.get_gradient_parameters(frameCount)
// Use packed gradient data for batch rendering
```
**Benefits**: Reduce repeated calculations, better cache usage

### Task 7: Extend Spatial Indexing Usage
**Current**: Lines 413, 426 (spatial indexing for overlaps)
**Enhance**: Use WASM for all spatial queries
```typescript
// Add visibility culling via spatial index
const visibleClouds = nebulaSystem.get_visible_clouds(viewport)
// Batch update only visible clouds
```
**Benefits**: Skip updates for off-screen clouds

### Task 8: Batch Transfer for Rendering
**Current**: Lines 281-319 (renderCloud function)
**Optimize**: Pack all cloud data for single transfer
```typescript
const packedClouds = wasmModule.TypedBatchTransfer.pack_nebula_particles(
    positions.x, positions.y,
    radii, innerRadii,
    opacities, pulsePhases,
    cloudCount
)
```
**WASM Function**: `wasm/src/batch_transfer.rs`

## Advanced Optimizations

### Task 9: Color Interpolation in WASM
**Current**: COLOR_PALETTES (Lines 53-74)
**Enhancement**: Dynamic color blending in WASM
- Smooth color transitions between palettes
- Time-based color evolution
- Reduced memory for color data

### Task 10: Multi-threaded Particle Updates
**Future Enhancement**: Use SharedArrayBuffer for parallel updates
- Split clouds across workers
- Parallel swirl force calculations
- Requires cross-origin isolation

## Implementation Priority

1. **Phase 1** (Immediate Impact):
   - Tasks 1-2: Module setup and system initialization
   - Task 5: Core update loop integration
   
2. **Phase 2** (Visual Enhancement):
   - Tasks 3-4: Motion and effect calculations
   - Task 6: Gradient optimization
   
3. **Phase 3** (Performance Polish):
   - Tasks 7-9: Advanced optimizations

## Expected Performance Improvements

- **Update Loop**: 45% faster with batch processing
- **Trigonometry**: 35% improvement using lookup tables
- **Memory Usage**: 25% reduction
- **Overall Frame Time**: 30-40% improvement

## Integration Considerations

1. **Gradual Migration**: Can integrate one system at a time
2. **Visual Parity**: Ensure swirl effects match exactly
3. **Quality Tiers**: Maintain performance/balanced/ultra modes
4. **Spatial Index**: Keep existing optimization, extend usage

## Testing Checklist

- [ ] Cloud motion matches original orbital patterns
- [ ] Opacity pulsing maintains smooth animation
- [ ] Color palettes render identically
- [ ] Overlap effects work correctly
- [ ] Performance scales with quality settings
- [ ] No visual artifacts at canvas edges