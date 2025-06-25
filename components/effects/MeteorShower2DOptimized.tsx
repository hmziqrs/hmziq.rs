'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { QualityManager } from '@/lib/performance/quality-manager'
import { gradientCaches, generateGradientKey } from '@/lib/performance/gradient-cache'
import { 
  ObjectPool, 
  FrameTimer,
  calculateBezierPath,
  interpolateBezierPoint,
  isInViewport,
  type BezierPoint
} from '@/lib/performance/performance-utils'

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
  active: boolean
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
  controlX: number
  controlY: number
  pathPoints: BezierPoint[]
  pathIndex: number
  color: { r: number; g: number; b: number }
  glowColor: { r: number; g: number; b: number }
  glowIntensity: number
  active: boolean
  type: 'cool' | 'warm' | 'bright'
  particles: Particle[]
  isVisible: boolean
}

type MeteorType = 'cool' | 'warm' | 'bright'

const BASE_TRAIL_LENGTH = 34
const SPAWN_RATE = 0.06
const BEZIER_SEGMENTS = 60

export default function MeteorShower2DOptimized() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const meteorsRef = useRef<Meteor[]>([])
  const animationIdRef = useRef<number>()
  const prefersReducedMotion = useReducedMotion()
  const frameTimer = useRef(new FrameTimer())
  
  // Performance management
  const qualityManager = useRef<QualityManager>()
  const particlePool = useRef<ObjectPool<Particle>>()

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
      desynchronized: true
    })
    if (!ctx) {
      console.error('Failed to get 2D context')
      return
    }

    console.log('Canvas initialized:', canvas.width, 'x', canvas.height)

    // Initialize performance management
    qualityManager.current = QualityManager.getInstance()
    const settings = qualityManager.current.getSettings()
    console.log('Quality settings:', settings)
    
    // Initialize gradient cache
    gradientCaches.meteors.setContext(ctx)
    
    // Initialize particle pool
    particlePool.current = new ObjectPool<Particle>(
      () => ({
        x: 0, y: 0, vx: 0, vy: 0, life: 0, size: 0,
        color: { r: 255, g: 255, b: 255 },
        active: false
      }),
      (particle) => {
        particle.active = false
        particle.life = 0
      },
      settings.meteorParticleLimit * 2,
      settings.meteorParticleLimit * 4
    )

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      
      // Recalculate meteor count based on quality settings
      const meteorCount = qualityManager.current!.getAdaptiveCount(
        settings.meteorCount,
        canvas.width,
        canvas.height
      )
      
      // Initialize or adjust meteor pool
      if (meteorsRef.current.length !== meteorCount) {
        meteorsRef.current = Array.from({ length: meteorCount }, () => createMeteor())
      }
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    
    // Spawn some initial meteors
    const initialMeteors = Math.min(5, meteorsRef.current.length)
    for (let i = 0; i < initialMeteors; i++) {
      if (meteorsRef.current[i]) {
        spawnMeteor(meteorsRef.current[i])
      }
    }
    
    console.log('MeteorShower2DOptimized initialized with', meteorsRef.current.length, 'meteors')

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

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)

    // Create meteor object
    function createMeteor(): Meteor {
      return {
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
        controlX: 0,
        controlY: 0,
        pathPoints: [],
        pathIndex: 0,
        color: { r: 255, g: 255, b: 255 },
        glowColor: { r: 255, g: 255, b: 255 },
        glowIntensity: 1,
        active: false,
        type: 'cool',
        particles: [],
        isVisible: true
      }
    }

    // Spawn meteor with pre-calculated path
    function spawnMeteor(meteor: Meteor) {
      const centerX = canvas.width / 2
      const bottomY = canvas.height - 100
      const spawnType = Math.random()

      if (spawnType < 0.8) {
        // Top spawn (most common)
        meteor.startX = Math.random() * canvas.width
        meteor.startY = -20
        meteor.endX = centerX * 0.5 + Math.random() * centerX
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

    // Draw tapered trail based on quality tier
    function drawTaperedTrail(meteor: Meteor, ctx: CanvasRenderingContext2D) {
      const settings = qualityManager.current!.getSettings()
      
      if (meteor.trail.length < 2) return
      
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      
      if (settings.meteorTrailQuality === 'tapered') {
        // High quality tapered trail
        drawHighQualityTaperedTrail(meteor, ctx)
      } else if (settings.meteorTrailQuality === 'smooth') {
        // Medium quality smooth trail
        drawSmoothTrail(meteor, ctx)
      } else {
        // Simple trail for performance
        drawSimpleTrail(meteor, ctx)
      }
      
      ctx.restore()
    }

    function drawHighQualityTaperedTrail(meteor: Meteor, ctx: CanvasRenderingContext2D) {
      const trailLength = meteor.trail.length
      const maxWidth = Math.min(meteor.size * 5, 4)
      const minWidth = 0.1
      
      // Build the trail shape
      ctx.beginPath()
      
      const trailPoints: { x: number, y: number, width: number }[] = []
      
      for (let i = 0; i < trailLength; i++) {
        const progress = i / (trailLength - 1)  // 0 = oldest (tail), 1 = newest (head)
        const width = maxWidth * Math.pow(progress, 2.5) + minWidth  // REVERSED: thin at tail, thick at head
        trailPoints.push({
          x: meteor.trail[i].x,
          y: meteor.trail[i].y,
          width: width
        })
      }
      
      // Draw top edge
      for (let i = 0; i < trailPoints.length; i++) {
        const point = trailPoints[i]
        const angle = i < trailPoints.length - 1 
          ? Math.atan2(trailPoints[i + 1].y - point.y, trailPoints[i + 1].x - point.x)
          : Math.atan2(point.y - trailPoints[i - 1].y, point.x - trailPoints[i - 1].x)
        
        const perpAngle = angle + Math.PI / 2
        const offsetX = Math.cos(perpAngle) * point.width / 2
        const offsetY = Math.sin(perpAngle) * point.width / 2
        
        if (i === 0) {
          ctx.moveTo(point.x + offsetX, point.y + offsetY)
        } else {
          ctx.lineTo(point.x + offsetX, point.y + offsetY)
        }
      }
      
      // Draw bottom edge (reverse)
      for (let i = trailPoints.length - 1; i >= 0; i--) {
        const point = trailPoints[i]
        const angle = i < trailPoints.length - 1 
          ? Math.atan2(trailPoints[i + 1].y - point.y, trailPoints[i + 1].x - point.x)
          : Math.atan2(point.y - trailPoints[i - 1].y, point.x - trailPoints[i - 1].x)
        
        const perpAngle = angle + Math.PI / 2
        const offsetX = Math.cos(perpAngle) * point.width / 2
        const offsetY = Math.sin(perpAngle) * point.width / 2
        
        ctx.lineTo(point.x - offsetX, point.y - offsetY)
      }
      
      ctx.closePath()
      
      // Apply gradient - REVERSED: from head (current position) to tail
      const gradient = gradientCaches.meteors.getLinearGradient(
        generateGradientKey('trail_tapered', meteor.type, Math.floor(meteor.size * 10)),
        meteor.x,  // Start from current position (head)
        meteor.y,
        meteor.trail[0].x,  // To oldest position (tail)
        meteor.trail[0].y,
        [
          [0, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 1)`],  // Full opacity at head
          [0.1, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.85)`],
          [0.3, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.6)`],
          [0.5, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.4)`],
          [0.7, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.2)`],
          [0.9, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.05)`],
          [1, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, 0)`]  // Fade to nothing at tail
        ]
      )
      
      if (gradient) {
        ctx.fillStyle = gradient
        ctx.fill()
      }
    }

    function drawSmoothTrail(meteor: Meteor, ctx: CanvasRenderingContext2D) {
      // Medium quality - multiple strokes with decreasing width
      const segments = 5
      const maxWidth = Math.min(meteor.size * 4, 3)
      
      for (let seg = 0; seg < segments; seg++) {
        const segmentProgress = seg / segments
        const width = maxWidth * (1 - segmentProgress)
        const opacity = 1 - segmentProgress * 0.7
        
        ctx.lineWidth = width
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        
        const gradient = gradientCaches.meteors.getLinearGradient(
          generateGradientKey('trail_smooth', meteor.type, seg),
          meteor.x,  // From head
          meteor.y,
          meteor.trail[0].x,  // To tail
          meteor.trail[0].y,
          [
            [0, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, ${opacity})`],
            [1, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0)`]
          ]
        )
        
        if (gradient) {
          ctx.strokeStyle = gradient
          ctx.beginPath()
          ctx.moveTo(meteor.trail[0].x, meteor.trail[0].y)
          
          const step = Math.ceil(meteor.trail.length / 10)
          for (let i = step; i < meteor.trail.length; i += step) {
            ctx.lineTo(meteor.trail[i].x, meteor.trail[i].y)
          }
          
          ctx.stroke()
        }
      }
    }

    function drawSimpleTrail(meteor: Meteor, ctx: CanvasRenderingContext2D) {
      // Simple performance mode
      ctx.lineWidth = Math.min(meteor.size * 3, 2.5)
      ctx.lineCap = 'round'
      
      const gradient = gradientCaches.meteors.getLinearGradient(
        generateGradientKey('trail_simple', meteor.type),
        meteor.x,  // From head
        meteor.y,
        meteor.trail[0].x,  // To tail
        meteor.trail[0].y,
        [
          [0, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.9)`],
          [1, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0)`]
        ]
      )
      
      if (gradient) {
        ctx.strokeStyle = gradient
        ctx.beginPath()
        ctx.moveTo(meteor.trail[0].x, meteor.trail[0].y)
        
        const step = 3
        for (let i = step; i < meteor.trail.length; i += step) {
          ctx.lineTo(meteor.trail[i].x, meteor.trail[i].y)
        }
        
        ctx.stroke()
      }
    }

    // Animation loop
    let frameCount = 0
    const animate = (currentTime: number) => {
      const deltaTime = frameTimer.current.update(currentTime)
      qualityManager.current!.updateMetrics(deltaTime)
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Debug log every 60 frames
      if (frameCount++ % 60 === 0) {
        const activeMeteors = meteorsRef.current.filter(m => m.active).length
        console.log('Active meteors:', activeMeteors, '/', meteorsRef.current.length)
      }

      // Calculate speed multiplier
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

      // Spawn new meteors
      if (Math.random() < SPAWN_RATE) {
        const inactiveMeteor = meteorsRef.current.find((m) => !m.active)
        if (inactiveMeteor) {
          spawnMeteor(inactiveMeteor)
        }
      }

      // Update and draw meteors
      ctx.save()
      ctx.globalCompositeOperation = 'screen'

      meteorsRef.current.forEach((meteor) => {
        if (!meteor.active) return

        // Check visibility
        meteor.isVisible = isInViewport(
          meteor.x, 
          meteor.y, 
          50, 
          canvas.width, 
          canvas.height
        )

        // Update position from pre-calculated path
        meteor.life += speedMultiplierRef.current
        const t = Math.min(meteor.life / meteor.maxLife, 1)
        
        const newPos = interpolateBezierPoint(meteor.pathPoints, t)
        meteor.x = newPos.x
        meteor.y = newPos.y

        // Update trail
        meteor.trail.push({ x: meteor.x, y: meteor.y, opacity: 1 })
        
        const maxTrailLength = Math.floor(BASE_TRAIL_LENGTH * (0.5 + meteor.size * 0.5))
        if (meteor.trail.length > maxTrailLength) {
          meteor.trail.shift()
        }

        // Update particles if quality allows
        const settings = qualityManager.current!.getSettings()
        if (settings.meteorParticleLimit > 0 && speedMultiplierRef.current > 1.05) {
          const spawnRate = 0.3 * speedMultiplierRef.current
          if (Math.random() < spawnRate && meteor.particles.length < settings.meteorParticleLimit) {
            const particle = particlePool.current!.acquire()
            particle.x = meteor.x + (Math.random() - 0.5) * meteor.size * 4
            particle.y = meteor.y + (Math.random() - 0.5) * meteor.size * 4
            particle.vx = (Math.random() - 0.5) * 1.2 - meteor.vx * 0.5
            particle.vy = (Math.random() - 0.5) * 1.2 - meteor.vy * 0.5
            particle.life = 0
            particle.size = meteor.size * (0.15 + Math.random() * 0.25)
            particle.color = { ...meteor.color }
            particle.active = true
            meteor.particles.push(particle)
          }
        }

        // Update particles
        meteor.particles = meteor.particles.filter((particle) => {
          particle.x += particle.vx * speedMultiplierRef.current
          particle.y += particle.vy * speedMultiplierRef.current
          particle.life += speedMultiplierRef.current
          
          if (particle.life >= 60) {
            particlePool.current!.release(particle)
            return false
          }
          return true
        })

        // Check if meteor is done
        if (t >= 1 || meteor.life >= meteor.maxLife) {
          meteor.active = false
          meteor.particles.forEach(p => particlePool.current!.release(p))
          meteor.particles = []
          return
        }

        // Skip rendering if not visible
        if (!meteor.isVisible) return

        // Draw trail
        drawTaperedTrail(meteor, ctx)

        // Draw particles
        meteor.particles.forEach((particle) => {
          const particleOpacity = 1 - particle.life / 60
          
          const gradient = gradientCaches.meteors.getRadialGradient(
            generateGradientKey('particle', particle.size > 0.3 ? 'large' : 'small'),
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size * 6,
            [
              [0, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particleOpacity * 0.8})`],
              [0.5, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particleOpacity * 0.4})`],
              [1, 'rgba(0, 0, 0, 0)']
            ]
          )
          
          if (gradient) {
            ctx.fillStyle = gradient
            ctx.fillRect(
              particle.x - particle.size * 6,
              particle.y - particle.size * 6,
              particle.size * 12,
              particle.size * 12
            )
          }
        })

        // Draw meteor head with enhanced glow
        const glowBoost = speedMultiplierRef.current > 1.1 ? speedMultiplierRef.current : 1
        const glowSize = meteor.size * 15 * glowBoost  // Larger glow
        
        // Outer glow
        const outerGlow = gradientCaches.meteors.getRadialGradient(
          generateGradientKey('meteor_outer', meteor.type, Math.floor(glowBoost * 10)),
          meteor.x, meteor.y, 0,
          meteor.x, meteor.y, glowSize,
          [
            [0, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${meteor.glowIntensity * 0.5})`],
            [0.3, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${meteor.glowIntensity * 0.3})`],
            [0.6, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${meteor.glowIntensity * 0.1})`],
            [1, 'rgba(0, 0, 0, 0)']
          ]
        )
        
        if (outerGlow) {
          ctx.fillStyle = outerGlow
          ctx.fillRect(
            meteor.x - glowSize,
            meteor.y - glowSize,
            glowSize * 2,
            glowSize * 2
          )
        }
        
        // Inner bright core
        const coreSize = meteor.size * 3
        const coreGlow = gradientCaches.meteors.getRadialGradient(
          generateGradientKey('meteor_core', meteor.type),
          meteor.x, meteor.y, 0,
          meteor.x, meteor.y, coreSize,
          [
            [0, 'rgba(255, 255, 255, 1)'],  // Bright white center
            [0.3, `rgba(255, 255, 255, 0.9)`],
            [0.5, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.8)`],
            [0.8, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.4)`],
            [1, 'rgba(0, 0, 0, 0)']
          ]
        )
        
        if (coreGlow) {
          ctx.fillStyle = coreGlow
          ctx.fillRect(
            meteor.x - coreSize,
            meteor.y - coreSize,
            coreSize * 2,
            coreSize * 2
          )
        }

        // Fade out near end
        if (t > 0.9) {
          const fadeOpacity = 1 - (t - 0.9) / 0.1
          meteor.glowIntensity = (meteor.type === 'bright' ? 1.35 : 1) * fadeOpacity
        }
      })

      ctx.restore()

      animationIdRef.current = requestAnimationFrame(animate)
    }

    // Listen for quality changes
    const handleQualityChange = (e: Event) => {
      const event = e as CustomEvent
      const newSettings = event.detail.settings
      
      // Adjust meteor count
      const newCount = qualityManager.current!.getAdaptiveCount(
        newSettings.meteorCount,
        canvas.width,
        canvas.height
      )
      
      if (meteorsRef.current.length !== newCount) {
        resizeCanvas()
      }
    }
    window.addEventListener('qualityTierChanged', handleQualityChange)

    // Start animation
    animate(performance.now())

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('qualityTierChanged', handleQualityChange)
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current)
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      gradientCaches.meteors.clear()
      particlePool.current?.clear()
    }
  }, [prefersReducedMotion])

  if (prefersReducedMotion) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ 
        zIndex: 3 // Above nebula (2) but below content (10)
      }}
      aria-hidden="true"
    />
  )
}