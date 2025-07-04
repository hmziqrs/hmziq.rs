# WASM Unified Rendering Architecture Plan - V3 (With JavaScript Fallback)

## Objective: Implement dual-mode render pipeline with seamless WASM/JS fallback

## Current Architecture Problems
- Multiple WASM boundary crossings per frame (6+ calls)
- Separate ParticlePool causing state synchronization issues
- Particles not rendering due to loose coupling between systems
- Memory allocations every frame for TypedArray conversions
- No proper fallback when WASM fails to load
- Fragmented fallback logic scattered throughout MeteorShower.tsx

## Target Architecture: Unified Render Pipeline with Full JS Fallback

### Core Design Principles
1. **Interface-first design** - Common interface for both WASM and JS implementations
2. **Zero-performance penalty** - JS fallback should be optimized separately
3. **Seamless switching** - Runtime detection and switching between implementations
4. **Code isolation** - Fallback logic in dedicated classes, not scattered
5. **Feature parity** - JS fallback must support all WASM features

### Architecture Overview
```
┌─────────────────────────────────────────────────────────┐
│                    RenderPipeline                       │
│                    (Interface)                          │
├─────────────────────┬───────────────────────────────────┤
│   WASMRenderPipeline│      JSRenderPipeline            │
│   ┌────────────┐    │    ┌──────────────┐             │
│   │MeteorSystem│    │    │JSMeteorSystem │             │
│   │Particle    │    │    │JSParticle     │             │
│   │System      │    │    │System         │             │
│   │RenderBuffer│    │    │JSRenderBuffer │             │
│   └────────────┘    │    └──────────────┘             │
└─────────────────────┴───────────────────────────────────┘
```

### Phase 1: Define Common Interfaces

#### Task 1.1: Create IRenderPipeline interface
**File**: `lib/rendering/interfaces.ts` (new file)
**Implementation**:
```typescript
export interface IRenderPipeline {
  updateAll(dt: number, speedMultiplier: number): number
  getRenderData(): RenderData
  spawnMeteor(config: MeteorConfig): boolean
  getMetrics(): PerformanceMetrics
  destroy(): void
}

export interface RenderData {
  dirtyFlags: number
  meteors: MeteorRenderData | null
  particles: ParticleRenderData | null
  timestamp: number
}

export interface MeteorRenderData {
  count: number
  positions: Float32Array     // x,y pairs
  properties: Float32Array    // size,angle,glow,life
  trails: TrailData[]
}

export interface ParticleRenderData {
  count: number
  positions: Float32Array     // x,y pairs  
  velocities: Float32Array    // vx,vy pairs
  properties: Float32Array    // size,opacity,colorIndex
}
```

#### Task 1.2: Create RenderPipelineFactory
**File**: `lib/rendering/pipeline-factory.ts` (new file)
**Implementation**:
```typescript
export class RenderPipelineFactory {
  static async create(
    canvas: HTMLCanvasElement,
    options: PipelineOptions
  ): Promise<IRenderPipeline> {
    // Try WASM first
    if (!options.forceJavaScript) {
      try {
        const wasmModule = await getOptimizedFunctions()
        if (wasmModule?.RenderPipeline) {
          console.log('Using WASM render pipeline')
          return new WASMRenderPipeline(wasmModule, canvas)
        }
      } catch (error) {
        console.warn('WASM initialization failed, falling back to JS:', error)
      }
    }
    
    // Fallback to JavaScript
    console.log('Using JavaScript render pipeline')
    return new JSRenderPipeline(canvas)
  }
}
```

### Phase 2: Implement JavaScript Fallback System

