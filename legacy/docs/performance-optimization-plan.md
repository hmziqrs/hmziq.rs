# Canvas Performance Optimization Plan

## Overview

This document outlines the performance optimization strategy for the three main canvas components in the hmziq.rs project. Based on comprehensive analysis, implementing these optimizations can achieve approximately 50-60% performance improvement.

## Core Principles

1. **Progressive Enhancement**: Start with maximum performance, add quality incrementally
2. **Measurable Quality**: Define concrete metrics for visual fidelity
3. **Adaptive Performance**: Adjust quality based on real-time performance
4. **User Choice**: Allow configuration of quality/performance trade-offs

## Performance Analysis Summary

### 1. **SimpleStarField (Three.js) - Highest Impact**

**Current Performance Issues:**

- Complex shader calculations running on 600+ stars
- Sparkle effect using expensive trigonometric functions
- Spike/ray calculations for every star every frame
- No LOD (Level of Detail) system
- All stars rendered regardless of visibility

**Memory Impact:** ~5-10MB GPU memory
**CPU Impact:** Moderate (shader compilation)
**GPU Impact:** High (fragment shader complexity)

**CRITICAL VISUAL REQUIREMENTS:**

- **Round Star Cores**: Must maintain circular appearance - NO square artifacts
- **Smooth Glow**: Radial gradients must be preserved for authentic star glow
- **Natural Sparkle**: Twinkling effects should remain organic, not mechanical
- **Proper Blending**: Additive blending for realistic light emission

### 2. **MeteorShower2D - Medium Impact**

**Current Performance Issues:**

- Bezier curve calculations every frame for each meteor
- Creating new gradient objects repeatedly (no caching)
- Complex particle system with up to 30 particles per meteor
- Multiple gradient layers per particle (3 gradients each)
- Trail rendering using quadratic curves

**Memory Impact:** ~2-3MB (particle arrays)
**CPU Impact:** High (Bezier calculations, gradient creation)
**GPU Impact:** Moderate (multiple blend operations)

**CRITICAL VISUAL REQUIREMENTS:**

- **Tapered Trails**: Must maintain authentic meteor trail tapering (thick at head, thin at tail)
- **Smooth Curves**: Bezier paths must remain smooth - no straight line approximations
- **Natural Fade**: Gradual opacity fade from head to tail must be preserved
- **No Single-Stroke Trails**: Avoid uniform-width stroke rendering

### 3. **LightNebula2D - Lower Impact**

**Current Performance Issues:**

- Creating radial gradients every frame (line 279)
- Overlap glow calculations O(n²) complexity
- Already frame-limited to 30 FPS but still creating gradients
- Continuous shape morphing calculations

**Memory Impact:** ~1MB
**CPU Impact:** Moderate (gradient creation)
**GPU Impact:** Low (simple blending)

## Quality Tier System

### Implementation Strategy

```javascript
class QualityManager {
  constructor() {
    this.tier = this.detectOptimalTier()
    this.metrics = { fps: 60, frameTime: 0, quality: 1.0 }
  }

  detectOptimalTier() {
    const gpu = this.detectGPU()
    const memory = navigator.deviceMemory || 4
    const cores = navigator.hardwareConcurrency || 4

    if (gpu.tier === 'low' || memory < 4 || cores < 4) return 'performance'
    if (gpu.tier === 'high' && memory >= 8) return 'ultra'
    return 'balanced'
  }

  adjustQualityDynamically() {
    if (this.metrics.fps < 30) this.decreaseTier()
    if (this.metrics.fps > 58 && this.metrics.frameTime < 12) this.increaseTier()
  }
}
```

### Quality Tiers

#### Tier 1: Performance (Mobile/Low-end)

- **Stars**: Simple dots with basic glow
- **Meteors**: 5-10 count, simplified trails
- **Target**: 60 FPS on all devices

#### Tier 2: Balanced (Default)

- **Stars**: Circular glow + occasional sparkle
- **Meteors**: 10-20 count, tapered trails
- **Target**: 60 FPS on mid-range devices

