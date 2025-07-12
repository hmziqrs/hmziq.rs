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

const STAR_COUNT = 1000 // Reduce density for cleaner look

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
        // Create more natural distribution with some clustering
        let x, y

        // 30% of stars in loose clusters
        if (seed(i + 10000) < 0.3) {
          // Pick a cluster center
          const clusterX = seed(Math.floor(i / 20) * 1000) * width
          const clusterY = seed(Math.floor(i / 20) * 2000) * height
          // Add random offset from cluster center
          const angle = seed(i + 3000) * Math.PI * 2
          const distance = seed(i + 4000) * width * 0.1 // Cluster radius
          x = clusterX + Math.cos(angle) * distance
          y = clusterY + Math.sin(angle) * distance
        } else {
          // Rest distributed randomly
          x = seed(i) * width * 1.2 - width * 0.1
          y = seed(i + 1000) * height * 1.2 - height * 0.1
        }

        const z = seed(i + 2000) // Depth for parallax

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
          initialX: x,
          initialY: y,
          initialZ: z,
          size,
          color,
          brightness: 0.5 + seed(i + 7000) * 0.3, // Reduced overall brightness
          canSparkle: size > 3 && seed(i + 8000) < 0.4, // Larger stars can sparkle
          sparkleOffset: seed(i + 9000) * 40, // Random offset for sparkle timing
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

      // Define center points
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      // Update and draw stars
      starsRef.current.forEach((star, index) => {
        // Simple rotation around center for subtle movement
        const dx = star.initialX - centerX
        const dy = star.initialY - centerY
        const distance = Math.sqrt(dx * dx + dy * dy)
        const angle = Math.atan2(dy, dx)

        // Slow rotation based on distance from center and depth
        const rotSpeed = 0.0001 * (1 - star.z * 0.5) // Closer stars rotate slightly faster
        const newAngle = angle + elapsedTime * rotSpeed

        star.x = centerX + Math.cos(newAngle) * distance
        star.y = centerY + Math.sin(newAngle) * distance

        // Subtle parallax based on depth
        const parallaxScale = 1 - star.z * 0.1
        const px = (star.x - centerX) * parallaxScale + centerX
        const py = (star.y - centerY) * parallaxScale + centerY

        // Calculate point size based on depth
        const pointSize = star.size * (0.8 + star.z * 0.2) // Closer stars (low z) are slightly larger

        // Match shader twinkle effect
        const twinkleBase =
          Math.sin(elapsedTime * 3.0 + star.initialX * 10.0 + star.initialY * 10.0) * 0.3 + 0.7

        // Sparkle effect - match shader exactly
        const sparklePhase = Math.sin(
          elapsedTime * 15.0 +
            star.initialX * 20.0 +
            star.initialY * 30.0 +
            star.initialZ * 40.0 +
            star.sparkleOffset
        )
        let sparkle = 0
        if (sparklePhase > 0.98) {
          sparkle = Math.pow((sparklePhase - 0.98) / 0.02, 2.0) * 3.0
        }

        const twinkle = twinkleBase + sparkle
        const alpha = star.brightness * twinkle

        // Draw based on size
        if (pointSize < 1.5) {
          // Small stars - simple dots with reduced opacity
          ctx.fillStyle = `rgba(${star.color.r}, ${star.color.g}, ${star.color.b}, ${alpha * 0.7})`
          ctx.fillRect(px - pointSize / 2, py - pointSize / 2, pointSize, pointSize)
        } else {
          // Larger stars with subtle glow
          const glowSize = pointSize * 2 // Reduced from 3

          // Main glow
          const gradient = ctx.createRadialGradient(px, py, 0, px, py, glowSize)

          gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`)
          gradient.addColorStop(
            0.3,
            `rgba(${star.color.r}, ${star.color.g}, ${star.color.b}, ${alpha * 0.6})`
          )
          gradient.addColorStop(
            0.6,
            `rgba(${star.color.r}, ${star.color.g}, ${star.color.b}, ${alpha * 0.2})`
          )
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

          ctx.fillStyle = gradient
          ctx.fillRect(px - glowSize, py - glowSize, glowSize * 2, glowSize * 2)

          // Draw sparkle rays if active
          if (sparkle > 0.5 && star.canSparkle) {
            // Make sparkles less frequent
            ctx.save()
            ctx.globalCompositeOperation = 'screen'

            // Create 8-ray pattern like the shader
            const spikeAlpha = sparkle * 0.3 // Reduced intensity
            ctx.globalAlpha = spikeAlpha

            for (let i = 0; i < 8; i++) {
              const angle = (i * Math.PI) / 4
              const rayLength = glowSize * (1.5 + sparkle)
              const rayWidth = pointSize * 0.1

              ctx.save()
              ctx.translate(px, py)
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
    <canvas ref={canvasRef} className="fixed inset-0" style={{ zIndex: 1 }} aria-hidden="true" />
  )
}