#### Task 2.1: Create JSMeteorSystem
**File**: `lib/rendering/js-fallback/js-meteor-system.ts` (new file)
**Implementation**:
```typescript
export class JSMeteorSystem {
  private meteors: JSMeteor[] = []
  private maxMeteors = 20
  private canvas: { width: number; height: number }
  
  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvas = { width: canvasWidth, height: canvasHeight }
    this.initializeMeteors()
  }
  
  private initializeMeteors() {
    for (let i = 0; i < this.maxMeteors; i++) {
      this.meteors.push({
        active: false,
        x: 0, y: 0,
        startX: 0, startY: 0,
        endX: 0, endY: 0,
        controlX: 0, controlY: 0,
        vx: 0, vy: 0,
        size: 0,
        speed: 0,
        angle: 0,
        life: 0,
        maxLife: 0,
        trail: [],
        pathPoints: [],
        type: 'cool',
        color: { r: 255, g: 255, b: 255 },
        glowIntensity: 1,
        distanceTraveled: 0,
        pathLength: 0
      })
    }
  }
  
  spawnMeteor(config: MeteorConfig): number {
    const index = this.meteors.findIndex(m => !m.active)
    if (index === -1) return -1
    
    const meteor = this.meteors[index]
    Object.assign(meteor, config)
    meteor.active = true
    meteor.life = 0
    meteor.distanceTraveled = 0
    
    // Pre-calculate path with arc-length parameterization
    meteor.pathPoints = this.calculateBezierPath(
      config.startX, config.startY,
      config.controlX, config.controlY,
      config.endX, config.endY
    )
    meteor.pathLength = this.calculatePathLength(meteor.pathPoints)
    
    return index
  }
  
  update(dt: number, speedMultiplier: number): number {
    let activeCount = 0
    
    for (const meteor of this.meteors) {
      if (!meteor.active) continue
      activeCount++
      
      // Update distance-based movement (not time-based)
      meteor.distanceTraveled += meteor.speed * speedMultiplier * dt
      const distanceRatio = meteor.distanceTraveled / meteor.pathLength
      
      if (distanceRatio >= 1) {
        meteor.active = false
        continue
      }
      
      // Interpolate position based on distance
      const pos = this.interpolatePosition(meteor.pathPoints, distanceRatio)
      meteor.x = pos.x
      meteor.y = pos.y
      
      // Update trail
      meteor.trail.push({ x: pos.x, y: pos.y, opacity: 1 })
      const maxTrailLength = Math.floor(50 * (0.5 + meteor.size * 0.5))
      if (meteor.trail.length > maxTrailLength) {
        meteor.trail.shift()
      }
    }
    
    return activeCount
  }
  
  packRenderData(buffer: Float32Array, offset: number): number {
    let writePos = offset
    
    for (let i = 0; i < this.maxMeteors; i++) {
      const meteor = this.meteors[i]
      
      // Pack as [x, y, size, angle, glowIntensity, lifeRatio, type, active]
      buffer[writePos++] = meteor.x
      buffer[writePos++] = meteor.y
      buffer[writePos++] = meteor.size
      buffer[writePos++] = meteor.angle
      buffer[writePos++] = meteor.glowIntensity
      buffer[writePos++] = meteor.distanceTraveled / meteor.pathLength
      buffer[writePos++] = meteor.type === 'cool' ? 0 : meteor.type === 'warm' ? 1 : 2
      buffer[writePos++] = meteor.active ? 1 : 0
    }
    
    return writePos - offset
  }
  
  getSpawnPoints(): SpawnPoint[] {
    const points: SpawnPoint[] = []
    
    for (let i = 0; i < this.meteors.length; i++) {
      const meteor = this.meteors[i]
      if (meteor.active && meteor.trail.length > 5) {
        points.push({
          meteorId: i,
          x: meteor.x,
          y: meteor.y,
          type: meteor.type,
          shouldSpawn: Math.random() < (meteor.type === 'bright' ? 0.3 : 0.2)
        })
      }
    }
    
    return points
  }
}
```

