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
  curve: number // Curve intensity for arc motion
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
      }, 100) // Consider stopped after 100ms of no movement
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
      curve: 0,
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
      
      if (spawnType < 0.6) {
        // Top spawn - anywhere across the top
        meteor.x = Math.random() * canvas.width
        meteor.y = -20
        meteor.angle = 60 + Math.random() * 60 // 60-120 degrees - always downward
      } else if (spawnType < 0.8) {
        // Left side spawn - upper portion only
        meteor.x = -20
        meteor.y = Math.random() * canvas.height * 0.3
        meteor.angle = 30 + Math.random() * 40 // 30-70 degrees - downward and right
      } else {
        // Right side spawn - upper portion only
        meteor.x = canvas.width + 20
        meteor.y = Math.random() * canvas.height * 0.3
        meteor.angle = 110 + Math.random() * 40 // 110-150 degrees - downward and left
      }

      meteor.size = 0.3 + Math.random() * 0.7 // Reduced from 0.5-2.0 to 0.3-1.0

      // Size-based speed: larger meteors = slower
      const sizeRatio = (meteor.size - 0.3) / 0.7 // Normalize size to 0-1 range
      const speed = 1.35 - sizeRatio * 0.225 // Larger size = slower: 1.35 to 1.125 (9x faster)

      const angleRad = (meteor.angle * Math.PI) / 180

      meteor.vx = Math.cos(angleRad) * speed
      meteor.vy = Math.sin(angleRad) * speed
      meteor.speed = speed
      meteor.life = 0
      
      // Set curve intensity - random between -0.15 to 0.15 for subtle horizontal drift
      meteor.curve = (Math.random() - 0.5) * 0.3

      // Calculate lifetime based on expected travel distance
      const maxTravelDistance = Math.max(canvas.width, canvas.height) * 1.5
      meteor.maxLife = Math.floor(maxTravelDistance / speed) // Frames needed to travel off screen

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
      const interactionTime = Date.now()
      let speedMultiplier = 1

      // Single acceleration source - click boost blocks all other boosts
      const timeSinceClick = interactionTime - clickBoostRef.current
      const isClickBoostActive = timeSinceClick < 600

      if (isClickBoostActive) {
        // Click boost active: 1.15x speed that decays to 1x over 600ms
        const clickDecay = 1 - timeSinceClick / 600
        speedMultiplier = 1 + 0.15 * clickDecay // 1.15x → 1x smooth decay
      } else if (isMovingRef.current) {
        // Mouse/scroll boost ONLY when click boost is completely finished
        speedMultiplier = 1.15 // Consistent 1.15x speed while moving
      }
      // else speedMultiplier stays at 1 (no interaction)

      // Smooth transition for speed changes to prevent bounce-back
      const targetSpeed = speedMultiplier
      speedMultiplierRef.current += (targetSpeed - speedMultiplierRef.current) * 0.2

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

        // Apply horizontal curve only to ensure downward movement
        const curveOffset = meteor.curve * meteor.life * 0.01
        
        // Update position with speed multiplier and horizontal curve
        meteor.x += meteor.vx * speedMultiplierRef.current + curveOffset
        meteor.y += meteor.vy * speedMultiplierRef.current

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
        let spawnRate = 0.35
        let minRange = 15
        if (speedMultiplierRef.current > 1.005) {
          spawnRate += speedMultiplierRef.current * 20
          minRange += speedMultiplierRef.current * 20
        }
        const maxParticles = Math.min(minRange, 120) // Cap at 120

        if (Math.random() < spawnRate && meteor.particles.length < maxParticles) {
          const baseSparkleCount = meteor.type === 'bright' ? 2 : 1
          const speedBasedSparkleCount = Math.floor(
            baseSparkleCount * Math.min(speedMultiplierRef.current, 2)
          ) // More particles when fast
          for (let i = 0; i < speedBasedSparkleCount; i++) {
            meteor.particles.push({
              x: meteor.x + (Math.random() - 0.5) * meteor.size * 4, // Wider spawn area
              y: meteor.y + (Math.random() - 0.5) * meteor.size * 4, // Wider spawn area
              vx: (Math.random() - 0.5) * 1.2 - meteor.vx * 0.3, // Adjusted for 9x speed meteors
              vy: (Math.random() - 0.5) * 1.2 - meteor.vy * 0.3, // Adjusted for 9x speed meteors
              life: 0,
              size: meteor.size * (0.15 + Math.random() * 0.25),
              color: { ...meteor.color },
            })
          }
        }

        // Update particles
        meteor.particles = meteor.particles.filter((particle) => {
          particle.x += particle.vx
          particle.y += particle.vy
          particle.life++
          return particle.life < 60 // Extended particle life for better spread visibility
        })

        // Update life
        meteor.life++
        const lifeRatio = meteor.life / meteor.maxLife

        // Deactivate only when truly off screen with margin
        const margin = 100 + meteor.size * 20 // Larger margin for glow
        if (
          meteor.x < -margin ||
          meteor.x > canvas.width + margin ||
          meteor.y > canvas.height + margin ||
          meteor.life > meteor.maxLife
        ) {
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

        // Outer glow
        const glowSize = meteor.type === 'bright' ? meteor.size * 15 : meteor.size * 10
        const glowGradient = ctx.createRadialGradient(
          meteor.x,
          meteor.y,
          0,
          meteor.x,
          meteor.y,
          glowSize
        )
        glowGradient.addColorStop(
          0,
          `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${meteor.glowIntensity})`
        )
        glowGradient.addColorStop(
          0.2,
          `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${meteor.glowIntensity * 0.6})`
        )
        glowGradient.addColorStop(
          0.4,
          `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${meteor.glowIntensity * 0.3})`
        )
        glowGradient.addColorStop(
          0.7,
          `rgba(${meteor.glowColor.r * 0.8}, ${meteor.glowColor.g * 0.8}, ${meteor.glowColor.b * 0.8}, ${meteor.glowIntensity * 0.1})`
        )
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

        ctx.fillStyle = glowGradient
        ctx.fillRect(meteor.x - glowSize, meteor.y - glowSize, glowSize * 2, glowSize * 2)

        // Inner core
        const coreSize =
          meteor.type === 'bright' ? 3.0 + meteor.size * 2.5 : 2.5 + meteor.size * 2.0
        const coreGradient = ctx.createRadialGradient(
          meteor.x,
          meteor.y,
          0,
          meteor.x,
          meteor.y,
          coreSize
        )

        if (meteor.type === 'warm') {
          coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
          coreGradient.addColorStop(0.3, `rgba(255, 245, 230, 0.9)`)
          coreGradient.addColorStop(
            0.6,
            `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.7)`
          )
          coreGradient.addColorStop(
            1,
            `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, 0)`
          )
        } else if (meteor.type === 'cool') {
          coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
          coreGradient.addColorStop(0.3, `rgba(240, 248, 255, 0.9)`)
          coreGradient.addColorStop(
            0.6,
            `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.7)`
          )
          coreGradient.addColorStop(
            1,
            `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, 0)`
          )
        } else {
          // Bright type
          coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
          coreGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.9)')
          coreGradient.addColorStop(
            0.7,
            `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.6)`
          )
          coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
        }

        ctx.fillStyle = coreGradient
        ctx.beginPath()
        ctx.arc(meteor.x, meteor.y, coreSize, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()

        // Only fade out when very close to screen edge or end of life
        const edgeDistance = Math.min(
          meteor.x + margin,
          canvas.width + margin - meteor.x,
          canvas.height + margin - meteor.y
        )

        if (edgeDistance < 50 || lifeRatio > 0.9) {
          const fadeOpacity = edgeDistance < 50 ? edgeDistance / 50 : 1 - (lifeRatio - 0.9) / 0.1

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
