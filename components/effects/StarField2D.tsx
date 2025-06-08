'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface Star {
  x: number
  y: number
  z: number
  initialX: number
  initialY: number
  initialZ: number
  size: number
  color: { r: number; g: number; b: number }
  brightness: number
  canSparkle: boolean
  sparkleOffset: number
}

const STAR_COUNT = 2000

export default function StarField2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const animationIdRef = useRef<number>()
  const timeRef = useRef(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    // Initialize star field with seeded random for consistency
    const initializeStars = (width: number, height: number) => {
      const stars: Star[] = []
      
      // Use the same deterministic seed function as 3D version
      const seed = (i: number) => {
        let x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
        return x - Math.floor(x)
      }
      
      for (let i = 0; i < STAR_COUNT; i++) {
        // Position - using deterministic pseudo-random based on index
        const radius = 50 + seed(i) * 100
        const theta = seed(i + 1000) * Math.PI * 2
        const phi = Math.acos(2 * seed(i + 2000) - 1)
        
        // Convert spherical to 2D projection
        const x = radius * Math.sin(phi) * Math.cos(theta) + width / 2
        const y = radius * Math.sin(phi) * Math.sin(theta) + height / 2
        const z = radius * Math.cos(phi)
        
        // Colors - exact same as 3D version
        const colorChoice = seed(i + 3000)
        let color
        if (colorChoice < 0.5) {
          // White stars (most common)
          color = { r: 255, g: 255, b: 255 }
        } else if (colorChoice < 0.7) {
          // Blue stars - exact colors from 3D
          color = { r: 153, g: 204, b: 255 } // 0.6, 0.8, 1.0
        } else if (colorChoice < 0.85) {
          // Orange/yellow stars - exact colors from 3D
          color = { r: 255, g: 204, b: 102 } // 1.0, 0.8, 0.4
        } else {
          // Purple stars - exact colors from 3D
          color = { r: 204, g: 153, b: 255 } // 0.8, 0.6, 1.0
        }
        
        // Sizes - exact same distribution as 3D
        const sizeRandom = seed(i + 4000)
        let size
        if (sizeRandom < 0.7) {
          // Small stars (70%)
          size = 1 + seed(i + 5000) * 1.5
        } else {
          // Medium stars (30%)
          size = 2.5 + seed(i + 6000) * 2
        }
        
        stars.push({
          x,
          y,
          z,
          initialX: x - width / 2,
          initialY: y - height / 2,
          initialZ: z,
          size,
          color,
          brightness: 0.8 + seed(i + 7000) * 0.2,
          canSparkle: size > 3 && seed(i + 8000) < 0.4, // Larger stars can sparkle
          sparkleOffset: seed(i + 9000) * 40 // Random offset for sparkle timing
        })
      }
      
      starsRef.current = stars
    }

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      
      // Initialize stars on first resize
      if (starsRef.current.length === 0) {
        initializeStars(canvas.width, canvas.height)
      }
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Animation loop
    let lastTime = 0
    const animate = (currentTime: number) => {
      // Limit to 60 FPS
      if (currentTime - lastTime < 16) {
        animationIdRef.current = requestAnimationFrame(animate)
        return
      }
      lastTime = currentTime
      
      // Clear canvas
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Update time to match shader uniform
      const elapsedTime = currentTime / 1000
      
      // Apply 3D-style rotation transformation
      const rotationX = elapsedTime * 0.02
      const rotationY = elapsedTime * 0.01
      
      // Update and draw stars
      starsRef.current.forEach((star, index) => {
        // Apply 3D rotation (simulate X and Y rotation)
        const cosX = Math.cos(rotationX)
        const sinX = Math.sin(rotationX)
        const cosY = Math.cos(rotationY)
        const sinY = Math.sin(rotationY)
        
        // Rotate around Y axis first
        let x1 = star.initialX * cosY - star.initialZ * sinY
        let z1 = star.initialX * sinY + star.initialZ * cosY
        let y1 = star.initialY
        
        // Then rotate around X axis
        let y2 = y1 * cosX - z1 * sinX
        let z2 = y1 * sinX + z1 * cosX
        
        // Project to 2D
        const perspective = 300 / (300 + z2)
        star.x = centerX + x1 * perspective
        star.y = centerY + y2 * perspective
        
        // Calculate point size based on perspective
        const pointSize = star.size * perspective
        
        // Match shader twinkle effect
        const twinkleBase = Math.sin(elapsedTime * 3.0 + star.initialX * 10.0 + star.initialY * 10.0) * 0.3 + 0.7
        
        // Sparkle effect - match shader exactly
        const sparklePhase = Math.sin(elapsedTime * 15.0 + star.initialX * 20.0 + star.initialY * 30.0 + star.initialZ * 40.0 + star.sparkleOffset)
        let sparkle = 0
        if (sparklePhase > 0.98) {
          sparkle = Math.pow((sparklePhase - 0.98) / 0.02, 2.0) * 3.0
        }
        
        const twinkle = twinkleBase + sparkle
        const alpha = star.brightness * twinkle
        
        // Draw based on size
        if (pointSize < 2) {
          // Small stars - simple dots
          ctx.fillStyle = `rgba(${star.color.r}, ${star.color.g}, ${star.color.b}, ${alpha})`
          ctx.fillRect(star.x - pointSize/2, star.y - pointSize/2, pointSize, pointSize)
        } else {
          // Larger stars with glow
          const glowFactor = pointSize / 10.0
          const glowSize = pointSize * 3
          
          // Main glow
          const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowSize)
          const glowIntensity = 0.8 * glowFactor
          
          gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
          gradient.addColorStop(0.4, `rgba(${star.color.r}, ${star.color.g}, ${star.color.b}, ${alpha * 0.8})`)
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
          
          ctx.fillStyle = gradient
          ctx.fillRect(star.x - glowSize, star.y - glowSize, glowSize * 2, glowSize * 2)
          
          // Draw sparkle rays if active
          if (sparkle > 0.1 && star.canSparkle) {
            ctx.save()
            ctx.globalCompositeOperation = 'screen'
            
            // Create 8-ray pattern like the shader
            const spikeAlpha = sparkle * 0.5
            ctx.globalAlpha = spikeAlpha
            
            for (let i = 0; i < 8; i++) {
              const angle = (i * Math.PI) / 4
              const rayLength = glowSize * (1.5 + sparkle)
              const rayWidth = pointSize * 0.1
              
              ctx.save()
              ctx.translate(star.x, star.y)
              ctx.rotate(angle)
              
              // Ray gradient
              const rayGradient = ctx.createLinearGradient(0, 0, rayLength, 0)
              rayGradient.addColorStop(0, `rgba(255, 255, 255, ${spikeAlpha})`)
              rayGradient.addColorStop(0.3, `rgba(255, 255, 255, ${spikeAlpha * 0.5})`)
              rayGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
              
              ctx.fillStyle = rayGradient
              ctx.fillRect(pointSize * 0.5, -rayWidth, rayLength - pointSize * 0.5, rayWidth * 2)
              ctx.restore()
            }
            
            ctx.restore()
          }
        }
      })
      
      ctx.globalAlpha = 1
      
      animationIdRef.current = requestAnimationFrame(animate)
    }

    // Start animation
    animate(0)

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
      className="fixed inset-0"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  )
}