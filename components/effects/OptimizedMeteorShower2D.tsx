'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

// Performance monitoring
let renderStats = {
  fps: 60,
  meteorsActive: 0,
  particlesActive: 0,
  gradientsCreated: 0,
  culledMeteors: 0,
  lastTime: performance.now(),
  frameCount: 0
}

interface Trail {
  x: number
  y: number
  opacity: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  color: { r: number; g: number; b: number }
  active: boolean // For pooling
}

interface BezierPoint {
  x: number
  y: number
}

interface Meteor {
  x: number
  y: number
  vx: number
  vy: number
  trail: Trail[]
  life: number
  maxLife: number
  size: number
  speed: number
  angle: number
  startX: number
  startY: number
  endX: number
  endY: number
  color: {
    r: number
    g: number
    b: number
  }
  glowColor: {
    r: number
    g: number
    b: number
  }
  glowIntensity: number
  active: boolean
  type: 'cool' | 'warm' | 'bright'
  particles: Particle[]
  
  // Optimization fields
  pathPoints: BezierPoint[] // Pre-calculated path
  pathIndex: number
  controlX: number // Bezier control point
  controlY: number
  lastGradientKey: string // For gradient caching
  isVisible: boolean // Viewport culling
}

// Gradient cache with LRU eviction
class GradientCache {
  private cache: Map<string, CanvasGradient> = new Map()
  private maxSize = 100
  private ctx: CanvasRenderingContext2D | null = null

  setContext(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
    this.cache.clear()
  }

  getLinearGradient(
    key: string,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    colorStops: Array<[number, string]>
  ): CanvasGradient | null {
    if (!this.ctx) return null

    let gradient = this.cache.get(key)
    if (!gradient) {
      gradient = this.ctx.createLinearGradient(x0, y0, x1, y1)
      colorStops.forEach(([offset, color]) => {
        gradient!.addColorStop(offset, color)
      })
      
      // LRU eviction
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value
        this.cache.delete(firstKey)
      }
      
      this.cache.set(key, gradient)
      renderStats.gradientsCreated++
    }
    return gradient
  }

  getRadialGradient(
    key: string,
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
    colorStops: Array<[number, string]>
  ): CanvasGradient | null {
    if (!this.ctx) return null

    let gradient = this.cache.get(key)
    if (!gradient) {
      gradient = this.ctx.createRadialGradient(x0, y0, r0, x1, y1, r1)
      colorStops.forEach(([offset, color]) => {
        gradient!.addColorStop(offset, color)
      })
      
      // LRU eviction
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value
        this.cache.delete(firstKey)
      }
      
      this.cache.set(key, gradient)
      renderStats.gradientsCreated++
    }
    return gradient
  }

  clear() {
    this.cache.clear()
  }
}

// Particle object pool
class ParticlePool {
  private pool: Particle[] = []
  private activeParticles: Set<Particle> = new Set()

  acquire(): Particle {
    let particle = this.pool.pop()
    if (!particle) {
      particle = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        size: 0,
        color: { r: 255, g: 255, b: 255 },
        active: true
      }
    }
    particle.active = true
    this.activeParticles.add(particle)
    return particle
  }

  release(particle: Particle) {
    particle.active = false
    this.activeParticles.delete(particle)
    this.pool.push(particle)
  }

  releaseAll(particles: Particle[]) {
    particles.forEach(p => {
      if (p.active) {
        this.release(p)
      }
    })
  }

  getActiveCount(): number {
    return this.activeParticles.size
  }
}

const METEOR_COUNT = 20
const BASE_TRAIL_LENGTH = 34
const SPAWN_RATE = 0.06
const BEZIER_SEGMENTS = 60 // Pre-calculated path segments

// Global instances
const gradientCache = new GradientCache()
const particlePool = new ParticlePool()

// Pre-calculate Bezier curve points
function calculateBezierPath(
  startX: number,
  startY: number,
  controlX: number,
  controlY: number,
  endX: number,
  endY: number,
  segments: number
): BezierPoint[] {
  const points: BezierPoint[] = []
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const oneMinusT = 1 - t
    
    // Quadratic Bezier formula
    const x = oneMinusT * oneMinusT * startX + 
              2 * oneMinusT * t * controlX + 
              t * t * endX
    
    const y = oneMinusT * oneMinusT * startY + 
              2 * oneMinusT * t * controlY + 
              t * t * endY
    
    points.push({ x, y })
  }
  
  return points
}

