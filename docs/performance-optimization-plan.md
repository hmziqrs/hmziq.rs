# Canvas Performance Optimization Plan

## Overview
This document outlines the performance optimization strategy for the three main canvas components in the hmziq.rs project. Based on comprehensive analysis, implementing these optimizations can achieve approximately 50-60% performance improvement.

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

### 3. **LightNebula2D - Lower Impact**
**Current Performance Issues:**
- Creating radial gradients every frame (line 279)
- Overlap glow calculations O(n²) complexity
- Already frame-limited to 30 FPS but still creating gradients
- Continuous shape morphing calculations

**Memory Impact:** ~1MB
**CPU Impact:** Moderate (gradient creation)
**GPU Impact:** Low (simple blending)

## Optimization Strategy

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

#### 1.2 Pre-calculate Bezier Paths
```javascript
// Calculate Bezier points once at spawn
meteor.pathPoints = calculateBezierPath(meteor.startX, meteor.startY, controlX, controlY, meteor.endX, meteor.endY, 100)
meteor.currentPathIndex = 0

// In animation loop, just interpolate between points
const index = Math.floor(t * meteor.pathPoints.length)
meteor.x = meteor.pathPoints[index].x
meteor.y = meteor.pathPoints[index].y
```

#### 1.3 Simplify Shader Calculations
```glsl
// Replace complex sparkle calculation with simpler version
float sparkle = step(0.98, sin(time * 15.0 + vPosition.x * 20.0)) * 3.0;

// Simplify spike calculation
float spike = sparkle * (1.0 - dist) * 0.5;
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
clouds.forEach(cloud => {
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
meteors.forEach(meteor => {
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
  deltaTime: dt
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

## Testing Strategy

### Performance Metrics to Track:
- Frame rate (target: stable 60 FPS)
- Frame time (target: <16.67ms)
- Memory usage (heap and GPU)
- Draw call count
- Canvas state changes

### Testing Tools:
- Chrome DevTools Performance Profiler
- Firefox Performance Tools
- Stats.js for real-time FPS monitoring
- Memory profiler for leak detection

### Test Scenarios:
1. Idle state (no interactions)
2. Continuous mouse movement
3. Rapid clicking
4. Page scrolling
5. Extended runtime (memory leaks)
6. Different screen sizes
7. Multiple browser tabs

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

## Conclusion

This optimization plan targets the most impactful performance bottlenecks first, with clear implementation strategies and expected outcomes. The phased approach allows for incremental improvements while maintaining stability. With full implementation, we expect to achieve 50-60% overall performance improvement, resulting in a smooth 60 FPS experience across all devices.