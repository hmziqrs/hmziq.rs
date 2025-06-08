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
const TRAIL_LENGTH = 30 // Longer trails for slower meteors
const SPAWN_RATE = 0.035 // Higher spawn rate since meteors are slower

export default function MeteorShower2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const meteorsRef = useRef<Meteor[]>([])
  const animationIdRef = useRef<number>()
  const prefersReducedMotion = useReducedMotion()

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
      color: { r: 255, g: 255, b: 255 },
      glowColor: { r: 255, g: 255, b: 255 },
      glowIntensity: 1,
      active: false,
      type: 'cool',
      particles: []
    }))

    // Spawn a meteor
    const spawnMeteor = (meteor: Meteor) => {
      const side = Math.random() < 0.7 ? 'top' : 'right'
      
      if (side === 'top') {
        meteor.x = Math.random() * canvas.width
        meteor.y = -10
        meteor.angle = 45 + Math.random() * 30 // 45-75 degrees
      } else {
        meteor.x = canvas.width + 10
        meteor.y = Math.random() * canvas.height * 0.5
        meteor.angle = 135 + Math.random() * 30 // 135-165 degrees
      }

      const speed = 0.8 + Math.random() * 1.2 // Further reduced to 0.8-2.0
      const angleRad = (meteor.angle * Math.PI) / 180
      
      meteor.vx = Math.cos(angleRad) * speed
      meteor.vy = Math.sin(angleRad) * speed
      meteor.speed = speed
      meteor.size = 0.3 + Math.random() * 0.7 // Reduced from 0.5-2.0 to 0.3-1.0
      meteor.life = 0
      
      // Calculate lifetime based on screen diagonal distance and speed
      const screenDiagonal = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height)
      const travelDistance = screenDiagonal * 1.5 // Extra margin to ensure it goes off screen
      meteor.maxLife = Math.floor(travelDistance / speed) + 60 // Extra frames for margin
      
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
        meteor.size *= 1.2 // Slightly bigger, but not too much
      }
      
      meteor.active = true
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Spawn new meteors
      if (Math.random() < SPAWN_RATE) {
        const inactiveMeteor = meteorsRef.current.find(m => !m.active)
        if (inactiveMeteor) {
          spawnMeteor(inactiveMeteor)
        }
      }

      // Update and draw meteors
      meteorsRef.current.forEach(meteor => {
        if (!meteor.active) return

        // Update position
        meteor.x += meteor.vx
        meteor.y += meteor.vy
        
        // Add very slight gravity effect for natural arc
        meteor.vy += 0.01 // Minimal gravity for slow, graceful movement

        // Update trail
        meteor.trail.unshift({
          x: meteor.x,
          y: meteor.y,
          opacity: 1
        })

        // Limit trail length
        if (meteor.trail.length > TRAIL_LENGTH) {
          meteor.trail.pop()
        }

        // Update trail opacity
        meteor.trail.forEach((point, i) => {
          point.opacity = 1 - (i / TRAIL_LENGTH)
        })

        // Generate sparkle particles
        if (Math.random() < 0.2 && meteor.particles.length < 15) { // Less frequent for slower meteors
          const sparkleCount = meteor.type === 'bright' ? 2 : 1
          for (let i = 0; i < sparkleCount; i++) {
            meteor.particles.push({
              x: meteor.x + (Math.random() - 0.5) * meteor.size * 2,
              y: meteor.y + (Math.random() - 0.5) * meteor.size * 2,
              vx: (Math.random() - 0.5) * 0.3 - meteor.vx * 0.05,
              vy: (Math.random() - 0.5) * 0.3 - meteor.vy * 0.05,
              life: 0,
              size: meteor.size * (0.15 + Math.random() * 0.25),
              color: { ...meteor.color }
            })
          }
        }

        // Update particles
        meteor.particles = meteor.particles.filter(particle => {
          particle.x += particle.vx
          particle.y += particle.vy
          particle.vy += 0.005 // Very light gravity for particles
          particle.life++
          return particle.life < 40 // Longer particle life
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
          
          gradient.addColorStop(0, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, 0)`)
          gradient.addColorStop(0.3, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.2)`)
          gradient.addColorStop(0.7, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.5)`)
          gradient.addColorStop(1, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.8)`)

          ctx.strokeStyle = gradient
          ctx.lineWidth = meteor.size * 2
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
        meteor.particles.forEach(particle => {
          const particleOpacity = 1 - (particle.life / 40) // Match longer particle life
          ctx.save()
          ctx.globalCompositeOperation = 'screen'
          
          // Particle glow
          const particleGlow = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size * 3
          )
          particleGlow.addColorStop(0, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particleOpacity})`)
          particleGlow.addColorStop(0.5, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particleOpacity * 0.5})`)
          particleGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
          
          ctx.fillStyle = particleGlow
          ctx.fillRect(
            particle.x - particle.size * 3,
            particle.y - particle.size * 3,
            particle.size * 6,
            particle.size * 6
          )
          
          // Particle core
          ctx.fillStyle = `rgba(255, 255, 255, ${particleOpacity * 0.8})`
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
          
          ctx.restore()
        })
        
        // Outer glow
        const glowSize = meteor.type === 'bright' ? meteor.size * 15 : meteor.size * 10
        const glowGradient = ctx.createRadialGradient(
          meteor.x, meteor.y, 0,
          meteor.x, meteor.y, glowSize
        )
        glowGradient.addColorStop(0, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${meteor.glowIntensity})`)
        glowGradient.addColorStop(0.2, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${meteor.glowIntensity * 0.6})`)
        glowGradient.addColorStop(0.4, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${meteor.glowIntensity * 0.3})`)
        glowGradient.addColorStop(0.7, `rgba(${meteor.glowColor.r * 0.8}, ${meteor.glowColor.g * 0.8}, ${meteor.glowColor.b * 0.8}, ${meteor.glowIntensity * 0.1})`)
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
        
        ctx.fillStyle = glowGradient
        ctx.fillRect(
          meteor.x - glowSize,
          meteor.y - glowSize,
          glowSize * 2,
          glowSize * 2
        )
        
        // Inner core
        const coreSize = meteor.type === 'bright' ? meteor.size * 4 : meteor.size * 3
        const coreGradient = ctx.createRadialGradient(
          meteor.x, meteor.y, 0,
          meteor.x, meteor.y, coreSize
        )
        
        if (meteor.type === 'warm') {
          coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
          coreGradient.addColorStop(0.3, `rgba(255, 245, 230, 0.9)`)
          coreGradient.addColorStop(0.6, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.7)`)
          coreGradient.addColorStop(1, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, 0)`)
        } else if (meteor.type === 'cool') {
          coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
          coreGradient.addColorStop(0.3, `rgba(240, 248, 255, 0.9)`)
          coreGradient.addColorStop(0.6, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.7)`)
          coreGradient.addColorStop(1, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, 0)`)
        } else {
          // Bright type
          coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
          coreGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.9)')
          coreGradient.addColorStop(0.7, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.6)`)
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
          const fadeOpacity = edgeDistance < 50 
            ? edgeDistance / 50 
            : (1 - (lifeRatio - 0.9) / 0.1)
          
          // Preserve type-based intensity while fading
          const baseIntensity = meteor.type === 'bright' ? 1.35 
            : meteor.type === 'warm' ? 1.1 
            : 0.95
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