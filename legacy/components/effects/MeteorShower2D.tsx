'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

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
  startX: number // Starting X position
  startY: number // Starting Y position
  endX: number // Predetermined end X position at bottom
  endY: number // Predetermined end Y position at bottom
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
}

const METEOR_COUNT = 20
const BASE_TRAIL_LENGTH = 34 // Base trail length, reduced by 15%
const SPAWN_RATE = 0.06 // Increased spawn rate for very fast meteors

export default function MeteorShower2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const meteorsRef = useRef<Meteor[]>([])
  const animationIdRef = useRef<number>()
  const prefersReducedMotion = useReducedMotion()

  // Mouse interaction state for speed control
  const speedMultiplierRef = useRef(1)
  const isMovingRef = useRef(false)
  const clickBoostRef = useRef(0)
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (prefersReducedMotion) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Mouse interaction handlers for speed control
    const handleMouseMove = () => {
      if (!isMovingRef.current) {
        isMovingRef.current = true
      }

      // Clear existing timeout and set new one
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current)
      }

      mouseMoveTimeoutRef.current = setTimeout(() => {
        isMovingRef.current = false
      }, 150) // Consider stopped after 150ms of no movement
    }

    const handleClick = () => {
      // Add click boost that decays over 600ms
      clickBoostRef.current = Date.now()
    }

    const handleScroll = () => {
      // Treat scroll like mouse movement
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
    }))

    // Spawn a meteor
    const spawnMeteor = (meteor: Meteor) => {
      const spawnType = Math.random()
      const centerX = canvas.width / 2
      const bottomY = canvas.height + 50

      // ALGORITHM: Predetermine EXACT end position at spawn time

      if (spawnType < 0.8) {
        // Top spawn - distributed across top (80% of meteors)
        meteor.startX = Math.random() * canvas.width
        meteor.startY = -20

        // Determine which side of center
        const isLeftSide = meteor.startX < centerX
        const distanceFromCenter = Math.abs(meteor.startX - centerX)
        const canCross = distanceFromCenter < centerX * 0.1 // Within 10% of center

        // CALCULATE EXACT END POSITION
        if (canCross) {
          // Can cross center by up to 15%
          const crossAmount = centerX * 0.15
          meteor.endX = isLeftSide
            ? centerX + Math.random() * crossAmount
            : centerX - Math.random() * crossAmount
        } else {
          // MUST NOT CROSS CENTER
          if (isLeftSide) {
            // Left side: converge toward center but stop before
            const maxEndX = centerX - 10 // Hard boundary
            const minEndX = meteor.startX // Can't go backwards
            const idealEndX = meteor.startX + distanceFromCenter * 0.6 // Travel 60% toward center
            meteor.endX = Math.min(maxEndX, minEndX + Math.random() * (idealEndX - minEndX))
          } else {
            // Right side: converge toward center but stop after
            const minEndX = centerX + 10 // Hard boundary
            const maxEndX = meteor.startX // Can't go backwards
            const idealEndX = meteor.startX - distanceFromCenter * 0.6 // Travel 60% toward center
            meteor.endX = Math.max(minEndX, maxEndX - Math.random() * (maxEndX - idealEndX))
          }
        }
      } else if (spawnType < 0.9) {
        // Left side spawn (10% of meteors)
        meteor.startX = -20
        meteor.startY = Math.random() * canvas.height * 0.3

        // MUST END LEFT OF CENTER
        meteor.endX = centerX * 0.2 + Math.random() * centerX * 0.6 // 10-40% of screen width
      } else {
        // Right side spawn (10% of meteors)
        meteor.startX = canvas.width + 20
        meteor.startY = Math.random() * canvas.height * 0.3

        // MUST END RIGHT OF CENTER
        meteor.endX = centerX * 1.2 + Math.random() * centerX * 0.6 // 60-90% of screen width
      }

      // Set end Y and initial position
      meteor.endY = bottomY
      meteor.x = meteor.startX
      meteor.y = meteor.startY

      meteor.size = 0.3 + Math.random() * 0.7 // Reduced from 0.5-2.0 to 0.3-1.0

      // Size-based speed: larger meteors = slower
      const sizeRatio = (meteor.size - 0.3) / 0.7 // Normalize size to 0-1 range
      const speed = 1.35 - sizeRatio * 0.225 // Larger size = slower: 1.35 to 1.125 (9x faster)
      meteor.speed = speed

      // Calculate total distance for this predetermined path
      const dx = meteor.endX - meteor.startX
      const dy = meteor.endY - meteor.startY
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Calculate lifetime based on distance and speed
      meteor.maxLife = Math.floor(distance / speed)
      meteor.life = 0

      // Calculate initial angle for visual reference
      meteor.angle = (Math.atan2(dy, dx) * 180) / Math.PI

      // Set initial velocity for first frame particles
      const angleRad = (meteor.angle * Math.PI) / 180
      meteor.vx = Math.cos(angleRad) * speed
      meteor.vy = Math.sin(angleRad) * speed

      meteor.trail = []
      meteor.particles = []

      // Dynamic color types
      const typeRandom = Math.random()
      if (typeRandom < 0.4) {
        // Cool type - white/blue
        meteor.type = 'cool'
        meteor.color = { r: 220, g: 240, b: 255 }
        meteor.glowColor = { r: 150, g: 200, b: 255 }
        meteor.glowIntensity = 0.8 + Math.random() * 0.3
      } else if (typeRandom < 0.7) {
        // Warm type - orange/red
        meteor.type = 'warm'
        meteor.color = { r: 255, g: 200, b: 150 }
        meteor.glowColor = { r: 255, g: 150, b: 100 }
        meteor.glowIntensity = 0.9 + Math.random() * 0.4
      } else {
        // Bright type - intense white
        meteor.type = 'bright'
        meteor.color = { r: 255, g: 255, b: 255 }
        meteor.glowColor = { r: 200, g: 220, b: 255 }
        meteor.glowIntensity = 1.2 + Math.random() * 0.3
        meteor.size *= 1.3 // Bigger for visibility at high speed
      }

      meteor.active = true
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Calculate speed multiplier based on mouse interaction
      const currentTime = Date.now()
      let targetMultiplier = 1

      // Check for active interactions
      const timeSinceClick = currentTime - clickBoostRef.current
      const isClickActive = timeSinceClick < 600 && clickBoostRef.current > 0

      if (isClickActive) {
        // Click boost with smooth decay
        const decay = 1 - timeSinceClick / 600
        targetMultiplier = 1 + 1.5 * decay // 2.5x → 1x over 600ms
      } else if (isMovingRef.current) {
        // Mouse/scroll movement boost
        targetMultiplier = 1.8 // 1.8x speed while moving
      }

      // Smooth transition to prevent jumps
      const smoothingFactor = 0.15
      speedMultiplierRef.current +=
        (targetMultiplier - speedMultiplierRef.current) * smoothingFactor

      // Ensure exact 1.0 when no interactions
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

      // Update and draw meteors
      meteorsRef.current.forEach((meteor) => {
        if (!meteor.active) return

        // Store previous position for velocity calculation
        const prevX = meteor.x
        const prevY = meteor.y

        // Update life progress with speed multiplier
        meteor.life += speedMultiplierRef.current
        const t = Math.min(meteor.life / meteor.maxLife, 1) // Progress from 0 to 1, capped at 1

        // Use quadratic Bezier curve for smooth arc
        // Control point creates the curve
        const isLeftSide = meteor.startX < canvas.width / 2
        const controlX = isLeftSide
          ? meteor.startX + (meteor.endX - meteor.startX) * 0.8 // Left side curves right
          : meteor.startX + (meteor.endX - meteor.startX) * 0.2 // Right side curves left
        const controlY = meteor.startY + (meteor.endY - meteor.startY) * 0.6

        // Quadratic Bezier interpolation
        const oneMinusT = 1 - t
        meteor.x =
          oneMinusT * oneMinusT * meteor.startX + 2 * oneMinusT * t * controlX + t * t * meteor.endX

        meteor.y =
          oneMinusT * oneMinusT * meteor.startY + 2 * oneMinusT * t * controlY + t * t * meteor.endY

        // Calculate current velocity for particles
        meteor.vx = meteor.x - prevX
        meteor.vy = meteor.y - prevY

        // Update trail
        meteor.trail.unshift({
          x: meteor.x,
          y: meteor.y,
          opacity: 1,
        })

        // Size-based trail length: larger meteors have longer trails but capped
        const trailMultiplier = Math.min(0.5 + meteor.size, 1.2) // Cap at 1.2x for large meteors
        const meteorTrailLength = Math.floor(BASE_TRAIL_LENGTH * trailMultiplier)

        // Limit trail length
        if (meteor.trail.length > meteorTrailLength) {
          meteor.trail.pop()
        }

        // Update trail opacity
        meteor.trail.forEach((point, i) => {
          point.opacity = 1 - i / meteorTrailLength
        })

        // Generate sparkle particles (more when speed is accelerated)
        const baseSpawnRate = 0.35
        const baseMaxParticles = 15

        // Increase particle generation when accelerated
        const particleBoost = speedMultiplierRef.current > 1.05 ? speedMultiplierRef.current : 1
        const spawnRate = baseSpawnRate * particleBoost
        const maxParticles = Math.floor(baseMaxParticles * particleBoost * 2) // More capacity when fast

        if (Math.random() < spawnRate && meteor.particles.length < maxParticles) {
          const baseSparkleCount = meteor.type === 'bright' ? 2 : 1
          const sparkleCount = Math.ceil(baseSparkleCount * particleBoost)

          for (let i = 0; i < sparkleCount; i++) {
            meteor.particles.push({
              x: meteor.x + (Math.random() - 0.5) * meteor.size * 4, // Wider spawn area
              y: meteor.y + (Math.random() - 0.5) * meteor.size * 4, // Wider spawn area
              vx: (Math.random() - 0.5) * 1.2 - meteor.vx * 0.5, // Trail behind meteor
              vy: (Math.random() - 0.5) * 1.2 - meteor.vy * 0.5, // Trail behind meteor
              life: 0,
              size: meteor.size * (0.15 + Math.random() * 0.25),
              color: { ...meteor.color },
            })
          }
        }

        // Update particles with speed multiplier
        meteor.particles = meteor.particles.filter((particle) => {
          particle.x += particle.vx * speedMultiplierRef.current
          particle.y += particle.vy * speedMultiplierRef.current
          particle.life += speedMultiplierRef.current
          return particle.life < 60 // Extended particle life for better spread visibility
        })

        // Check life ratio
        const lifeRatio = t

        // Deactivate when reached end of predetermined path
        if (t >= 1 || meteor.life >= meteor.maxLife) {
          meteor.active = false
          return
        }

        // Draw trail
        if (meteor.trail.length > 1) {
          ctx.save()

          // Create gradient along trail
          const gradient = ctx.createLinearGradient(
            meteor.trail[meteor.trail.length - 1].x,
            meteor.trail[meteor.trail.length - 1].y,
            meteor.x,
            meteor.y
          )

          gradient.addColorStop(
            0,
            `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, 0)`
          )
          gradient.addColorStop(
            0.2,
            `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.3)`
          )
          gradient.addColorStop(
            0.5,
            `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.6)`
          )
          gradient.addColorStop(
            1,
            `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.9)`
          )

          ctx.strokeStyle = gradient
          ctx.lineWidth = Math.min(meteor.size * 3, 2.5) // Cap thickness at 2.5 for large meteors
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.globalCompositeOperation = 'screen'

          // Draw smooth trail using quadratic curves
          ctx.beginPath()
          ctx.moveTo(meteor.trail[0].x, meteor.trail[0].y)

          for (let i = 1; i < meteor.trail.length - 1; i++) {
            const xc = (meteor.trail[i].x + meteor.trail[i + 1].x) / 2
            const yc = (meteor.trail[i].y + meteor.trail[i + 1].y) / 2
            ctx.quadraticCurveTo(meteor.trail[i].x, meteor.trail[i].y, xc, yc)
          }

          ctx.stroke()
          ctx.restore()
        }

        // Draw meteor head with glow
        ctx.save()
        ctx.globalCompositeOperation = 'screen'

        // Draw particles first (behind meteor)
        meteor.particles.forEach((particle) => {
          const particleOpacity = 1 - particle.life / 60 // Match extended particle life
          ctx.save()
          ctx.globalCompositeOperation = 'screen'

          // Enhanced particle glow - multiple layers for stronger effect

          // Outer glow (large, soft)
          const outerGlow = ctx.createRadialGradient(
            particle.x,
            particle.y,
            0,
            particle.x,
            particle.y,
            particle.size * 8
          )
          outerGlow.addColorStop(
            0,
            `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particleOpacity * 0.6})`
          )
          outerGlow.addColorStop(
            0.3,
            `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particleOpacity * 0.4})`
          )
          outerGlow.addColorStop(
            0.6,
            `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particleOpacity * 0.2})`
          )
          outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')

          ctx.fillStyle = outerGlow
          ctx.fillRect(
            particle.x - particle.size * 8,
            particle.y - particle.size * 8,
            particle.size * 16,
            particle.size * 16
          )

          // Inner glow (medium, brighter)
          const innerGlow = ctx.createRadialGradient(
            particle.x,
            particle.y,
            0,
            particle.x,
            particle.y,
            particle.size * 4
          )
          innerGlow.addColorStop(
            0,
            `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particleOpacity * 0.8})`
          )
          innerGlow.addColorStop(
            0.4,
            `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particleOpacity * 0.6})`
          )
          innerGlow.addColorStop(
            0.8,
            `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particleOpacity * 0.3})`
          )
          innerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')

          ctx.fillStyle = innerGlow
          ctx.fillRect(
            particle.x - particle.size * 4,
            particle.y - particle.size * 4,
            particle.size * 8,
            particle.size * 8
          )

          // Particle core with enhanced brightness
          const coreGradient = ctx.createRadialGradient(
            particle.x,
            particle.y,
            0,
            particle.x,
            particle.y,
            particle.size * 1.5
          )
          coreGradient.addColorStop(0, `rgba(255, 255, 255, ${particleOpacity})`)
          coreGradient.addColorStop(
            0.4,
            `rgba(${particle.color.r + 30}, ${particle.color.g + 30}, ${particle.color.b + 30}, ${particleOpacity * 0.9})`
          )
          coreGradient.addColorStop(
            0.8,
            `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particleOpacity * 0.6})`
          )
          coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

          ctx.fillStyle = coreGradient
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size * 1.5, 0, Math.PI * 2)
          ctx.fill()

          ctx.restore()
        })

        // Outer glow - increase size when accelerating (more for smaller meteors)
        // Small meteors (0.3) get 2.0x boost factor, large meteors (1.3) get 0.3x boost factor
        const sizeNormalized = (meteor.size - 0.3) / 1.0 // 0 to 1 range
        const sizeBasedBoostFactor = 2.0 - sizeNormalized * 1.7 // 2.0 to 0.3
        const glowBoost =
          speedMultiplierRef.current > 1.1
            ? 1 + (speedMultiplierRef.current - 1) * sizeBasedBoostFactor
            : 1

        const baseGlowSize = meteor.type === 'bright' ? meteor.size * 15 : meteor.size * 10
        const glowSize = baseGlowSize * glowBoost
        const glowGradient = ctx.createRadialGradient(
          meteor.x,
          meteor.y,
          0,
          meteor.x,
          meteor.y,
          glowSize
        )
        // Boost glow intensity when accelerating (more for smaller meteors)
        const intensityBoostFactor = 1.5 - sizeNormalized * 1.2 // 1.5 to 0.3 for intensity
        const intensityBoost =
          speedMultiplierRef.current > 1.1
            ? 1 + (speedMultiplierRef.current - 1) * intensityBoostFactor
            : 1
        const boostedIntensity = Math.min(meteor.glowIntensity * intensityBoost, 3.0) // Cap at 3x intensity

        glowGradient.addColorStop(
          0,
          `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${boostedIntensity})`
        )
        glowGradient.addColorStop(
          0.2,
          `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${boostedIntensity * 0.6})`
        )
        glowGradient.addColorStop(
          0.4,
          `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${boostedIntensity * 0.3})`
        )
        glowGradient.addColorStop(
          0.7,
          `rgba(${meteor.glowColor.r * 0.8}, ${meteor.glowColor.g * 0.8}, ${meteor.glowColor.b * 0.8}, ${boostedIntensity * 0.1})`
        )
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

        ctx.fillStyle = glowGradient
        ctx.fillRect(meteor.x - glowSize, meteor.y - glowSize, glowSize * 2, glowSize * 2)

        // Inner core - also boost size when accelerating (more for smaller meteors)
        const coreSizeBoostFactor = 0.8 - sizeNormalized * 0.6 // 0.8 to 0.2 for core
        const coreSizeBoost =
          speedMultiplierRef.current > 1.1
            ? 1 + (speedMultiplierRef.current - 1) * coreSizeBoostFactor
            : 1
        const baseCoreSize =
          meteor.type === 'bright' ? 3.0 + meteor.size * 2.5 : 2.5 + meteor.size * 2.0
        const coreSize = baseCoreSize * coreSizeBoost
        const coreGradient = ctx.createRadialGradient(
          meteor.x,
          meteor.y,
          0,
          meteor.x,
          meteor.y,
          coreSize
        )

        // Make core brighter when accelerating (more for smaller meteors)
        const brightBoostFactor = 0.6 - sizeNormalized * 0.45 // 0.6 to 0.15 for brightness
        const brightBoost =
          speedMultiplierRef.current > 1.1
            ? 1 + (speedMultiplierRef.current - 1) * brightBoostFactor
            : 1

        if (meteor.type === 'warm') {
          coreGradient.addColorStop(0, `rgba(255, 255, 255, ${brightBoost})`)
          coreGradient.addColorStop(0.3, `rgba(255, 245, 230, ${0.9 * brightBoost})`)
          coreGradient.addColorStop(
            0.6,
            `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, ${0.7 * brightBoost})`
          )
          coreGradient.addColorStop(
            1,
            `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, 0)`
          )
        } else if (meteor.type === 'cool') {
          coreGradient.addColorStop(0, `rgba(255, 255, 255, ${brightBoost})`)
          coreGradient.addColorStop(0.3, `rgba(240, 248, 255, ${0.9 * brightBoost})`)
          coreGradient.addColorStop(
            0.6,
            `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, ${0.7 * brightBoost})`
          )
          coreGradient.addColorStop(
            1,
            `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, 0)`
          )
        } else {
          // Bright type
          coreGradient.addColorStop(0, `rgba(255, 255, 255, ${brightBoost})`)
          coreGradient.addColorStop(0.4, `rgba(255, 255, 255, ${0.9 * brightBoost})`)
          coreGradient.addColorStop(
            0.7,
            `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, ${0.6 * brightBoost})`
          )
          coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
        }

        ctx.fillStyle = coreGradient
        ctx.beginPath()
        ctx.arc(meteor.x, meteor.y, coreSize, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()

        // Fade out near end of life
        if (lifeRatio > 0.9) {
          const fadeOpacity = 1 - (lifeRatio - 0.9) / 0.1

          // Preserve type-based intensity while fading
          const baseIntensity =
            meteor.type === 'bright' ? 1.35 : meteor.type === 'warm' ? 1.1 : 0.95
          meteor.glowIntensity = baseIntensity * fadeOpacity
        }
      })

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
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current)
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
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
