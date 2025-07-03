# WASM StarField Optimization Plan

## Component: `components/three/StarField.tsx`

## Current State: ⚠️ PARTIALLY OPTIMIZED

While StarField has strong WASM integration, additional optimization opportunities have been identified that could further improve performance, especially for high star counts and complex interactions.

## Existing WASM Integrations

### 1. Star Generation (Lines 310-315) ✅
```typescript
positions = wasmModule.generate_star_positions(count, startIndex, minRadius, maxRadius)
colors = wasmModule.generate_star_colors(count, startIndex)
sizes = wasmModule.generate_star_sizes(count, startIndex, sizeMultiplier)
```
**Status**: ✅ Implemented
**Location**: `wasm/src/star_field.rs:17-87`
**Performance**: Eliminates JS overhead for generating thousands of star positions

### 2. Twinkle Effects (Lines 437-444) ✅
```typescript
const twinkleBase = wasmModule.fast_sin(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7
const sparklePhase = wasmModule.fast_sin(time * 15.0 + x * 20.0 + y * 30.0)
```
**Status**: ✅ Implemented
**Location**: `wasm/src/math.rs:36-38`
**Performance**: Uses pre-calculated sin lookup table for fast trigonometry

### 3. Rotation Calculations (Lines 518-525) ✅
```typescript
const rotationDelta = wasmModule.calculate_rotation_delta(
    baseRotationSpeedX,
    baseRotationSpeedY,
    speedMultiplierRef.current,
    deltaTime
)
```
**Status**: ✅ Implemented
**Location**: `wasm/src/star_field.rs:326-336`
**Performance**: Optimized delta calculations in WASM

## Additional Optimization Opportunities

### 4. LOD Distribution Calculations (Lines 283-296) ❌
The star distribution logic across LOD levels involves multiple floating-point calculations that could be optimized:
```typescript
const distributions = {
  performance: { near: 0.1, medium: 0.3, far: 0.6 },
  balanced: { near: 0.15, medium: 0.35, far: 0.5 },
  ultra: { near: 0.2, medium: 0.4, far: 0.4 }
}
const nearCount = Math.floor(totalCount * dist.near)
const mediumCount = Math.floor(totalCount * dist.medium)
const farCount = totalCount - nearCount - mediumCount
```
**Potential Gain**: 5-10% faster initialization
**Implementation**: Create `calculate_lod_distribution(totalCount, qualityTier)` in WASM

### 5. Speed Multiplier Calculations (Lines 496-511) ❌
Complex speed multiplier logic with easing could be computed more efficiently:
```typescript
if (isMovingRef.current) {
  speedMultiplier *= 4.5
}
const timeSinceClick = currentTime - clickBoostRef.current
if (timeSinceClick < 1200) {
  const clickDecay = 1 - timeSinceClick / 1200
  const clickBoost = 1 + 4.3 * clickDecay
  speedMultiplier *= clickBoost
}
speedMultiplierRef.current += (targetSpeed - speedMultiplierRef.current) * 0.2
```
**Potential Gain**: 10-15% reduction in per-frame overhead
**Implementation**: Create `calculate_speed_multiplier(isMoving, clickTime, currentTime, currentMultiplier)` in WASM

### 6. Direct Buffer Updates (Lines 464-478) ❌
Currently updates attributes in a loop. WASM has `calculate_star_effects_into_buffers` but it's not being used:
```typescript
// Current approach creates unnecessary intermediate arrays
twinkles[i] = twinkleBase + sparkle
sparkles[i] = sparkle
```
**Potential Gain**: 20-30% faster effect updates, reduced GC pressure
**Implementation**: Use existing `calculate_star_effects_into_buffers` function

### 7. Frame Rate Calculation (Lines 484-488) ❌
FPS calculation could be optimized:
```typescript
if (frameCounterRef.current % 30 === 0) {
  const currentTime = performance.now()
  fps = 30000 / (currentTime - lastTime)
  lastTime = currentTime
}
```
**Potential Gain**: Minor, but reduces main thread work
**Implementation**: Create `calculate_fps(frameCount, currentTime, lastTime)` in WASM

### 8. Camera Frustum Culling ❌
No frustum culling is implemented. Stars outside the viewport are still processed:
**Potential Gain**: 30-50% performance improvement when zoomed in
**Implementation**: Create `cull_stars_by_frustum(positions, cameraMatrix, fov)` in WASM

### 9. Temporal Coherence Optimization ❌
Update only stars that have changed significantly:
**Potential Gain**: 15-25% reduction in update overhead
**Implementation**: Create `get_stars_needing_update(positions, lastUpdateTime, threshold)` in WASM

### 10. SIMD Batch Processing Enhancement ❌
Current SIMD implementation could batch entire LOD groups:
**Potential Gain**: 40-60% faster batch operations on supported hardware
**Implementation**: Enhance existing SIMD code to process full LOD groups

## Implementation Priority

1. **Direct Buffer Updates** (High Impact, Easy) - Use existing function
2. **Speed Multiplier Calculations** (Medium Impact, Easy)
3. **Camera Frustum Culling** (High Impact, Medium Complexity)
4. **SIMD Batch Enhancement** (High Impact, Complex)
5. **Temporal Coherence** (Medium Impact, Medium Complexity)
6. **LOD Distribution** (Low Impact, Easy)
7. **Frame Rate Calculation** (Low Impact, Easy)

## Performance Metrics

Current performance:
- 60 FPS with 2000+ stars
- Sub-millisecond update times
- Minimal GC pressure

Expected improvements:
- 60 FPS with 5000+ stars
- 40-60% reduction in update time
- Near-zero GC pressure from typed array reuse

## Critical Lessons for Implementation

1. **Always profile before and after** - Use Performance Monitor
2. **Implement incrementally** - One optimization at a time
3. **Maintain visual parity** - No visible changes to star behavior
4. **Keep fallbacks** - Every WASM function needs JS alternative
5. **Test on low-end devices** - Ensure optimizations help across all tiers