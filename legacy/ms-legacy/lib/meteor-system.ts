import { getOptimizedFunctions } from '@/lib/wasm'

export interface MeteorData {
  index: number
  startX: number
  startY: number
  controlX: number
  controlY: number
  endX: number
  endY: number
  size: number
  speed: number
  maxLife: number
  type: 'cool' | 'warm' | 'bright'
  colorR: number
  colorG: number
  colorB: number
  glowR: number
  glowG: number
  glowB: number
  glowIntensity: number
}

export interface MeteorPosition {
  x: number
  y: number
  active: boolean
  visible: boolean
}

export interface MeteorProperties {
  size: number
  glowIntensity: number
  lifeRatio: number
  angle: number
  type: number
}

export interface ParticleData {
  x: number
  y: number
  size: number
  opacity: number
  active: boolean
}

export interface ParticleColors {
  r: number
  g: number
  b: number
}

export class WASMMeteorSystem {
  private wasmModule: any = null
  private meteorSystem: any = null
  private isInitialized = false
  private canvasWidth: number
  private canvasHeight: number
  private meteorCount = 0
  
  constructor(width: number, height: number) {
    this.canvasWidth = width
    this.canvasHeight = height
  }
  
  async initialize(): Promise<boolean> {
    try {
      this.wasmModule = await getOptimizedFunctions()
      if (!this.wasmModule || !this.wasmModule.MeteorSystem) {
        console.warn('MeteorSystem not available in WASM module')
        return false
      }
      
      this.meteorSystem = new this.wasmModule.MeteorSystem(this.canvasWidth, this.canvasHeight)
      this.isInitialized = true
      console.log('WASM MeteorSystem initialized successfully')
      return true
    } catch (error) {
      console.error('Failed to initialize WASM MeteorSystem:', error)
      return false
    }
  }
  
  updateCanvasSize(width: number, height: number): void {
    this.canvasWidth = width
    this.canvasHeight = height
    if (this.meteorSystem) {
      this.meteorSystem.update_canvas_size(width, height)
    }
  }
  
  initMeteor(data: MeteorData): boolean {
    if (!this.isInitialized || !this.meteorSystem) return false
    
    const typeMap = { 'cool': 0, 'warm': 1, 'bright': 2 }
    
    try {
      this.meteorSystem.init_meteor(
        data.index,
        data.startX,
        data.startY,
        data.controlX,
        data.controlY,
        data.endX,
        data.endY,
        data.size,
        data.speed,
        data.maxLife,
        typeMap[data.type],
        data.colorR,
        data.colorG,
        data.colorB,
        data.glowR,
        data.glowG,
        data.glowB,
        data.glowIntensity
      )
      return true
    } catch (error) {
      console.error('Failed to init meteor:', error)
      return false
    }
  }
  
  updateMeteors(speedMultiplier: number, qualityTier: number): number {
    if (!this.isInitialized || !this.meteorSystem) return 0
    
    try {
      return this.meteorSystem.update_meteors(speedMultiplier, qualityTier)
    } catch (error) {
      console.error('Failed to update meteors:', error)
      return 0
    }
  }
  
  updateParticles(speedMultiplier: number): void {
    if (!this.isInitialized || !this.meteorSystem) return
    
    try {
      this.meteorSystem.update_particles(speedMultiplier)
    } catch (error) {
      console.error('Failed to update particles:', error)
    }
  }
  
  spawnParticle(meteorIndex: number, spawnRate: number, maxParticles: number): boolean {
    if (!this.isInitialized || !this.meteorSystem) return false
    
    try {
      return this.meteorSystem.spawn_particle(meteorIndex, spawnRate, maxParticles)
    } catch (error) {
      console.error('Failed to spawn particle:', error)
      return false
    }
  }
  
  getMeteorPositions(): MeteorPosition[] {
    if (!this.isInitialized || !this.meteorSystem) return []
    
    try {
      const posArray = this.meteorSystem.get_meteor_positions()
      const positions: MeteorPosition[] = []
      
      for (let i = 0; i < posArray.length; i += 2) {
        positions.push({
          x: posArray[i],
          y: posArray[i + 1],
          active: posArray[i] !== -1,
          visible: posArray[i] !== -1
        })
      }
      
      return positions
    } catch (error) {
      console.error('Failed to get meteor positions:', error)
      return []
    }
  }
  
  getMeteorProperties(): MeteorProperties[] {
    if (!this.isInitialized || !this.meteorSystem) return []
    
    try {
      const propsArray = this.meteorSystem.get_meteor_properties()
      const properties: MeteorProperties[] = []
      
      for (let i = 0; i < propsArray.length; i += 5) {
        properties.push({
          size: propsArray[i],
          glowIntensity: propsArray[i + 1],
          lifeRatio: propsArray[i + 2],
          angle: propsArray[i + 3],
          type: propsArray[i + 4]
        })
      }
      
      return properties
    } catch (error) {
      console.error('Failed to get meteor properties:', error)
      return []
    }
  }
  
  getParticleData(): ParticleData[] {
    if (!this.isInitialized || !this.meteorSystem) return []
    
    try {
      const dataArray = this.meteorSystem.get_particle_data()
      const particles: ParticleData[] = []
      
      for (let i = 0; i < dataArray.length; i += 5) {
        particles.push({
          x: dataArray[i],
          y: dataArray[i + 1],
          size: dataArray[i + 2],
          opacity: dataArray[i + 3],
          active: dataArray[i + 4] > 0
        })
      }
      
      return particles
    } catch (error) {
      console.error('Failed to get particle data:', error)
      return []
    }
  }
  
  getParticleColors(): ParticleColors[] {
    if (!this.isInitialized || !this.meteorSystem) return []
    
    try {
      const colorsArray = this.meteorSystem.get_particle_colors()
      const colors: ParticleColors[] = []
      
      for (let i = 0; i < colorsArray.length; i += 3) {
        colors.push({
          r: colorsArray[i],
          g: colorsArray[i + 1],
          b: colorsArray[i + 2]
        })
      }
      
      return colors
    } catch (error) {
      console.error('Failed to get particle colors:', error)
      return []
    }
  }
  
  getActiveMeteorCount(): number {
    if (!this.isInitialized || !this.meteorSystem) return 0
    
    try {
      return this.meteorSystem.get_active_meteor_count()
    } catch (error) {
      console.error('Failed to get active meteor count:', error)
      return 0
    }
  }
  
  getActiveParticleCount(): number {
    if (!this.isInitialized || !this.meteorSystem) return 0
    
    try {
      return this.meteorSystem.get_active_particle_count()
    } catch (error) {
      console.error('Failed to get active particle count:', error)
      return 0
    }
  }
  
  cleanup(): void {
    if (this.meteorSystem) {
      this.meteorSystem.free?.()
      this.meteorSystem = null
    }
    this.isInitialized = false
  }
  
  isReady(): boolean {
    return this.isInitialized
  }
}