#### Task 2.2: Create JSParticleSystem  
**File**: `lib/rendering/js-fallback/js-particle-system.ts` (new file)
**Implementation**:
```typescript
export class JSParticleSystem {
  private particles: JSParticle[] = []
  private freeIndices: number[] = []
  private meteorAssociations: Map<number, number[]> = new Map()
  private maxParticles = 500
  private activeCount = 0
  
  constructor() {
    this.initializePool()
  }
  
  private initializePool() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0, y: 0,
        vx: 0, vy: 0,
        size: 0,
        opacity: 0,
        life: 0,
        color: { r: 255, g: 255, b: 255 }
      })
      this.freeIndices.push(i)
    }
  }
  
  spawnForMeteor(meteorId: number, x: float, y: float, vx: float, vy: float, type: string): boolean {
    if (this.freeIndices.length === 0) return false
    
    const index = this.freeIndices.pop()!
    const particle = this.particles[index]
    
    // Initialize particle
    particle.active = true
    particle.x = x + (Math.random() - 0.5) * 4
    particle.y = y + (Math.random() - 0.5) * 4
    particle.vx = -vx * (0.1 + Math.random() * 0.15)
    particle.vy = -vy * (0.1 + Math.random() * 0.15)
    
    // Add lateral velocity
    const lateralSpeed = 0.4 + Math.random() * 0.4
    const lateralAngle = Math.random() * Math.PI * 2
    particle.vx += Math.cos(lateralAngle) * lateralSpeed
    particle.vy += Math.sin(lateralAngle) * lateralSpeed
    
    particle.life = 0
    particle.size = 0.21 * (0.9 + Math.random() * 0.2)
    particle.opacity = 0.64
    
    // Set color based on meteor type
    if (type === 'cool') {
      particle.color = { r: 100, g: 180, b: 255 }
    } else if (type === 'warm') {
      particle.color = { r: 255, g: 200, b: 100 }
    } else {
      particle.color = { r: 255, g: 255, b: 255 }
    }
    
    // Track association
    if (!this.meteorAssociations.has(meteorId)) {
      this.meteorAssociations.set(meteorId, [])
    }
    this.meteorAssociations.get(meteorId)!.push(index)
    
    this.activeCount++
    return true
  }
  
  update(dt: number): void {
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i]
      if (!particle.active) continue
      
      // Update physics
      particle.x += particle.vx * dt
      particle.y += particle.vy * dt
      particle.life += dt
      
      // Apply drag
      particle.vx *= 0.99
      particle.vy *= 0.99
      
      // Random drift
      particle.vx += (Math.random() - 0.5) * 0.02 * dt
      particle.vy += (Math.random() - 0.5) * 0.02 * dt
      
      // Check lifetime
      if (particle.life >= 50) {
        this.freeParticle(i)
      }
    }
  }
  
  private freeParticle(index: number): void {
    const particle = this.particles[index]
    if (!particle.active) return
    
    particle.active = false
    this.freeIndices.push(index)
    this.activeCount--
    
    // Remove from associations
    for (const [meteorId, indices] of this.meteorAssociations) {
      const idx = indices.indexOf(index)
      if (idx !== -1) {
        indices.splice(idx, 1)
        if (indices.length === 0) {
          this.meteorAssociations.delete(meteorId)
        }
        break
      }
    }
  }
  
  freeMeteorParticles(meteorId: number): void {
    const indices = this.meteorAssociations.get(meteorId)
    if (!indices) return
    
    for (const index of indices) {
      this.freeParticle(index)
    }
    this.meteorAssociations.delete(meteorId)
  }
  
  packRenderData(buffer: Float32Array, offset: number): number {
    let writePos = offset
    
    for (const particle of this.particles) {
      if (!particle.active) continue
      
      // Pack as [x, y, vx, vy, size, opacity]
      buffer[writePos++] = particle.x
      buffer[writePos++] = particle.y
      buffer[writePos++] = particle.vx
      buffer[writePos++] = particle.vy
      buffer[writePos++] = particle.size
      buffer[writePos++] = particle.opacity * Math.pow(1 - particle.life / 50, 0.3)
    }
    
    return writePos - offset
  }
}
```