#### Tier 3: Ultra (High-end)

- **Stars**: Full effects, complex shaders
- **Meteors**: 20-30 count, full particle systems
- **Target**: 60 FPS on powerful devices

## Visual Quality Preservation Guidelines

### SimpleStarField Visual Requirements:

1. **Star Shape Integrity**:
   - Stars MUST remain circular - use proper distance calculations
   - Avoid box/square artifacts from optimization shortcuts
   - Maintain smooth radial falloff: `smoothstep(0.8, 1.0, distance)`
2. **Glow Quality**:
   - Preserve multi-layer glow effects
   - Use proper alpha blending
   - Maintain additive blending mode for light emission
3. **Sparkle Authenticity**:
   - Keep organic twinkling patterns
   - Avoid mechanical/repetitive animations
   - Preserve star color variations
4. **Shader Optimizations**:
   - Simplify math but maintain visual output
   - Use approximations that preserve circular shapes
   - Test on various star sizes to ensure consistency

### MeteorShower2D Visual Requirements:

1. **Tapered Trails**:

   - Trails MUST taper from thick (at head) to thin (at tail)
   - Use polygon/shape rendering, NOT uniform stroke width
   - Exponential taper function: `width = maxWidth * Math.pow(1 - progress, 2.5)`

2. **Smooth Motion**:

   - Maintain smooth Bezier curve paths
   - No straight-line approximations
   - High-resolution path interpolation (100+ points)

3. **Natural Fade**:

   - Multi-stop gradients for realistic fade
   - Opacity varies along trail length
   - Preserve glow effects at meteor head

4. **Performance vs Quality**:
   - Cache gradients but maintain variety
   - Pre-calculate paths but keep smooth interpolation
   - Optimize rendering without sacrificing visual authenticity

## Optimization Strategy

## Practical Implementation Examples

### Star Field Optimization (Maintains Circular Shape)

```javascript
// Performance Tier
const renderSimpleStar = (x, y, size) => {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(x - size * 2, y - size * 2, size * 4, size * 4)
}

// Balanced Tier - Cached gradients + circular mask
const renderBalancedStar = (x, y, size, cache) => {
  const gradient = cache.get(`star_${Math.round(size * 10)}`)
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, size * 2, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = gradient
  ctx.fillRect(x - size * 2, y - size * 2, size * 4, size * 4)
  ctx.restore()
}

// Ultra Tier - Full shader effects
const starShaderUltra = `
  float dist = length(vUv - vec2(0.5));
  float star = 1.0 - smoothstep(0.0, 0.5, dist);
  float glow = exp(-dist * 5.0);
  float sparkle = sin(time * 15.0 + starId) > 0.98 ? 2.0 : 1.0;
  gl_FragColor = vec4(color * (star + glow) * sparkle, star + glow * 0.5);
`
```

### Meteor Trail Implementation (Tapered Without Complexity)

```javascript
// Smart Tapered Trail - Balances quality and performance
const drawOptimizedTaperedTrail = (trail, meteor, ctx) => {
  // Use fewer segments for distant/small meteors
  const quality = meteor.size > 0.5 ? 'high' : 'low'
  const segments = quality === 'high' ? trail.length : Math.floor(trail.length / 3)

  // Pre-calculate widths to avoid repeated calculations
  const widths = new Float32Array(segments)
  for (let i = 0; i < segments; i++) {
    const progress = i / segments
    widths[i] = meteor.size * 4 * Math.pow(1 - progress, 2)
  }

  // Draw using optimal technique for quality tier
  if (quality === 'high') {
    drawPolygonTrail(trail, widths, ctx)
  } else {
    drawSegmentedTrail(trail, widths, ctx)
  }
}
```

### Phase 1: Quick Wins (1-2 days) - 20-25% improvement

#### 1.1 Gradient Caching System

```javascript
// Create a gradient cache for frequently used gradients
const gradientCache = new Map<string, CanvasGradient>()

function getCachedGradient(ctx: CanvasRenderingContext2D, key: string, createFn: () => CanvasGradient) {
  if (!gradientCache.has(key)) {
    gradientCache.set(key, createFn())
  }
  return gradientCache.get(key)!
}
```

