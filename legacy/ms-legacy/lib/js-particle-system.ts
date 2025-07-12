export interface JSParticle {
  active: boolean
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  life: number
  color: { r: number; g: number; b: number }
}

export class JSParticleSystem {
  private particles: JSParticle[] = []
  private freeIndices: number[] = []
  private meteorAssociations: Map<number, number[]> = new Map()
  private maxParticles = 500
  private activeCount = 0
  private hasNewSpawnsFlag = false
  private lastSpawnTime = 0

  constructor(maxParticles = 500) {
    this.maxParticles = maxParticles
    this.initializePool()
  }

  private initializePool() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 0,
        opacity: 0,
        life: 0,
        color: { r: 255, g: 255, b: 255 },
      })
      this.freeIndices.push(i)
    }
  }

  spawnForMeteor(
    meteorId: number,
    x: number,
    y: number,
    vx: number,
    vy: number,
    type: string
  ): boolean {
    if (this.freeIndices.length === 0) return false

    const index = this.freeIndices.pop()!
    const particle = this.particles[index]

    // Initialize particle
    particle.active = true
    particle.x = x + (Math.random() - 0.5) * 4
    particle.y = y + (Math.random() - 0.5) * 4
    particle.vx = -vx * (0.1 + Math.random() * 0.15)
    particle.vy = -vy * (0.1 + Math.random() * 0.15)

    // Add lateral velocity for natural spread
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
      // bright
      particle.color = { r: 255, g: 255, b: 255 }
    }

    // Track association
    if (!this.meteorAssociations.has(meteorId)) {
      this.meteorAssociations.set(meteorId, [])
    }
    this.meteorAssociations.get(meteorId)!.push(index)

    this.activeCount++
    this.hasNewSpawnsFlag = true
    this.lastSpawnTime = performance.now()
    return true
  }

  update(dt: number): void {
    this.hasNewSpawnsFlag = false

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

      // Random drift for more natural movement
      particle.vx += (Math.random() - 0.5) * 0.02 * dt
      particle.vy += (Math.random() - 0.5) * 0.02 * dt

      // Fade out over lifetime
      const fadeRatio = Math.pow(1 - particle.life / 50, 0.3)
      particle.opacity = 0.64 * fadeRatio

      // Check lifetime
      if (particle.life >= 50 || particle.opacity <= 0.01) {
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
      buffer[writePos++] = particle.opacity
    }

    return writePos - offset
  }

  getActiveCount(): number {
    return this.activeCount
  }

  hasNewSpawns(): boolean {
    return this.hasNewSpawnsFlag || performance.now() - this.lastSpawnTime < 50
  }

  getFreeCount(): number {
    return this.freeIndices.length
  }

  getCapacity(): number {
    return this.maxParticles
  }
}