// Check if meteor is visible in viewport
function isMeteorVisible(
  meteor: Meteor,
  canvasWidth: number,
  canvasHeight: number,
  margin: number = 100
): boolean {
  // Check meteor head
  if (meteor.x >= -margin && meteor.x <= canvasWidth + margin &&
      meteor.y >= -margin && meteor.y <= canvasHeight + margin) {
    return true
  }
  
  // Check if any part of trail is visible
  if (meteor.trail.length > 0) {
    const lastTrail = meteor.trail[meteor.trail.length - 1]
    if (lastTrail.x >= -margin && lastTrail.x <= canvasWidth + margin &&
        lastTrail.y >= -margin && lastTrail.y <= canvasHeight + margin) {
      return true
    }
  }
  
  return false
}

export default function OptimizedMeteorShower2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const meteorsRef = useRef<Meteor[]>([])
  const animationIdRef = useRef<number>()
  const prefersReducedMotion = useReducedMotion()
  const showStatsRef = useRef(false)

  // Mouse interaction state
  const speedMultiplierRef = useRef(1)
  const isMovingRef = useRef(false)
  const clickBoostRef = useRef(0)
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (prefersReducedMotion) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { 
      alpha: true,
      desynchronized: true // Hint for better performance
    })
    if (!ctx) return

    // Initialize gradient cache with context
    gradientCache.setContext(ctx)

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Stats toggle
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'm' && e.ctrlKey) {
        showStatsRef.current = !showStatsRef.current
      }
    }
    window.addEventListener('keypress', handleKeyPress)

    // Mouse interaction handlers
    const handleMouseMove = () => {
      if (!isMovingRef.current) {
        isMovingRef.current = true
      }

      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current)
      }

      mouseMoveTimeoutRef.current = setTimeout(() => {
        isMovingRef.current = false
      }, 150)
    }

    const handleClick = () => {
      clickBoostRef.current = Date.now()
    }

    const handleScroll = () => {
      handleMouseMove()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)
    window.addEventListener('scroll', handleScroll)

    // Initialize meteor pool
    meteorsRef.current = Array.from({ length: METEOR_COUNT }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      trail: [],
      life: 0,
      maxLife: 100,
      size: 1,
      speed: 1,
      angle: 0,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      color: { r: 255, g: 255, b: 255 },
      glowColor: { r: 255, g: 255, b: 255 },
      glowIntensity: 1,
      active: false,
      type: 'cool',
      particles: [],
      pathPoints: [],
      pathIndex: 0,
      controlX: 0,
      controlY: 0,
      lastGradientKey: '',
      isVisible: true
    }))

    // Spawn a meteor with pre-calculated path
    const spawnMeteor = (meteor: Meteor) => {
      const spawnType = Math.random()
      const centerX = canvas.width / 2
      const bottomY = canvas.height + 50
      
      // Release old particles
      particlePool.releaseAll(meteor.particles)
      meteor.particles = []
      
      if (spawnType < 0.8) {
        // Top spawn
        meteor.startX = Math.random() * canvas.width
        meteor.startY = -20
        
        const isLeftSide = meteor.startX < centerX
        const distanceFromCenter = Math.abs(meteor.startX - centerX)
        const canCross = distanceFromCenter < centerX * 0.1
        
        if (canCross) {
          const crossAmount = centerX * 0.15
          meteor.endX = isLeftSide ? 
            centerX + Math.random() * crossAmount : 
            centerX - Math.random() * crossAmount
        } else {
          if (isLeftSide) {
            const maxEndX = centerX - 10
            const minEndX = meteor.startX
            const idealEndX = meteor.startX + distanceFromCenter * 0.6
            meteor.endX = Math.min(maxEndX, minEndX + Math.random() * (idealEndX - minEndX))
          } else {
            const minEndX = centerX + 10
            const maxEndX = meteor.startX
            const idealEndX = meteor.startX - distanceFromCenter * 0.6
            meteor.endX = Math.max(minEndX, maxEndX - Math.random() * (maxEndX - idealEndX))
          }
        }
      } else if (spawnType < 0.9) {
        // Left side spawn
        meteor.startX = -20
        meteor.startY = Math.random() * canvas.height * 0.3
        meteor.endX = centerX * 0.2 + Math.random() * centerX * 0.6
      } else {
        // Right side spawn
        meteor.startX = canvas.width + 20
        meteor.startY = Math.random() * canvas.height * 0.3
        meteor.endX = centerX * 1.2 + Math.random() * centerX * 0.6
      }
      
      meteor.endY = bottomY
      meteor.x = meteor.startX
      meteor.y = meteor.startY

      // Calculate Bezier control point
      const isLeftSide = meteor.startX < canvas.width / 2
      meteor.controlX = isLeftSide ? 
        meteor.startX + (meteor.endX - meteor.startX) * 0.8 :
        meteor.startX + (meteor.endX - meteor.startX) * 0.2
      meteor.controlY = meteor.startY + (meteor.endY - meteor.startY) * 0.6

      // Pre-calculate entire path
      meteor.pathPoints = calculateBezierPath(
        meteor.startX,
        meteor.startY,
        meteor.controlX,
        meteor.controlY,
        meteor.endX,
        meteor.endY,
        BEZIER_SEGMENTS
      )
      meteor.pathIndex = 0

      meteor.size = 0.3 + Math.random() * 0.7
      const sizeRatio = (meteor.size - 0.3) / 0.7
      const speed = 1.35 - sizeRatio * 0.225
      meteor.speed = speed
      
      const dx = meteor.endX - meteor.startX
      const dy = meteor.endY - meteor.startY
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      meteor.maxLife = Math.floor(distance / speed)
      meteor.life = 0
      
      meteor.angle = Math.atan2(dy, dx) * 180 / Math.PI
      
      const angleRad = meteor.angle * Math.PI / 180
      meteor.vx = Math.cos(angleRad) * speed
      meteor.vy = Math.sin(angleRad) * speed

      meteor.trail = []

      // Set meteor type and colors
      const typeRandom = Math.random()
      if (typeRandom < 0.4) {
        meteor.type = 'cool'
        meteor.color = { r: 220, g: 240, b: 255 }
        meteor.glowColor = { r: 150, g: 200, b: 255 }
        meteor.glowIntensity = 0.8 + Math.random() * 0.3
      } else if (typeRandom < 0.7) {
        meteor.type = 'warm'
        meteor.color = { r: 255, g: 200, b: 150 }
        meteor.glowColor = { r: 255, g: 150, b: 100 }
        meteor.glowIntensity = 0.9 + Math.random() * 0.4
      } else {
        meteor.type = 'bright'
        meteor.color = { r: 255, g: 255, b: 255 }
        meteor.glowColor = { r: 200, g: 220, b: 255 }
        meteor.glowIntensity = 1.2 + Math.random() * 0.3
        meteor.size *= 1.3
      }

      meteor.active = true
      meteor.isVisible = true
    }

    // Optimized animation loop
    const animate = () => {
      // Update FPS stats
      renderStats.frameCount++
      if (renderStats.frameCount % 30 === 0) {
        const currentTime = performance.now()
        renderStats.fps = 30000 / (currentTime - renderStats.lastTime)
        renderStats.lastTime = currentTime
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Calculate speed multiplier
      const currentTime = Date.now()
      let targetMultiplier = 1

      const timeSinceClick = currentTime - clickBoostRef.current
      const isClickActive = timeSinceClick < 600 && clickBoostRef.current > 0

      if (isClickActive) {
        const decay = 1 - timeSinceClick / 600
        targetMultiplier = 1 + 1.5 * decay
      } else if (isMovingRef.current) {
        targetMultiplier = 1.8
      }

      const smoothingFactor = 0.15
      speedMultiplierRef.current += (targetMultiplier - speedMultiplierRef.current) * smoothingFactor
      
      if (targetMultiplier === 1 && Math.abs(speedMultiplierRef.current - 1) < 0.001) {
        speedMultiplierRef.current = 1
      }

      // Spawn new meteors
      if (Math.random() < SPAWN_RATE) {
        const inactiveMeteor = meteorsRef.current.find((m) => !m.active)
        if (inactiveMeteor) {
          spawnMeteor(inactiveMeteor)
        }
      }

      // Update counters
      renderStats.meteorsActive = 0
      renderStats.culledMeteors = 0
      renderStats.particlesActive = particlePool.getActiveCount()

      // Batch render setup
      ctx.save()
      ctx.globalCompositeOperation = 'screen'

      // Update and draw meteors
      meteorsRef.current.forEach((meteor) => {
        if (!meteor.active) return

        renderStats.meteorsActive++

        // Check visibility
        meteor.isVisible = isMeteorVisible(meteor, canvas.width, canvas.height)
        if (!meteor.isVisible) {
          renderStats.culledMeteors++
          // Still update position but skip rendering
        }

        // Update position from pre-calculated path
        const prevX = meteor.x
        const prevY = meteor.y
        
        meteor.life += speedMultiplierRef.current
        const t = Math.min(meteor.life / meteor.maxLife, 1)
        
        // Use pre-calculated path
        const pathIndex = Math.min(Math.floor(t * BEZIER_SEGMENTS), BEZIER_SEGMENTS - 1)
        const nextIndex = Math.min(pathIndex + 1, BEZIER_SEGMENTS - 1)
        const localT = (t * BEZIER_SEGMENTS) % 1
        
        // Interpolate between path points for smooth motion
        meteor.x = meteor.pathPoints[pathIndex].x + 
                   (meteor.pathPoints[nextIndex].x - meteor.pathPoints[pathIndex].x) * localT
        meteor.y = meteor.pathPoints[pathIndex].y + 
                   (meteor.pathPoints[nextIndex].y - meteor.pathPoints[pathIndex].y) * localT
        
        meteor.vx = meteor.x - prevX
        meteor.vy = meteor.y - prevY

        // Update trail
        meteor.trail.unshift({ x: meteor.x, y: meteor.y, opacity: 1 })

        const trailMultiplier = Math.min(0.5 + meteor.size, 1.2)
        const meteorTrailLength = Math.floor(BASE_TRAIL_LENGTH * trailMultiplier)
        
        if (meteor.trail.length > meteorTrailLength) {
          meteor.trail.pop()
        }

        meteor.trail.forEach((point, i) => {
          point.opacity = 1 - i / meteorTrailLength
        })

        // Generate particles (optimized with pooling)
        if (meteor.isVisible) {
          const baseSpawnRate = 0.35
          const baseMaxParticles = 15
          
          const particleBoost = speedMultiplierRef.current > 1.05 ? speedMultiplierRef.current : 1
          const spawnRate = baseSpawnRate * particleBoost
          const maxParticles = Math.floor(baseMaxParticles * particleBoost * 2)
          
          if (Math.random() < spawnRate && meteor.particles.length < maxParticles) {
            const baseSparkleCount = meteor.type === 'bright' ? 2 : 1
            const sparkleCount = Math.ceil(baseSparkleCount * particleBoost)
            
            for (let i = 0; i < sparkleCount; i++) {
              const particle = particlePool.acquire()
              particle.x = meteor.x + (Math.random() - 0.5) * meteor.size * 4
              particle.y = meteor.y + (Math.random() - 0.5) * meteor.size * 4
              particle.vx = (Math.random() - 0.5) * 1.2 - meteor.vx * 0.5
              particle.vy = (Math.random() - 0.5) * 1.2 - meteor.vy * 0.5
              particle.life = 0
              particle.size = meteor.size * (0.15 + Math.random() * 0.25)
              particle.color = { ...meteor.color }
              meteor.particles.push(particle)
            }
          }
        }

        // Update particles
        meteor.particles = meteor.particles.filter((particle) => {
          particle.x += particle.vx * speedMultiplierRef.current
          particle.y += particle.vy * speedMultiplierRef.current
          particle.life += speedMultiplierRef.current
          
          if (particle.life >= 60) {
            particlePool.release(particle)
            return false
          }
          return true
        })

        // Check life
        if (t >= 1 || meteor.life >= meteor.maxLife) {
          meteor.active = false
          particlePool.releaseAll(meteor.particles)
          meteor.particles = []
          return
        }

        // Skip rendering if not visible
        if (!meteor.isVisible) return

        // Draw trail with cached gradient
        if (meteor.trail.length > 1) {
          const gradientKey = `trail_${meteor.type}_${Math.floor(meteor.size * 10)}`
          const gradient = gradientCache.getLinearGradient(
            gradientKey,
            meteor.trail[meteor.trail.length - 1].x,
            meteor.trail[meteor.trail.length - 1].y,
            meteor.x,
            meteor.y,
            [
              [0, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, 0)`],
              [0.2, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.3)`],
              [0.5, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.6)`],
              [1, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.9)`]
            ]
          )

          if (gradient) {
            ctx.strokeStyle = gradient
            ctx.lineWidth = Math.min(meteor.size * 3, 2.5)
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'

            ctx.beginPath()
            ctx.moveTo(meteor.trail[0].x, meteor.trail[0].y)

            // Simplified trail drawing - skip some points for performance
            const step = meteor.trail.length > 20 ? 2 : 1
            for (let i = step; i < meteor.trail.length; i += step) {
              ctx.lineTo(meteor.trail[i].x, meteor.trail[i].y)
            }

            ctx.stroke()
          }
        }

        // Draw particles with cached gradients
        meteor.particles.forEach((particle) => {
          const particleOpacity = 1 - particle.life / 60
          
          // Single optimized glow per particle
          const glowKey = `particle_${particle.size > 0.3 ? 'large' : 'small'}_${meteor.type}`
          const glow = gradientCache.getRadialGradient(
            glowKey,
            0, 0, 0,
            0, 0, particle.size * 6,
            [
              [0, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particleOpacity * 0.8})`],
              [0.5, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particleOpacity * 0.4})`],
              [1, 'rgba(0, 0, 0, 0)']
            ]
          )

          if (glow) {
            ctx.save()
            ctx.translate(particle.x, particle.y)
            ctx.fillStyle = glow
            ctx.fillRect(-particle.size * 6, -particle.size * 6, particle.size * 12, particle.size * 12)
            ctx.restore()
          }
        })

        // Draw meteor head with cached gradient
        const sizeNormalized = (meteor.size - 0.3) / 1.0
        const sizeBasedBoostFactor = 2.0 - (sizeNormalized * 1.7)
        const glowBoost = speedMultiplierRef.current > 1.1 ? 
          1 + (speedMultiplierRef.current - 1) * sizeBasedBoostFactor : 1
        
        const baseGlowSize = meteor.type === 'bright' ? meteor.size * 15 : meteor.size * 10
        const glowSize = baseGlowSize * glowBoost

        const glowKey = `meteor_${meteor.type}_${Math.floor(glowBoost * 10)}`
        const glowGradient = gradientCache.getRadialGradient(
          glowKey,
          0, 0, 0,
          0, 0, glowSize,
          [
            [0, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${meteor.glowIntensity})`],
            [0.4, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${meteor.glowIntensity * 0.3})`],
            [1, 'rgba(0, 0, 0, 0)']
          ]
        )

        if (glowGradient) {
          ctx.save()
          ctx.translate(meteor.x, meteor.y)
          ctx.fillStyle = glowGradient
          ctx.fillRect(-glowSize, -glowSize, glowSize * 2, glowSize * 2)
          ctx.restore()
        }

        // Fade out near end
        if (t > 0.9) {
          const fadeOpacity = 1 - (t - 0.9) / 0.1
          const baseIntensity = meteor.type === 'bright' ? 1.35 : meteor.type === 'warm' ? 1.1 : 0.95
          meteor.glowIntensity = baseIntensity * fadeOpacity
        }
      })

      ctx.restore()

      // Draw stats if enabled
      if (showStatsRef.current) {
        ctx.save()
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
        ctx.fillRect(canvas.width - 200, 10, 190, 120)
        
        ctx.fillStyle = '#00ff00'
        ctx.font = '12px monospace'
        ctx.fillText(`FPS: ${renderStats.fps.toFixed(1)}`, canvas.width - 190, 30)
        ctx.fillText(`Meteors: ${renderStats.meteorsActive}/${METEOR_COUNT}`, canvas.width - 190, 50)
        ctx.fillText(`Culled: ${renderStats.culledMeteors}`, canvas.width - 190, 70)
        ctx.fillText(`Particles: ${renderStats.particlesActive}`, canvas.width - 190, 90)
        ctx.fillText(`Gradients: ${renderStats.gradientsCreated}`, canvas.width - 190, 110)
        ctx.fillText(`Ctrl+M to toggle`, canvas.width - 190, 125)
        ctx.restore()
      }

      animationIdRef.current = requestAnimationFrame(animate)
    }

    // Start animation
    animate()

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('keypress', handleKeyPress)
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current)
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      gradientCache.clear()
    }
  }, [prefersReducedMotion])

  if (prefersReducedMotion) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 3 }} // Above nebula (2) but below content (10)
      aria-hidden="true"
    />
  )
}