#### Task 2.3: Create JSRenderPipeline
**File**: `lib/rendering/js-fallback/js-render-pipeline.ts` (new file)
**Implementation**:
```typescript
export class JSRenderPipeline implements IRenderPipeline {
  private meteorSystem: JSMeteorSystem
  private particleSystem: JSParticleSystem
  private renderBuffer: Float32Array
  private dirtyFlags = 0xFF // All dirty initially
  private frameCounter = 0
  private lastUpdateTime = 0
  
  // Pre-allocated views to avoid allocations
  private meteorDataView: Float32Array
  private particleDataView: Float32Array
  private headerData = new Uint32Array(16)
  
  constructor(canvas: HTMLCanvasElement) {
    const { width, height } = canvas
    this.meteorSystem = new JSMeteorSystem(width, height)
    this.particleSystem = new JSParticleSystem()
    
    // Pre-allocate buffers
    const maxMeteors = 20
    const maxParticles = 500
    const bufferSize = 16 + (maxMeteors * 8) + (maxParticles * 6)
    this.renderBuffer = new Float32Array(bufferSize)
    
    // Create views into the buffer
    const headerOffset = 0
    const meteorOffset = 16 * 4 // Header is u32, convert to f32 offset
    const particleOffset = meteorOffset + (maxMeteors * 8)
    
    this.meteorDataView = new Float32Array(
      this.renderBuffer.buffer,
      meteorOffset * 4,
      maxMeteors * 8
    )
    
    this.particleDataView = new Float32Array(
      this.renderBuffer.buffer,
      particleOffset * 4,
      maxParticles * 6
    )
  }
  
  updateAll(dt: number, speedMultiplier: number): number {
    this.frameCounter++
    const currentTime = performance.now()
    
    // Update meteors
    const activeMeteors = this.meteorSystem.update(dt, speedMultiplier)
    if (activeMeteors > 0) {
      this.dirtyFlags |= DirtyFlags.METEORS
    }
    
    // Get spawn points and spawn particles
    const spawnPoints = this.meteorSystem.getSpawnPoints()
    let particlesSpawned = false
    
    for (const spawn of spawnPoints) {
      if (spawn.shouldSpawn) {
        const meteor = this.meteorSystem.getMeteor(spawn.meteorId)
        if (meteor && this.particleSystem.spawnForMeteor(
          spawn.meteorId,
          spawn.x, spawn.y,
          meteor.vx, meteor.vy,
          spawn.type
        )) {
          particlesSpawned = true
        }
      }
    }
    
    // Update particles
    this.particleSystem.update(dt)
    if (particlesSpawned || this.particleSystem.getActiveCount() > 0) {
      this.dirtyFlags |= DirtyFlags.PARTICLES
    }
    
    // Clean up particles for dead meteors
    const dyingMeteors = this.meteorSystem.getDyingMeteors()
    for (const meteorId of dyingMeteors) {
      this.particleSystem.freeMeteorParticles(meteorId)
    }
    
    // Pack render data if dirty
    if (this.dirtyFlags !== 0) {
      this.packRenderData()
    }
    
    this.lastUpdateTime = currentTime
    return this.dirtyFlags
  }
  
  private packRenderData(): void {
    // Pack header
    this.headerData[0] = this.meteorSystem.getActiveCount()
    this.headerData[1] = this.particleSystem.getActiveCount()
    this.headerData[2] = this.dirtyFlags
    this.headerData[3] = this.frameCounter
    
    // Pack meteor data if dirty
    if (this.dirtyFlags & DirtyFlags.METEORS) {
      this.meteorSystem.packRenderData(this.meteorDataView, 0)
    }
    
    // Pack particle data if dirty
    if (this.dirtyFlags & DirtyFlags.PARTICLES) {
      this.particleSystem.packRenderData(this.particleDataView, 0)
    }
  }
  
  getRenderData(): RenderData {
    const result: RenderData = {
      dirtyFlags: this.dirtyFlags,
      meteors: null,
      particles: null,
      timestamp: this.lastUpdateTime
    }
    
    // Only return changed data
    if (this.dirtyFlags & DirtyFlags.METEORS) {
      result.meteors = {
        count: this.headerData[0],
        positions: this.meteorDataView.slice(0, this.headerData[0] * 2),
        properties: this.meteorDataView.slice(
          this.headerData[0] * 2,
          this.headerData[0] * 8
        ),
        trails: this.meteorSystem.getTrails()
      }
    }
    
    if (this.dirtyFlags & DirtyFlags.PARTICLES) {
      result.particles = {
        count: this.headerData[1],
        positions: this.particleDataView.slice(0, this.headerData[1] * 2),
        velocities: this.particleDataView.slice(
          this.headerData[1] * 2,
          this.headerData[1] * 4
        ),
        properties: this.particleDataView.slice(
          this.headerData[1] * 4,
          this.headerData[1] * 6
        )
      }
    }
    
    // Clear dirty flags after read
    this.dirtyFlags = 0
    
    return result
  }
  
  spawnMeteor(config: MeteorConfig): boolean {
    const index = this.meteorSystem.spawnMeteor(config)
    if (index !== -1) {
      this.dirtyFlags |= DirtyFlags.METEORS
      return true
    }
    return false
  }
  
  getMetrics(): PerformanceMetrics {
    return {
      frameTime: performance.now() - this.lastUpdateTime,
      activeMeteors: this.meteorSystem.getActiveCount(),
      activeParticles: this.particleSystem.getActiveCount(),
      memoryUsage: this.estimateMemoryUsage(),
      isWASM: false
    }
  }
  
  private estimateMemoryUsage(): number {
    // Rough estimate in bytes
    const meteorSize = 20 * 200 * 4 // 20 meteors * ~200 floats * 4 bytes
    const particleSize = 500 * 20 * 4 // 500 particles * ~20 floats * 4 bytes
    const bufferSize = this.renderBuffer.byteLength
    return meteorSize + particleSize + bufferSize
  }
  
  destroy(): void {
    // Clean up any resources
    this.meteorSystem = null
    this.particleSystem = null
    this.renderBuffer = null
  }
}
```

