import { MeteorConfig, SpawnPoint, TrailData } from '../interfaces'

export interface JSMeteor {
  active: boolean
  x: number
  y: number
  startX: number
  startY: number
  endX: number
  endY: number
  controlX: number
  controlY: number
  vx: number
  vy: number
  size: number
  speed: number
  angle: number
  life: number
  maxLife: number
  trail: { x: number; y: number; opacity: number }[]
  pathPoints: { x: number; y: number }[]
  type: 'cool' | 'warm' | 'bright'
  color: { r: number; g: number; b: number }
  glowColor: { r: number; g: number; b: number }
  glowIntensity: number
  distanceTraveled: number
  pathLength: number
}

export class JSMeteorSystem {
  private meteors: JSMeteor[] = []
  private maxMeteors = 20
  private canvas: { width: number; height: number }
  private lastSignificantChange = 0
  private significantChangeThreshold = 0.1
  
  constructor(canvasWidth: number, canvasHeight: number, maxMeteors = 20) {
    this.canvas = { width: canvasWidth, height: canvasHeight }
    this.maxMeteors = maxMeteors
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
        glowColor: { r: 255, g: 255, b: 255 },
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
    meteor.color = { r: config.colorR, g: config.colorG, b: config.colorB }
    meteor.glowColor = { r: config.glowR, g: config.glowG, b: config.glowB }
    
    // Pre-calculate path with arc-length parameterization
    meteor.pathPoints = this.calculateBezierPath(
      config.startX, config.startY,
      config.controlX, config.controlY,
      config.endX, config.endY
    )
    meteor.pathLength = this.calculatePathLength(meteor.pathPoints)
    
    this.lastSignificantChange = performance.now()
    return index
  }
  
  update(dt: number, speedMultiplier: number): number {
    let activeCount = 0
    let hasSignificantChanges = false
    
    for (const meteor of this.meteors) {
      if (!meteor.active) continue
      activeCount++
      
      const oldX = meteor.x
      const oldY = meteor.y
      
      // Update distance-based movement (not time-based)
      meteor.distanceTraveled += meteor.speed * speedMultiplier * dt
      const distanceRatio = meteor.distanceTraveled / meteor.pathLength
      
      if (distanceRatio >= 1) {
        meteor.active = false
        hasSignificantChanges = true
        continue
      }
      
      // Interpolate position based on distance
      const pos = this.interpolatePosition(meteor.pathPoints, distanceRatio)
      meteor.x = pos.x
      meteor.y = pos.y
      
      // Check for significant movement
      const deltaX = Math.abs(meteor.x - oldX)
      const deltaY = Math.abs(meteor.y - oldY)
      if (deltaX > this.significantChangeThreshold || deltaY > this.significantChangeThreshold) {
        hasSignificantChanges = true
      }
      
      // Update velocity for particle spawning
      meteor.vx = (meteor.x - oldX) / dt
      meteor.vy = (meteor.y - oldY) / dt
      
      // Update angle based on velocity
      meteor.angle = Math.atan2(meteor.vy, meteor.vx)
      
      // Update trail
      meteor.trail.push({ x: pos.x, y: pos.y, opacity: 1 })
      const maxTrailLength = Math.floor(50 * (0.5 + meteor.size * 0.5))
      if (meteor.trail.length > maxTrailLength) {
        meteor.trail.shift()
      }
      
      // Fade trail
      for (let i = 0; i < meteor.trail.length; i++) {
        const fadeRatio = i / meteor.trail.length
        meteor.trail[i].opacity = fadeRatio * 0.8
      }
      
      // Update life for other systems
      meteor.life = distanceRatio * meteor.maxLife
    }
    
    if (hasSignificantChanges) {
      this.lastSignificantChange = performance.now()
    }
    
    return activeCount
  }
  
  private calculateBezierPath(startX: number, startY: number, controlX: number, controlY: number, endX: number, endY: number): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = []
    const segments = 100
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * endX
      const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * endY
      points.push({ x, y })
    }
    
    return points
  }
  
  private calculatePathLength(points: { x: number; y: number }[]): number {
    let length = 0
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x
      const dy = points[i].y - points[i - 1].y
      length += Math.sqrt(dx * dx + dy * dy)
    }
    return length
  }
  
  private interpolatePosition(points: { x: number; y: number }[], distanceRatio: number): { x: number; y: number } {
    if (distanceRatio <= 0) return points[0]
    if (distanceRatio >= 1) return points[points.length - 1]
    
    const index = Math.floor(distanceRatio * (points.length - 1))
    const localRatio = (distanceRatio * (points.length - 1)) - index
    
    if (index >= points.length - 1) return points[points.length - 1]
    
    const p1 = points[index]
    const p2 = points[index + 1]
    
    return {
      x: p1.x + (p2.x - p1.x) * localRatio,
      y: p1.y + (p2.y - p1.y) * localRatio
    }
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
          vx: meteor.vx,
          vy: meteor.vy,
          type: meteor.type,
          shouldSpawn: Math.random() < (meteor.type === 'bright' ? 0.3 : 0.2)
        })
      }
    }
    
    return points
  }
  
  getDyingMeteors(): number[] {
    const dying: number[] = []
    for (let i = 0; i < this.meteors.length; i++) {
      const meteor = this.meteors[i]
      if (meteor.active && meteor.distanceTraveled / meteor.pathLength > 0.9) {
        dying.push(i)
      }
    }
    return dying
  }
  
  getMeteor(index: number): JSMeteor | null {
    return this.meteors[index] || null
  }
  
  getActiveCount(): number {
    return this.meteors.filter(m => m.active).length
  }
  
  getTrails(): TrailData[] {
    return this.meteors.filter(m => m.active).map((m, i) => ({
      meteorId: i,
      points: m.trail
    }))
  }
  
  hasSignificantChanges(): boolean {
    return performance.now() - this.lastSignificantChange < 100 // 100ms threshold
  }
  
  updateCanvasSize(width: number, height: number) {
    this.canvas.width = width
    this.canvas.height = height
  }
}