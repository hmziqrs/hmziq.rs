'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export default function LightNebula2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationIdRef = useRef<number>()
  const timeRef = useRef(Math.random() * 100) // Start at random time offset
  const prefersReducedMotion = useReducedMotion()

  // Cloud system with movement and shape morphing
  const cloudsRef = useRef<
    {
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      scaleX: number
      scaleY: number
      rotation: number
      rotationSpeed: number
      color: string
      opacity: number
      phase: number
      morphSpeed: number
    }[]
  >([])

  useEffect(() => {
    if (prefersReducedMotion) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      // Initialize clouds only once if empty
      if (cloudsRef.current.length === 0) {
        const baseSize = Math.min(canvas.width, canvas.height)
        
        // Helper function to generate random cloud properties
        const createCloud = (color: string, sizeMultiplier: number, opacity: number, index: number) => {
          // Distribute clouds across screen sections to avoid clustering
          const sections = 3
          const sectionX = index % sections
          const sectionY = Math.floor(index / sections)
          
          // Random position within section with overlap
          const sectionWidth = canvas.width / sections
          const sectionHeight = canvas.height / 2
          const overlap = 0.3 // 30% overlap between sections
          
          const x = (sectionX * sectionWidth * (1 - overlap)) + 
                   (Math.random() * sectionWidth * (1 + overlap))
          const y = (sectionY * sectionHeight * (1 - overlap)) + 
                   (Math.random() * sectionHeight * (1 + overlap))
          
          // Random velocity with direction
          const speed = 0.03 + Math.random() * 0.07
          const angle = Math.random() * Math.PI * 2
          const vx = Math.cos(angle) * speed
          const vy = Math.sin(angle) * speed
          
          // Random shape properties
          const scaleX = 0.6 + Math.random() * 0.8
          const scaleY = 0.6 + Math.random() * 0.8
          const rotation = Math.random() * Math.PI * 2
          const rotationSpeed = (Math.random() - 0.5) * 0.0004
          
          // Random animation properties
          const phase = Math.random() * Math.PI * 2
          const morphSpeed = 0.0002 + Math.random() * 0.0003
          
          return {
            x,
            y,
            vx,
            vy,
            radius: baseSize * sizeMultiplier,
            scaleX,
            scaleY,
            rotation,
            rotationSpeed,
            color,
            opacity,
            phase,
            morphSpeed,
          }
        }
        
        // Create clouds with random properties but controlled colors/sizes
        cloudsRef.current = [
          createCloud('pink', 0.4, 0.09, 0),
          createCloud('blue', 0.35, 0.06, 1),
          createCloud('purple', 0.3, 0.05, 2),
          createCloud('cyan', 0.25, 0.04, 3),
          createCloud('pink', 0.32, 0.03, 4),
          createCloud('blue', 0.28, 0.04, 5),
        ]
      }

      // Update cloud sizes based on new canvas size
      const baseSize = Math.min(canvas.width, canvas.height)
      cloudsRef.current.forEach((cloud, i) => {
        const sizeFactor = [0.4, 0.35, 0.3, 0.25, 0.32, 0.28][i] || 0.3
        cloud.radius = baseSize * sizeFactor
      })
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Enhanced render function with shape morphing
    const renderCloud = (cloud: (typeof cloudsRef.current)[0], pulseAmount: number) => {
      ctx.save()

      // Apply transformations for elliptical shape
      ctx.translate(cloud.x, cloud.y)
      ctx.rotate(cloud.rotation)
      ctx.scale(cloud.scaleX, cloud.scaleY)

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, cloud.radius)

      const opacity = cloud.opacity + pulseAmount * cloud.opacity * 0.3

      switch (cloud.color) {
        case 'pink':
          gradient.addColorStop(0, `rgba(255, 100, 200, ${opacity * 2})`)
          gradient.addColorStop(0.4, `rgba(255, 50, 150, ${opacity})`)
          gradient.addColorStop(0.7, `rgba(200, 100, 255, ${opacity * 0.5})`)
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
          break
        case 'blue':
          gradient.addColorStop(0, `rgba(100, 200, 255, ${opacity * 2})`)
          gradient.addColorStop(0.4, `rgba(50, 150, 255, ${opacity})`)
          gradient.addColorStop(0.7, `rgba(100, 100, 200, ${opacity * 0.5})`)
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
          break
        case 'purple':
          gradient.addColorStop(0, `rgba(200, 150, 255, ${opacity * 2})`)
          gradient.addColorStop(0.4, `rgba(150, 100, 255, ${opacity})`)
          gradient.addColorStop(0.7, `rgba(100, 50, 200, ${opacity * 0.5})`)
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
          break
        case 'cyan':
          gradient.addColorStop(0, `rgba(150, 255, 255, ${opacity * 2})`)
          gradient.addColorStop(0.4, `rgba(100, 200, 255, ${opacity})`)
          gradient.addColorStop(0.7, `rgba(50, 150, 200, ${opacity * 0.5})`)
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
          break
      }

      ctx.fillStyle = gradient
      ctx.fillRect(-cloud.radius, -cloud.radius, cloud.radius * 2, cloud.radius * 2)

      ctx.restore()
    }

    // Simple animation loop
    let lastTime = 0
    const animate = (currentTime: number) => {
      // Limit to 30 FPS for performance
      if (currentTime - lastTime < 33) {
        animationIdRef.current = requestAnimationFrame(animate)
        return
      }
      lastTime = currentTime

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      timeRef.current += 0.01

      // Update cloud properties
      cloudsRef.current.forEach((cloud) => {
        // Update position
        cloud.x += cloud.vx
        cloud.y += cloud.vy

        // Boundary check with wrapping
        const margin = cloud.radius * 2
        if (cloud.x < -margin) cloud.x = canvas.width + margin
        if (cloud.x > canvas.width + margin) cloud.x = -margin
        if (cloud.y < -margin) cloud.y = canvas.height + margin
        if (cloud.y > canvas.height + margin) cloud.y = -margin

        // Update rotation
        cloud.rotation += cloud.rotationSpeed

        // Morph shape using sine waves
        const morphTime = timeRef.current * cloud.morphSpeed
        cloud.scaleX = 1 + Math.sin(morphTime) * 0.3
        cloud.scaleY = 1 + Math.cos(morphTime * 1.1) * 0.3

        // Slight velocity variation for organic movement
        cloud.vx += (Math.random() - 0.5) * 0.001
        cloud.vy += (Math.random() - 0.5) * 0.001

        // Limit velocity
        cloud.vx = Math.max(-0.2, Math.min(0.2, cloud.vx))
        cloud.vy = Math.max(-0.2, Math.min(0.2, cloud.vy))
      })

      // Sort clouds by size for proper layering (smaller on top)
      const sortedClouds = [...cloudsRef.current].sort((a, b) => b.radius - a.radius)

      // Render each cloud with pulsing
      ctx.globalCompositeOperation = 'screen'
      sortedClouds.forEach((cloud) => {
        const pulse = Math.sin(timeRef.current + cloud.phase) * 0.5 + 0.5
        renderCloud(cloud, pulse)
      })

      // Add subtle interaction glow where clouds overlap
      ctx.globalCompositeOperation = 'screen'
      for (let i = 0; i < sortedClouds.length; i++) {
        for (let j = i + 1; j < sortedClouds.length; j++) {
          const cloud1 = sortedClouds[i]
          const cloud2 = sortedClouds[j]

          const dx = cloud1.x - cloud2.x
          const dy = cloud1.y - cloud2.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const combinedRadius = (cloud1.radius + cloud2.radius) * 0.8

          if (distance < combinedRadius) {
            const overlapStrength = 1 - distance / combinedRadius
            const midX = (cloud1.x + cloud2.x) / 2
            const midY = (cloud1.y + cloud2.y) / 2

            const overlapGlow = ctx.createRadialGradient(
              midX,
              midY,
              0,
              midX,
              midY,
              combinedRadius * 0.3
            )
            overlapGlow.addColorStop(0, `rgba(255, 255, 255, ${overlapStrength * 0.03})`)
            overlapGlow.addColorStop(0.5, `rgba(200, 200, 255, ${overlapStrength * 0.02})`)
            overlapGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')

            ctx.fillStyle = overlapGlow
            ctx.fillRect(
              midX - combinedRadius * 0.3,
              midY - combinedRadius * 0.3,
              combinedRadius * 0.6,
              combinedRadius * 0.6
            )
          }
        }
      }

      // Add a very subtle overall glow
      const centerGlow = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        Math.min(canvas.width, canvas.height) * 0.6
      )
      centerGlow.addColorStop(0, 'rgba(200, 150, 255, 0.02)')
      centerGlow.addColorStop(0.5, 'rgba(100, 150, 255, 0.01)')
      centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')

      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = centerGlow
      ctx.fillRect(0, 0, canvas.width, canvas.height)

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
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 2 }}
      aria-hidden="true"
    />
  )
}