### Phase 3: Create WASM Implementation Wrapper

#### Task 3.1: Create WASMRenderPipeline wrapper
**File**: `lib/rendering/wasm-render-pipeline.ts` (new file)
**Implementation**:
```typescript
export class WASMRenderPipeline implements IRenderPipeline {
  private pipeline: any // WASM instance
  private wasmMemory: WebAssembly.Memory
  private cachedRenderData: RenderData = {
    dirtyFlags: 0,
    meteors: null,
    particles: null,
    timestamp: 0
  }
  
  // Direct memory views - no copying!
  private headerView: Uint32Array
  private meteorDataPtr: number
  private particleDataPtr: number
  
  constructor(wasmModule: any, canvas: HTMLCanvasElement) {
    const { width, height } = canvas
    this.pipeline = new wasmModule.RenderPipeline(width, height)
    this.wasmMemory = wasmModule.memory
    
    // Get stable pointers
    const headerPtr = this.pipeline.get_header_ptr()
    this.headerView = new Uint32Array(this.wasmMemory.buffer, headerPtr, 16)
    
    this.meteorDataPtr = this.pipeline.get_meteor_data_ptr()
    this.particleDataPtr = this.pipeline.get_particle_data_ptr()
  }
  
  updateAll(dt: number, speedMultiplier: number): number {
    // Single WASM call does everything
    const dirtyFlags = this.pipeline.update_all(dt, speedMultiplier)
    
    // Update cached render data based on dirty flags
    if (dirtyFlags > 0) {
      this.updateCachedRenderData(dirtyFlags)
    }
    
    return dirtyFlags
  }
  
  private updateCachedRenderData(dirtyFlags: number): void {
    this.cachedRenderData.dirtyFlags = dirtyFlags
    this.cachedRenderData.timestamp = performance.now()
    
    const meteorCount = this.headerView[0]
    const particleCount = this.headerView[1]
    
    // Update meteor data if dirty
    if (dirtyFlags & DirtyFlags.METEORS) {
      const meteorData = new Float32Array(
        this.wasmMemory.buffer,
        this.meteorDataPtr,
        meteorCount * 8
      )
      
      this.cachedRenderData.meteors = {
        count: meteorCount,
        positions: meteorData.slice(0, meteorCount * 2),
        properties: meteorData.slice(meteorCount * 2, meteorCount * 8),
        trails: [] // TODO: Get from WASM
      }
    }
    
    // Update particle data if dirty
    if (dirtyFlags & DirtyFlags.PARTICLES) {
      const particleData = new Float32Array(
        this.wasmMemory.buffer,
        this.particleDataPtr,
        particleCount * 6
      )
      
      this.cachedRenderData.particles = {
        count: particleCount,
        positions: particleData.slice(0, particleCount * 2),
        velocities: particleData.slice(particleCount * 2, particleCount * 4),
        properties: particleData.slice(particleCount * 4, particleCount * 6)
      }
    }
  }
  
  getRenderData(): RenderData {
    // Return cached data - already updated by updateAll
    const result = { ...this.cachedRenderData }
    
    // Clear dirty flags
    this.cachedRenderData.dirtyFlags = 0
    
    return result
  }
  
  spawnMeteor(config: MeteorConfig): boolean {
    return this.pipeline.spawn_meteor(
      config.startX, config.startY,
      config.controlX, config.controlY,
      config.endX, config.endY,
      config.size, config.speed,
      config.maxLife,
      config.type === 'cool' ? 0 : config.type === 'warm' ? 1 : 2,
      config.colorR, config.colorG, config.colorB,
      config.glowR, config.glowG, config.glowB,
      config.glowIntensity
    )
  }
  
  getMetrics(): PerformanceMetrics {
    const metrics = this.pipeline.get_metrics()
    return {
      frameTime: metrics.frame_time,
      activeMeteors: metrics.active_meteors,
      activeParticles: metrics.active_particles,
      memoryUsage: metrics.memory_usage,
      isWASM: true
    }
  }
  
  destroy(): void {
    if (this.pipeline) {
      this.pipeline.free()
      this.pipeline = null
    }
  }
}
```

