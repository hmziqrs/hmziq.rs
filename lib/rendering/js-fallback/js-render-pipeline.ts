import { IRenderPipeline, RenderData, MeteorConfig, PerformanceMetrics, PipelineOptions, DirtyFlags, TrailData } from '../interfaces'
import { JSMeteorSystem } from './js-meteor-system'
import { JSParticleSystem } from './js-particle-system'

export class JSRenderPipeline implements IRenderPipeline {
  private meteorSystem: JSMeteorSystem
  private particleSystem: JSParticleSystem
  private renderBuffer: Float32Array
  private dirtyFlags = DirtyFlags.ALL // All dirty initially
  private frameCounter = 0
  private lastUpdateTime = 0
  private options: PipelineOptions
  
  // Pre-allocated views to avoid allocations
  private meteorDataView: Float32Array
  private particleDataView: Float32Array
  private headerData = new Uint32Array(16)
  
  // Performance tracking
  private updateTimes: number[] = []
  private packTimes: number[] = []
  private maxSamples = 60
  
  constructor(canvas: HTMLCanvasElement, options: PipelineOptions = {}) {
    this.options = { maxMeteors: 20, maxParticles: 500, ...options }
    
    const { width, height } = canvas
    this.meteorSystem = new JSMeteorSystem(width, height, this.options.maxMeteors)
    this.particleSystem = new JSParticleSystem(this.options.maxParticles)
    
    // Pre-allocate buffers
    const maxMeteors = this.options.maxMeteors!
    const maxParticles = this.options.maxParticles!
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
    const startTime = performance.now()
    this.frameCounter++
    const currentTime = performance.now()
    
    // Temporal coherence - skip updates when possible
    const shouldUpdateMeteors = this.shouldUpdateMeteors()
    const shouldUpdateParticles = this.shouldUpdateParticles()
    
    // Update meteors
    if (shouldUpdateMeteors) {
      const activeMeteors = this.meteorSystem.update(dt, speedMultiplier)
      if (activeMeteors > 0 || this.meteorSystem.hasSignificantChanges()) {
        this.dirtyFlags |= DirtyFlags.METEORS
      }
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
    if (shouldUpdateParticles) {
      this.particleSystem.update(dt)
      if (particlesSpawned || this.particleSystem.hasNewSpawns() || this.particleSystem.getActiveCount() > 0) {
        this.dirtyFlags |= DirtyFlags.PARTICLES
      }
    }
    
    // Clean up particles for dying meteors
    const dyingMeteors = this.meteorSystem.getDyingMeteors()
    for (const meteorId of dyingMeteors) {
      this.particleSystem.freeMeteorParticles(meteorId)
    }
    
    // Pack render data if dirty
    const packStartTime = performance.now()
    if (this.dirtyFlags !== DirtyFlags.NONE) {
      this.packRenderData()
    }
    const packTime = performance.now() - packStartTime
    
    // Track performance
    const updateTime = performance.now() - startTime
    this.updateTimes.push(updateTime)
    this.packTimes.push(packTime)
    if (this.updateTimes.length > this.maxSamples) {
      this.updateTimes.shift()
      this.packTimes.shift()
    }
    
    this.lastUpdateTime = currentTime
    return this.dirtyFlags
  }
  
  private shouldUpdateMeteors(): boolean {
    // Skip update if no significant changes and every 3rd frame
    return this.meteorSystem.hasSignificantChanges() || 
           this.frameCounter % 3 === 0
  }
  
  private shouldUpdateParticles(): boolean {
    // Update every other frame unless new spawns
    return this.frameCounter % 2 === 0 || 
           this.particleSystem.hasNewSpawns()
  }
  
  private packRenderData(): void {
    // Pack header
    this.headerData[0] = this.meteorSystem.getActiveCount()
    this.headerData[1] = this.particleSystem.getActiveCount()
    this.headerData[2] = this.dirtyFlags
    this.headerData[3] = this.frameCounter
    this.headerData[4] = Math.round(this.getAverageUpdateTime())
    this.headerData[5] = this.estimateMemoryUsage()
    this.headerData[6] = this.getHighWaterMark()
    this.headerData[7] = 0 // cache hits (JS doesn't cache)
    this.headerData[8] = 0 // cache misses
    this.headerData[9] = Math.round(this.getAverageUpdateTime())
    this.headerData[10] = Math.round(this.getAveragePackTime())
    
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
      const meteorCount = this.headerData[0]
      const stride = 8 // Each meteor has 8 values
      result.meteors = {
        count: meteorCount,
        positions: new Float32Array(this.meteorDataView.buffer, this.meteorDataView.byteOffset, meteorCount * 2),
        properties: new Float32Array(this.meteorDataView.buffer, this.meteorDataView.byteOffset + meteorCount * 2 * 4, meteorCount * 6),
        trails: this.meteorSystem.getTrails()
      }
    }
    
    if (this.dirtyFlags & DirtyFlags.PARTICLES) {
      const particleCount = this.headerData[1]
      const stride = 6 // Each particle has 6 values
      result.particles = {
        count: particleCount,
        positions: new Float32Array(this.particleDataView.buffer, this.particleDataView.byteOffset, particleCount * 2),
        velocities: new Float32Array(this.particleDataView.buffer, this.particleDataView.byteOffset + particleCount * 2 * 4, particleCount * 2),
        properties: new Float32Array(this.particleDataView.buffer, this.particleDataView.byteOffset + particleCount * 4 * 4, particleCount * 2)
      }
    }
    
    // Clear dirty flags after read
    this.dirtyFlags = DirtyFlags.NONE
    
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
      isWASM: false,
      updateTime: this.getAverageUpdateTime(),
      packTime: this.getAveragePackTime(),
      averageFrameTime: this.getAverageUpdateTime(),
      highWaterMark: this.getHighWaterMark(),
      cacheHits: 0,
      cacheMisses: 0
    }
  }
  
  private estimateMemoryUsage(): number {
    // Rough estimate in bytes
    const meteorSize = this.options.maxMeteors! * 200 * 4 // ~200 floats per meteor * 4 bytes
    const particleSize = this.options.maxParticles! * 20 * 4 // ~20 floats per particle * 4 bytes
    const bufferSize = this.renderBuffer.byteLength
    return meteorSize + particleSize + bufferSize
  }
  
  private getHighWaterMark(): number {
    // Track maximum concurrent objects
    return Math.max(
      this.meteorSystem.getActiveCount(),
      this.particleSystem.getActiveCount() * 0.1 // Scale particles down
    )
  }
  
  private getAverageUpdateTime(): number {
    if (this.updateTimes.length === 0) return 0
    return this.updateTimes.reduce((sum, time) => sum + time, 0) / this.updateTimes.length
  }
  
  private getAveragePackTime(): number {
    if (this.packTimes.length === 0) return 0
    return this.packTimes.reduce((sum, time) => sum + time, 0) / this.packTimes.length
  }
  
  updateCanvasSize(width: number, height: number): void {
    this.meteorSystem.updateCanvasSize(width, height)
  }
  
  destroy(): void {
    // Clean up any resources
    this.meteorSystem = null as any
    this.particleSystem = null as any
    this.renderBuffer = null as any
  }
}