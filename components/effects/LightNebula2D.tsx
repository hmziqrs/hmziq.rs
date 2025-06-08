'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export default function LightNebula2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationIdRef = useRef<number>()
  const timeRef = useRef(0)
  const prefersReducedMotion = useReducedMotion()

  // Pre-rendered gradient positions
  const cloudsRef = useRef<
    {
      x: number
      y: number
      radius: number
      color: string
      opacity: number
      phase: number
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

      // Generate static cloud positions on resize
      cloudsRef.current = [
        {
          x: canvas.width * 0.3,
          y: canvas.height * 0.4,
          radius: Math.min(canvas.width, canvas.height) * 0.4,
          color: 'pink',
          opacity: 0.12,
          phase: 0,
        },
        {
          x: canvas.width * 0.7,
          y: canvas.height * 0.6,
          radius: Math.min(canvas.width, canvas.height) * 0.35,
          color: 'blue',
          opacity: 0.06,
          phase: Math.PI / 3,
        },
        {
          x: canvas.width * 0.5,
          y: canvas.height * 0.3,
          radius: Math.min(canvas.width, canvas.height) * 0.3,
          color: 'purple',
          opacity: 0.05,
          phase: Math.PI / 2,
        },
        {
          x: canvas.width * 0.2,
          y: canvas.height * 0.7,
          radius: Math.min(canvas.width, canvas.height) * 0.25,
          color: 'cyan',
          opacity: 0.04,
          phase: Math.PI,
        },
      ]
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Simple render function
    const renderCloud = (cloud: (typeof cloudsRef.current)[0], pulseAmount: number) => {
      const gradient = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.radius)

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
      ctx.fillRect(
        cloud.x - cloud.radius,
        cloud.y - cloud.radius,
        cloud.radius * 2,
        cloud.radius * 2
      )
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

      // Render each cloud with simple pulsing
      ctx.globalCompositeOperation = 'screen'
      cloudsRef.current.forEach((cloud) => {
        const pulse = Math.sin(timeRef.current + cloud.phase) * 0.5 + 0.5
        renderCloud(cloud, pulse)
      })

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