**Implementation locations:**

- LightNebula2D: Line 279 (cloud gradients)
- LightNebula2D: Line 387 (overlap gradients)
- MeteorShower2D: Line 398 (trail gradients)
- MeteorShower2D: Lines 455, 486, 517 (particle gradients)

#### 1.2 Pre-calculate Bezier Paths (Visual Quality Preserved)

```javascript
// Calculate Bezier points once at spawn with high resolution
meteor.pathPoints = calculateBezierPath(
  meteor.startX,
  meteor.startY,
  controlX,
  controlY,
  meteor.endX,
  meteor.endY,
  100
)
meteor.currentPathIndex = 0

// In animation loop, use smooth interpolation between points
const t = meteor.life / meteor.maxLife
const index = Math.floor(t * (meteor.pathPoints.length - 1))
const localT = (t * (meteor.pathPoints.length - 1)) % 1

// Smooth interpolation between points
meteor.x =
  meteor.pathPoints[index].x +
  (meteor.pathPoints[index + 1].x - meteor.pathPoints[index].x) * localT
meteor.y =
  meteor.pathPoints[index].y +
  (meteor.pathPoints[index + 1].y - meteor.pathPoints[index].y) * localT
```

#### 1.3 Trail Rendering Optimization (Maintaining Tapered Effect)

```javascript
// IMPORTANT: Preserve visual quality with tapered trail
// Draw trail as filled polygon shape, NOT single stroke
const trailShape = buildTaperedTrailShape(meteor.trail, meteor.size)

// Use cached gradient for trail fill
const gradient = getCachedLinearGradient(
  `trail_${meteor.type}`,
  meteor.trail[0],
  meteor.trail[meteor.trail.length - 1],
  fadeStops
)

ctx.fill(trailShape, gradient)
```

#### 1.4 Simplify Star Shader Calculations (Preserving Circular Shape)

```glsl
// CRITICAL: Maintain circular distance calculation
float dist = length(vUv - vec2(0.5)); // DO NOT use Manhattan distance

// Ensure smooth circular falloff
float circle = 1.0 - smoothstep(0.0, 0.5, dist);
float glow = exp(-dist * 5.0); // Exponential falloff for natural glow

// Simplified but organic sparkle
float sparkle = step(0.98, sin(time * 15.0 + starSeed * 20.0)) * 3.0;

// IMPORTANT: Use proper alpha blending for round appearance
gl_FragColor = vec4(starColor * (circle + glow), circle + glow * 0.5);
```

### Phase 2: Algorithmic Improvements (2-3 days) - 15-20% improvement

#### 2.1 Object Pooling for Particles

```javascript
class ParticlePool {
  private pool: Particle[] = []
  private active: Particle[] = []

  acquire(): Particle {
    return this.pool.pop() || this.createParticle()
  }

  release(particle: Particle): void {
    this.active = this.active.filter(p => p !== particle)
    this.pool.push(particle)
  }
}
```

#### 2.2 Spatial Partitioning for Overlap Detection

```javascript
// Use grid-based spatial partitioning
const grid = new SpatialGrid(canvas.width, canvas.height, 100) // 100px cells

// Only check overlaps within same or adjacent cells
clouds.forEach((cloud) => {
  const nearbyClounds = grid.getNearby(cloud.x, cloud.y, cloud.radius)
  // Check overlaps only with nearby clouds
})
```

#### 2.3 LOD System for Stars

```javascript
// Render distant stars as simple points
if (distanceFromCamera > 100) {
  // Simple point rendering
} else if (distanceFromCamera > 50) {
  // Reduced quality shader
} else {
  // Full quality with sparkles
}
```

### Phase 3: Rendering Optimizations (3-4 days) - 10-15% improvement

#### 3.1 Batch Rendering