### Phase 4: Integrate with MeteorShower Component

#### Task 4.1: Update MeteorShower.tsx to use unified pipeline
**File**: `components/effects/MeteorShower.tsx`
**Key changes**:
```typescript
export default function MeteorShower2DOptimized() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderPipeline = useRef<IRenderPipeline | null>(null)
  const animationIdRef = useRef<number | undefined>(undefined)
  
  // Initialize render pipeline
  useEffect(() => {
    const initPipeline = async () => {
      if (!canvasRef.current) return
      
      try {
        renderPipeline.current = await RenderPipelineFactory.create(
          canvasRef.current,
          {
            forceJavaScript: false, // Allow WASM
            maxMeteors: 20,
            maxParticles: 500
          }
        )
        
        console.log('Render pipeline initialized:', 
          renderPipeline.current.getMetrics().isWASM ? 'WASM' : 'JavaScript'
        )
      } catch (error) {
        console.error('Failed to initialize render pipeline:', error)
      }
    }
    
    initPipeline()
    
    return () => {
      renderPipeline.current?.destroy()
    }
  }, [])
  
  // Simplified animation loop
  const animate = useCallback((currentTime: number) => {
    if (!renderPipeline.current || !canvasRef.current) return
    
    const ctx = canvasRef.current.getContext('2d')!
    const deltaTime = frameTimer.current.update(currentTime)
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    
    // Single update call
    const dirtyFlags = renderPipeline.current.updateAll(
      deltaTime,
      speedMultiplierRef.current
    )
    
    // Get render data (only contains changed subsystems)
    const renderData = renderPipeline.current.getRenderData()
    
    // Render only dirty subsystems
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    
    if (renderData.meteors) {
      renderMeteors(ctx, renderData.meteors)
    }
    
    if (renderData.particles) {
      renderParticles(ctx, renderData.particles)
    }
    
    ctx.restore()
    
    // Schedule next frame
    animationIdRef.current = requestAnimationFrame(animate)
  }, [])
}
```

