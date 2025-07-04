import { IRenderPipeline, RenderData, MeteorConfig, PerformanceMetrics, PipelineOptions, DirtyFlags } from './interfaces'
import { TypedArrayManager } from './typed-array-manager'
import { RENDER_DATA_FORMAT } from './data-format'

export class WASMRenderPipeline implements IRenderPipeline {
  private pipeline: any // WASM instance
  private wasmModule: any
  private arrayManager: TypedArrayManager
  private lastDirtyFlags = 0
  private canvas: HTMLCanvasElement
  private options: PipelineOptions
  
  constructor(wasmModule: any, canvas: HTMLCanvasElement, options: PipelineOptions = {}) {
    this.canvas = canvas
    this.options = options
    this.wasmModule = wasmModule
    this.pipeline = new wasmModule.RenderPipeline(canvas.width, canvas.height)
    this.arrayManager = new TypedArrayManager()
    
    // Initialize typed array views
    this.initializeViews()
  }
  
  private initializeViews() {
    const headerPtr = this.pipeline.get_header_ptr()
    const meteorPtr = this.pipeline.get_meteor_data_ptr()
    const particlePtr = this.pipeline.get_particle_data_ptr()
    
    // Access WASM memory through the __wbindgen_export_0 or memory property
    const wasmMemory = (this.wasmModule as any).__wbindgen_export_0 || (this.wasmModule as any).memory
    
    this.arrayManager.allocateViews(wasmMemory, {
      headerPtr,
      meteorPtr,
      particlePtr,
      maxMeteors: this.options.maxMeteors || 20,
      maxParticles: this.options.maxParticles || 500
    })
  }
  
  updateAll(dt: number, speedMultiplier: number): number {
    // Single WASM call
    const dirtyFlags = this.pipeline.update_all(dt, speedMultiplier)
    this.lastDirtyFlags = dirtyFlags
    return dirtyFlags
  }
  
  getRenderData(): RenderData {
    const headerView = this.arrayManager.getView<Uint32Array>('header')
    const meteorCount = headerView[0]
    const particleCount = headerView[1]
    const dirtyFlags = this.lastDirtyFlags
    
    const result: RenderData = {
      dirtyFlags,
      meteors: null,
      particles: null,
      timestamp: performance.now()
    }
    
    // Only return changed data
    if (dirtyFlags & DirtyFlags.METEORS) {
      const meteorView = this.arrayManager.getView<Float32Array>('meteors')
      const stride = RENDER_DATA_FORMAT.METEOR_STRIDE
      
      result.meteors = {
        count: meteorCount,
        positions: new Float32Array(meteorView.buffer, meteorView.byteOffset, meteorCount * 2),
        properties: new Float32Array(meteorView.buffer, meteorView.byteOffset + meteorCount * 2 * 4, meteorCount * 6),
        trails: [] // TODO: Get trail data from WASM
      }
    }
    
    if (dirtyFlags & DirtyFlags.PARTICLES) {
      const particleView = this.arrayManager.getView<Float32Array>('particles')
      const stride = RENDER_DATA_FORMAT.PARTICLE_STRIDE
      
      result.particles = {
        count: particleCount,
        positions: new Float32Array(particleView.buffer, particleView.byteOffset, particleCount * 2),
        velocities: new Float32Array(particleView.buffer, particleView.byteOffset + particleCount * 2 * 4, particleCount * 2),
        properties: new Float32Array(particleView.buffer, particleView.byteOffset + particleCount * 4 * 4, particleCount * 2)
      }
    }
    
    // Clear dirty flags after read
    this.lastDirtyFlags = 0
    
    return result
  }
  
  spawnMeteor(config: MeteorConfig): boolean {
    return this.pipeline.spawn_meteor(
      config.startX, config.startY,
      config.controlX, config.controlY,
      config.endX, config.endY,
      config.size, config.speed, config.maxLife,
      config.type === 'cool' ? 0 : config.type === 'warm' ? 1 : 2,
      config.colorR, config.colorG, config.colorB,
      config.glowR, config.glowG, config.glowB,
      config.glowIntensity
    )
  }
  
  getMetrics(): PerformanceMetrics {
    const metrics = this.pipeline.get_metrics()
    const headerView = this.arrayManager.getView<Uint32Array>('header')
    
    return {
      frameTime: metrics.frame_time || headerView[4],
      activeMeteors: metrics.active_meteors || headerView[0],
      activeParticles: metrics.active_particles || headerView[1],
      memoryUsage: metrics.memory_usage || headerView[5],
      isWASM: true,
      updateTime: metrics.update_time || headerView[9],
      packTime: metrics.pack_time || headerView[10],
      averageFrameTime: metrics.frame_time || headerView[4],
      highWaterMark: metrics.high_water_mark || headerView[6],
      cacheHits: metrics.cache_hits || headerView[7],
      cacheMisses: metrics.cache_misses || headerView[8]
    }
  }
  
  updateCanvasSize(width: number, height: number): void {
    // WASM doesn't currently support canvas resize
    // Would need to recreate the pipeline
    console.warn('Canvas resize not implemented for WASM pipeline')
  }
  
  destroy(): void {
    this.pipeline.destroy()
    this.pipeline = null
    this.arrayManager.destroy()
  }
}