```javascript
// Batch similar operations
ctx.save()
ctx.globalCompositeOperation = 'screen'

// Draw all meteors in one batch
meteors.forEach((meteor) => {
  // Just path operations, no state changes
})

ctx.restore()
```

#### 3.2 Off-screen Canvas for Static Elements

```javascript
// Pre-render static or slowly changing elements
const offscreenCanvas = document.createElement('canvas')
const offscreenCtx = offscreenCanvas.getContext('2d')

// Render nebula clouds to offscreen canvas
// Only update when needed
if (nebulaUpdateNeeded) {
  renderNebulaToOffscreen(offscreenCtx)
}

// In main loop, just draw the offscreen canvas
ctx.drawImage(offscreenCanvas, 0, 0)
```

#### 3.3 RequestAnimationFrame Optimization

```javascript
// Use time-based updates instead of frame-based
let lastUpdate = 0
const targetFPS = 60
const frameTime = 1000 / targetFPS

function animate(currentTime: number) {
  const deltaTime = currentTime - lastUpdate

  if (deltaTime >= frameTime) {
    // Update and render
    lastUpdate = currentTime - (deltaTime % frameTime)
  }

  requestAnimationFrame(animate)
}
```

### Phase 4: Advanced Optimizations (Optional, 1 week) - Additional 5-10%

#### 4.1 WebGL Acceleration for 2D Effects

- Convert MeteorShower2D to use WebGL
- Use GPU for particle physics calculations
- Implement instanced rendering for particles

#### 4.2 Web Workers for Physics

```javascript
// Move physics calculations to Web Worker
const physicsWorker = new Worker('physics-worker.js')

physicsWorker.postMessage({
  meteors: meteorsData,
  deltaTime: dt,
})

physicsWorker.onmessage = (e) => {
  updateMeteorPositions(e.data.meteors)
}
```

#### 4.3 Dynamic Quality Adjustment

```javascript
// Monitor performance and adjust quality
let averageFPS = 60
let qualityLevel = 1.0

function adjustQuality() {
  if (averageFPS < 30) {
    qualityLevel = Math.max(0.5, qualityLevel - 0.1)
  } else if (averageFPS > 55) {
    qualityLevel = Math.min(1.0, qualityLevel + 0.05)
  }
}
```

## Implementation Priority

1. **Gradient Caching** - Biggest bang for buck, easy to implement
2. **Bezier Pre-calculation** - Significant CPU savings
3. **Shader Simplification** - Major GPU improvement
4. **Particle Pooling** - Reduces GC pressure
5. **Batch Rendering** - Reduces draw calls
6. **LOD System** - Scales with complexity

## Measurement & Testing Strategy

### Visual Quality Metrics

```javascript
class VisualQualityTester {
  // Measure star circularity
  measureStarRoundness(canvas) {
    const imageData = ctx.getImageData(starX - 10, starY - 10, 20, 20)
    const circularityScore = this.calculateCircularity(imageData)
    return circularityScore > 0.85 // 85% circular = pass
  }

  // Measure trail smoothness
  measureTrailSmoothness(trailPoints) {
    const angles = []
    for (let i = 1; i < trailPoints.length - 1; i++) {
      const angle = this.getAngle(trailPoints[i - 1], trailPoints[i], trailPoints[i + 1])
      angles.push(angle)
    }
    const variance = this.calculateVariance(angles)
    return variance < 0.1 // Low variance = smooth
  }

  // FPS consistency check
  measureFPSStability(samples) {
    const mean = samples.reduce((a, b) => a + b) / samples.length
    const stdDev = Math.sqrt(
      samples.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / samples.length
    )
    return stdDev / mean < 0.1 // Less than 10% variation
  }
}
```

### Performance Metrics to Track:

- Frame rate (target: stable 60 FPS, ±5%)
- Frame time (target: <16.67ms, 99th percentile)
- Memory usage (heap and GPU)
- Draw call count
- Canvas state changes
- Visual quality score (0-100)

### Testing Tools:

