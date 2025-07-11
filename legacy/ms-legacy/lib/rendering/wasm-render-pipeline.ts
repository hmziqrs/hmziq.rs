import {
  IRenderPipeline,
  RenderData,
  MeteorConfig,
  PerformanceMetrics,
  PipelineOptions,
  DirtyFlags,
} from './interfaces'
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

    // Access WASM memory - wasm-bindgen exports it under different names
    let wasmMemory = null

    // Try different possible memory export locations
    if (typeof this.wasmModule.memory !== 'undefined') {
      wasmMemory = this.wasmModule.memory
    } else if (typeof this.wasmModule.__wbindgen_export_0 !== 'undefined') {
      wasmMemory = this.wasmModule.__wbindgen_export_0
    } else if (typeof this.wasmModule.__wbg_memory !== 'undefined') {
      wasmMemory = this.wasmModule.__wbg_memory
    } else {
      // Last resort: look for any property that looks like WebAssembly.Memory
      for (const key in this.wasmModule) {
        if (this.wasmModule[key] instanceof WebAssembly.Memory) {
          wasmMemory = this.wasmModule[key]
          break
        }
      }
    }

    if (!wasmMemory) {
      throw new Error('Failed to find WASM memory export')
    }

    this.arrayManager.allocateViews(wasmMemory, {
      headerPtr,
      meteorPtr,
      particlePtr,
      maxMeteors: this.options.maxMeteors || 20,
      maxParticles: this.options.maxParticles || 500,
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
      timestamp: performance.now(),
    }

    // Only return changed data
    if (dirtyFlags & DirtyFlags.METEORS) {
      const meteorView = this.arrayManager.getView<Float32Array>('meteors')
      const stride = RENDER_DATA_FORMAT.METEOR_STRIDE // 8

      // Create separate arrays for positions and properties
      const positions = new Float32Array(meteorCount * 2)
      const properties = new Float32Array(meteorCount * 6)

      // Extract data from packed format
      for (let i = 0; i < meteorCount; i++) {
        const srcOffset = i * stride
        // Positions: x, y
        positions[i * 2] = meteorView[srcOffset]
        positions[i * 2 + 1] = meteorView[srcOffset + 1]
        // Properties: size, angle, glowIntensity, lifeRatio, type, active
        properties[i * 6] = meteorView[srcOffset + 2]
        properties[i * 6 + 1] = meteorView[srcOffset + 3]
        properties[i * 6 + 2] = meteorView[srcOffset + 4]
        properties[i * 6 + 3] = meteorView[srcOffset + 5]
        properties[i * 6 + 4] = meteorView[srcOffset + 6]
        properties[i * 6 + 5] = meteorView[srcOffset + 7]
      }

      result.meteors = {
        count: meteorCount,
        positions,
        properties,
        trails: [], // TODO: Get trail data from WASM
      }
    }

    if (dirtyFlags & DirtyFlags.PARTICLES) {
      const particleView = this.arrayManager.getView<Float32Array>('particles')
      const stride = RENDER_DATA_FORMAT.PARTICLE_STRIDE // 6

      // Create separate arrays for positions, velocities, and properties
      const positions = new Float32Array(particleCount * 2)
      const velocities = new Float32Array(particleCount * 2)
      const properties = new Float32Array(particleCount * 2)

      // Extract data from packed format [x, y, vx, vy, size, opacity]
      for (let i = 0; i < particleCount; i++) {
        const srcOffset = i * stride
        // Positions: x, y
        positions[i * 2] = particleView[srcOffset]
        positions[i * 2 + 1] = particleView[srcOffset + 1]
        // Velocities: vx, vy
        velocities[i * 2] = particleView[srcOffset + 2]
        velocities[i * 2 + 1] = particleView[srcOffset + 3]
        // Properties: size, opacity
        properties[i * 2] = particleView[srcOffset + 4]
        properties[i * 2 + 1] = particleView[srcOffset + 5]
      }

      result.particles = {
        count: particleCount,
        positions,
        velocities,
        properties,
      }
    }

    // Clear dirty flags after read
    this.lastDirtyFlags = 0

    return result
  }

  spawnMeteor(config: MeteorConfig): boolean {
    return this.pipeline.spawn_meteor(
      config.startX,
      config.startY,
      config.controlX,
      config.controlY,
      config.endX,
      config.endY,
      config.size,
      config.speed,
      config.maxLife,
      config.type === 'cool' ? 0 : config.type === 'warm' ? 1 : 2,
      config.colorR,
      config.colorG,
      config.colorB,
      config.glowR,
      config.glowG,
      config.glowB,
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
      cacheMisses: metrics.cache_misses || headerView[8],
    }
  }

  updateCanvasSize(width: number, height: number): void {
    if (this.pipeline && this.pipeline.update_canvas_size) {
      this.pipeline.update_canvas_size(width, height)
    }
  }

  destroy(): void {
    this.pipeline.destroy()
    this.pipeline = null
    this.arrayManager.destroy()
  }
}
