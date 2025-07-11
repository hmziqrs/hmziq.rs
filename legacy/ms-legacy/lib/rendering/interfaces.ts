export interface IRenderPipeline {
  updateAll(dt: number, speedMultiplier: number): number
  getRenderData(): RenderData
  spawnMeteor(config: MeteorConfig): boolean
  getMetrics(): PerformanceMetrics
  destroy(): void
  updateCanvasSize?(width: number, height: number): void
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
  properties: Float32Array    // size,angle,glow,life,type,active
  trails: TrailData[]
}

export interface ParticleRenderData {
  count: number
  positions: Float32Array     // x,y pairs  
  velocities: Float32Array    // vx,vy pairs
  properties: Float32Array    // size,opacity
}

export interface TrailData {
  points: { x: number; y: number; opacity: number }[]
  meteorId: number
}

export interface MeteorConfig {
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

export interface PerformanceMetrics {
  frameTime: number
  activeMeteors: number
  activeParticles: number
  memoryUsage: number
  isWASM: boolean
  updateTime?: number
  packTime?: number
  averageFrameTime?: number
  highWaterMark?: number
  cacheHits?: number
  cacheMisses?: number
}

export interface SpawnPoint {
  meteorId: number
  x: number
  y: number
  vx: number
  vy: number
  type: string
  shouldSpawn: boolean
}

export interface PipelineOptions {
  forceJavaScript?: boolean
  maxMeteors?: number
  maxParticles?: number
  enableDebug?: boolean
  enablePerformanceOverlay?: boolean
}

// Dirty flags for differential updates
export enum DirtyFlags {
  NONE = 0,
  METEORS = 0b00000001,
  PARTICLES = 0b00000010,
  STARS = 0b00000100,
  ALL = 0b11111111
}