#### Task 4.2: Create unified rendering functions
**File**: `lib/rendering/unified-renderer.ts` (new file)
**Implementation**:
```typescript
export function renderMeteors(
  ctx: CanvasRenderingContext2D,
  data: MeteorRenderData
): void {
  const { count, positions, properties, trails } = data
  
  for (let i = 0; i < count; i++) {
    const x = positions[i * 2]
    const y = positions[i * 2 + 1]
    const size = properties[i * 6]
    const angle = properties[i * 6 + 1]
    const glowIntensity = properties[i * 6 + 2]
    const lifeRatio = properties[i * 6 + 3]
    const type = properties[i * 6 + 4]
    const active = properties[i * 6 + 5]
    
    if (!active) continue
    
    // Draw trail
    if (trails[i]) {
      drawTaperedTrail(ctx, trails[i])
    }
    
    // Draw meteor head
    drawMeteorHead(ctx, x, y, size, angle, glowIntensity, type)
  }
}

export function renderParticles(
  ctx: CanvasRenderingContext2D,
  data: ParticleRenderData
): void {
  const { count, positions, properties } = data
  
  for (let i = 0; i < count; i++) {
    const x = positions[i * 2]
    const y = positions[i * 2 + 1]
    const size = properties[i * 2]
    const opacity = properties[i * 2 + 1]
    
    drawParticle(ctx, x, y, size, opacity)
  }
}
```

### Phase 5: Performance Optimizations

#### Task 5.1: Add performance monitoring
**File**: `lib/rendering/performance-monitor.ts` (new file)
**Implementation**:
```typescript
export class RenderPipelineMonitor {
  private metrics: PerformanceMetrics[] = []
  private maxSamples = 60
  
  recordFrame(pipeline: IRenderPipeline): void {
    const metrics = pipeline.getMetrics()
    this.metrics.push(metrics)
    
    if (this.metrics.length > this.maxSamples) {
      this.metrics.shift()
    }
  }
  
  getAverageFrameTime(): number {
    if (this.metrics.length === 0) return 0
    return this.metrics.reduce((sum, m) => sum + m.frameTime, 0) / this.metrics.length
  }
  
  shouldDowngrade(): boolean {
    const avgFrameTime = this.getAverageFrameTime()
    return avgFrameTime > 16.67 // Below 60fps
  }
}
```

## Implementation Order

1. **Phase 1**: Define interfaces (Foundation for both implementations)
2. **Phase 2**: Implement complete JS fallback (Ensures feature parity)
3. **Phase 3**: Create WASM wrapper (Integrates with existing WASM code)
4. **Phase 4**: Update MeteorShower.tsx (Single integration point)
5. **Phase 5**: Add monitoring (Performance tracking)

## Benefits of This Approach

1. **True Fallback**: Complete JS implementation, not just partial
2. **Performance**: JS version is optimized separately, not a direct port
3. **Maintainability**: All fallback logic in dedicated classes
4. **Testing**: Can test both implementations side-by-side
5. **Debugging**: Can force JS mode for easier debugging
6. **Gradual Migration**: Can implement piece by piece

## Key Differences from V2

1. **Complete JS Implementation**: Not just a stub, but fully functional
2. **Shared Interface**: Both implementations follow IRenderPipeline
3. **Factory Pattern**: Runtime selection of implementation
4. **Pre-allocated Buffers**: JS version also avoids allocations
5. **Unified Rendering**: Same rendering functions for both paths