- Chrome DevTools Performance Profiler
- Firefox Performance Tools
- Stats.js for real-time FPS monitoring
- Memory profiler for leak detection
- Custom visual quality analyzer
- Automated screenshot comparison

### Test Scenarios:

1. **Performance Tests**:

   - Idle state (no interactions)
   - Continuous mouse movement
   - Rapid clicking
   - Page scrolling
   - Extended runtime (memory leaks)
   - Different screen sizes
   - Multiple browser tabs

2. **Visual Quality Tests**:
   - Star shape integrity (circularity test)
   - Trail smoothness (angle variance)
   - Gradient quality (banding detection)
   - Animation fluidity (frame consistency)
   - Color accuracy (RGB deviation)

## Common Pitfalls to Avoid (MeteorShower2D)

### ❌ DO NOT:

1. **Use single stroke for trails** - This creates uniform width that looks unnatural

   ```javascript
   // BAD: Single stroke with constant width
   ctx.lineWidth = meteor.size * 3
   ctx.stroke()
   ```

2. **Simplify to straight lines** - Destroys the smooth meteor motion

   ```javascript
   // BAD: Linear interpolation only
   for (let i = 0; i < trail.length; i += step) {
     ctx.lineTo(trail[i].x, trail[i].y)
   }
   ```

3. **Remove gradient variety** - Makes all meteors look identical
   ```javascript
   // BAD: One gradient for all meteors
   const globalGradient = createGradient()
   ```

### ✅ DO:

1. **Build tapered shapes** - Create authentic trail geometry
2. **Maintain curve smoothness** - Use proper interpolation
3. **Cache intelligently** - Cache by type/size, not globally
4. **Test visual quality** - Always compare before/after

## Expected Results

### Before Optimization:

- FPS: 35-45 (drops to 25 during interactions)
- Frame time: 22-28ms
- Memory: 15-20MB
- Draw calls: 200+

### After Optimization:

- FPS: 55-60 (stable during interactions)
- Frame time: 14-18ms
- Memory: 10-15MB
- Draw calls: 50-80

## Rollback Strategy

Each optimization should be:

1. Implemented behind a feature flag
2. Thoroughly tested in isolation
3. A/B tested with real users
4. Monitored for regressions

```javascript
const FEATURES = {
  gradientCaching: true,
  bezierOptimization: true,
  simplifiedShaders: false, // Roll out gradually
  particlePooling: true,
  // ... etc
}
```

## Implementation Roadmap

### Week 1: Foundation

1. Implement quality tier system
2. Add performance monitoring
3. Create visual quality tests
4. Set up A/B testing framework

### Week 2: Core Optimizations

1. Gradient caching (all components)
2. Bezier path pre-calculation
3. Star shader optimization (per tier)
4. Object pooling for particles

### Week 3: Visual Refinement

1. Implement tapered trails (per tier)
2. Ensure star circularity
3. Fine-tune quality transitions
4. Performance profiling

### Week 4: Polish & Deploy

1. Dynamic quality adjustment
2. User preference settings
3. Performance documentation
4. Production deployment

## Key Success Factors

1. **Flexibility Over Rigidity**: The tiered approach allows aggressive optimization where needed while preserving quality where it matters

2. **Measurable Quality**: Concrete metrics ensure we maintain visual fidelity objectively, not subjectively

3. **Progressive Enhancement**: Starting with performance and adding quality ensures a good baseline experience

4. **User Control**: Allowing users to choose their preference respects different needs and hardware

## Conclusion

This enhanced optimization plan balances performance gains with visual quality through:

- **Tiered quality system** adapting to device capabilities
- **Practical implementations** showing exactly how to optimize
- **Measurable metrics** for both performance and visual quality
- **Flexible approach** allowing trade-offs when necessary

Expected outcomes:

- **Performance tier**: 90+ FPS on all devices (simplified visuals)
- **Balanced tier**: 60 FPS on mid-range devices (good visuals)
- **Ultra tier**: 60 FPS on high-end devices (maximum quality)

The plan now provides a pragmatic path to achieving 50-60% performance improvement while maintaining visual quality where it counts most.
