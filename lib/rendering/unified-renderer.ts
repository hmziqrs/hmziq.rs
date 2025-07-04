import { RenderData, MeteorRenderData, ParticleRenderData, DirtyFlags } from './interfaces'

export class UnifiedRenderer {
  private ctx: CanvasRenderingContext2D
  private previousMeteorBounds: DOMRect[] = []
  private previousParticleBounds: DOMRect[] = []
  
  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')
    this.ctx = ctx
  }
  
  render(renderData: RenderData) {
    // Only re-render changed subsystems
    if (renderData.dirtyFlags & DirtyFlags.METEORS) {
      this.clearMeteorRegions()
      if (renderData.meteors) {
        this.renderMeteors(renderData.meteors)
      }
    }
    
    if (renderData.dirtyFlags & DirtyFlags.PARTICLES) {
      this.clearParticleRegions()
      if (renderData.particles) {
        this.renderParticles(renderData.particles)
      }
    }
  }
  
  private clearMeteorRegions() {
    // Clear only regions where meteors were previously drawn
    for (const bounds of this.previousMeteorBounds) {
      this.ctx.clearRect(bounds.x, bounds.y, bounds.width, bounds.height)
    }
    this.previousMeteorBounds = []
  }
  
  private clearParticleRegions() {
    // Clear only regions where particles were previously drawn
    for (const bounds of this.previousParticleBounds) {
      this.ctx.clearRect(bounds.x, bounds.y, bounds.width, bounds.height)
    }
    this.previousParticleBounds = []
  }
  
  private renderMeteors(meteors: MeteorRenderData) {
    const { count, positions, properties, trails } = meteors
    
    for (let i = 0; i < count; i++) {
      const x = positions[i * 2]
      const y = positions[i * 2 + 1]
      const size = properties[i * 6]
      const angle = properties[i * 6 + 1]
      const glowIntensity = properties[i * 6 + 2]
      const lifeRatio = properties[i * 6 + 3]
      const type = properties[i * 6 + 4]
      const active = properties[i * 6 + 5] > 0
      
      if (!active) continue
      
      // Track bounds for differential clearing
      const bounds = new DOMRect(x - 50, y - 50, 100, 100)
      this.previousMeteorBounds.push(bounds)
      
      // Render meteor glow
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size * 3)
      const color = this.getMeteorColor(type)
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${glowIntensity})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      
      this.ctx.fillStyle = gradient
      this.ctx.fillRect(x - size * 3, y - size * 3, size * 6, size * 6)
      
      // Render meteor core
      this.ctx.fillStyle = '#ffffff'
      this.ctx.beginPath()
      this.ctx.arc(x, y, size, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    // Render trails
    for (const trail of trails) {
      if (trail.points.length < 2) continue
      
      this.ctx.beginPath()
      this.ctx.moveTo(trail.points[0].x, trail.points[0].y)
      
      for (let i = 1; i < trail.points.length; i++) {
        const point = trail.points[i]
        this.ctx.lineTo(point.x, point.y)
      }
      
      this.ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }
  }
  
  private renderParticles(particles: ParticleRenderData) {
    const { count, positions, velocities, properties } = particles
    
    for (let i = 0; i < count; i++) {
      const x = positions[i * 2]
      const y = positions[i * 2 + 1]
      const size = properties[i * 2]
      const opacity = properties[i * 2 + 1]
      
      if (opacity <= 0) continue
      
      // Track bounds for differential clearing
      const bounds = new DOMRect(x - size, y - size, size * 2, size * 2)
      this.previousParticleBounds.push(bounds)
      
      // Render particle
      this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
      this.ctx.beginPath()
      this.ctx.arc(x, y, size, 0, Math.PI * 2)
      this.ctx.fill()
    }
  }
  
  private getMeteorColor(type: number): { r: number; g: number; b: number } {
    switch (type) {
      case 0: return { r: 100, g: 180, b: 255 } // cool
      case 1: return { r: 255, g: 200, b: 100 } // warm
      default: return { r: 255, g: 255, b: 255 } // bright
    }
  }
  
  clear() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
    this.previousMeteorBounds = []
    this.previousParticleBounds = []
  }
  
  updateCanvasSize(width: number, height: number) {
    this.ctx.canvas.width = width
    this.ctx.canvas.height = height
    this.clear()
  }
}