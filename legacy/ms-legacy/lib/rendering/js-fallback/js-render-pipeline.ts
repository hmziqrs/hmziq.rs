import {
  IRenderPipeline,
  RenderData,
  MeteorConfig,
  PerformanceMetrics,
  PipelineOptions,
  DirtyFlags,
  TrailData,
} from '../interfaces'
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
    const bufferSize = 16 + maxMeteors * 8 + maxParticles * 6
    this.renderBuffer = new Float32Array(bufferSize)

    // Create views into the buffer
    const headerOffset = 0
    const meteorOffset = 16 // Header takes 16 Float32 slots
    const particleOffset = meteorOffset + maxMeteors * 8

    this.meteorDataView = new Float32Array(
      this.renderBuffer.buffer,
      meteorOffset * 4, // Convert to byte offset
      maxMeteors * 8
    )

    this.particleDataView = new Float32Array(
      this.renderBuffer.buffer,
      particleOffset * 4, // Convert to byte offset
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
        if (
          meteor &&
          this.particleSystem.spawnForMeteor(
            spawn.meteorId,
            spawn.x,
            spawn.y,
            meteor.vx,
            meteor.vy,
            spawn.type
          )
        ) {
          particlesSpawned = true
        }
      }
    }

    // Update particles
    if (shouldUpdateParticles) {
      this.particleSystem.update(dt)
      if (
        particlesSpawned ||
        this.particleSystem.hasNewSpawns() ||
        this.particleSystem.getActiveCount() > 0
      ) {
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

    // Debug logging
    if (this.frameCounter % 60 === 0) {
      console.log(
        `JS Pipeline - Meteors: ${this.meteorSystem.getActiveCount()}, Particles: ${this.particleSystem.getActiveCount()}, DirtyFlags: ${this.dirtyFlags}`
      )
    }

    return this.dirtyFlags
  }

  private shouldUpdateMeteors(): boolean {
    // Skip update if no significant changes and every 3rd frame
    return this.meteorSystem.hasSignificantChanges() || this.frameCounter % 3 === 0
  }

  private shouldUpdateParticles(): boolean {
    // Update every other frame unless new spawns
    return this.frameCounter % 2 === 0 || this.particleSystem.hasNewSpawns()
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
      timestamp: this.lastUpdateTime,
    }

    // Only return changed data
    if (this.dirtyFlags & DirtyFlags.METEORS) {
      const meteorCount = this.headerData[0]
      const stride = 8 // Each meteor has 8 values

      // Create separate arrays for positions and properties
      const positions = new Float32Array(meteorCount * 2)
      const properties = new Float32Array(meteorCount * 6)

      // Extract data from packed format
      for (let i = 0; i < meteorCount; i++) {
        const srcOffset = i * stride
        // Positions: x, y
        positions[i * 2] = this.meteorDataView[srcOffset]
        positions[i * 2 + 1] = this.meteorDataView[srcOffset + 1]
        // Properties: size, angle, glowIntensity, lifeRatio, type, active
        properties[i * 6] = this.meteorDataView[srcOffset + 2]
        properties[i * 6 + 1] = this.meteorDataView[srcOffset + 3]
        properties[i * 6 + 2] = this.meteorDataView[srcOffset + 4]
        properties[i * 6 + 3] = this.meteorDataView[srcOffset + 5]
        properties[i * 6 + 4] = this.meteorDataView[srcOffset + 6]
        properties[i * 6 + 5] = this.meteorDataView[srcOffset + 7]
      }

      result.meteors = {
        count: meteorCount,
        positions,
        properties,
        trails: this.meteorSystem.getTrails(),
      }
    }

    if (this.dirtyFlags & DirtyFlags.PARTICLES) {
      const particleCount = this.headerData[1]
      const stride = 6 // Each particle has 6 values

      // Create separate arrays for positions, velocities, and properties
      const positions = new Float32Array(particleCount * 2)
      const velocities = new Float32Array(particleCount * 2)
      const properties = new Float32Array(particleCount * 2)

      // Extract data from packed format [x, y, vx, vy, size, opacity]
      for (let i = 0; i < particleCount; i++) {
        const srcOffset = i * stride
        // Positions: x, y
        positions[i * 2] = this.particleDataView[srcOffset]
        positions[i * 2 + 1] = this.particleDataView[srcOffset + 1]
        // Velocities: vx, vy
        velocities[i * 2] = this.particleDataView[srcOffset + 2]
        velocities[i * 2 + 1] = this.particleDataView[srcOffset + 3]
        // Properties: size, opacity
        properties[i * 2] = this.particleDataView[srcOffset + 4]
        properties[i * 2 + 1] = this.particleDataView[srcOffset + 5]
      }

      result.particles = {
        count: particleCount,
        positions,
        velocities,
        properties,
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
      console.log(`Spawned meteor at index ${index}, config:`, config)
      return true
    }
    console.warn('Failed to spawn meteor - no free slots')
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
      cacheMisses: 0,
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
