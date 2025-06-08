'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export default function LightNebula2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationIdRef = useRef<number>()
  const timeRef = useRef(Math.random() * 100) // Start at random time offset
  const prefersReducedMotion = useReducedMotion()

  // Mouse interaction state for speed control
  const speedMultiplierRef = useRef(1)
  const isMovingRef = useRef(false)
  const clickBoostRef = useRef(0)
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout>()

  // Simplified cloud system - all orbit from screen center
  const cloudsRef = useRef<
    {
      // Core properties
      radius: number
      baseOpacity: number
      color: { r: number; g: number; b: number }

      // Orbital properties
      orbitRadius: number
      orbitAngle: number
      orbitSpeed: number // Base orbital speed

      // Animation properties (accumulative - no reset)
      timeOffset: number // Individual time offset for variations
      opacityPhase: number // For pulsating opacity
      morphPhase: number // For shape morphing

      // Current state (computed)
      x: number
      y: number
      currentOpacity: number
      scaleX: number
      scaleY: number
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
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const baseSize = Math.min(canvas.width, canvas.height)

        // Color variations for each cloud type
        const colorPalettes = {
          pink: [
            { r: 255, g: 100, b: 200 },
            { r: 255, g: 120, b: 180 },
            { r: 240, g: 80, b: 220 },
          ],
          blue: [
            { r: 100, g: 200, b: 255 },
            { r: 80, g: 180, b: 240 },
            { r: 120, g: 220, b: 255 },
          ],
          purple: [
            { r: 200, g: 150, b: 255 },
            { r: 180, g: 130, b: 240 },
            { r: 220, g: 170, b: 255 },
          ],
          cyan: [
            { r: 150, g: 255, b: 255 },
            { r: 130, g: 240, b: 240 },
            { r: 170, g: 255, b: 255 },
          ],
        }

        const cloudConfigs = [
          { type: 'pink', sizeMult: 0.4, baseOpacity: 0.09 },
          { type: 'blue', sizeMult: 0.35, baseOpacity: 0.06 },
          { type: 'purple', sizeMult: 0.3, baseOpacity: 0.05 },
          { type: 'cyan', sizeMult: 0.25, baseOpacity: 0.04 },
          { type: 'pink', sizeMult: 0.32, baseOpacity: 0.03 },
          { type: 'blue', sizeMult: 0.28, baseOpacity: 0.04 },
        ]

        cloudsRef.current = cloudConfigs.map((config, index) => {
          // Dynamic sizing with some variation
          const sizeVariation = 0.8 + Math.random() * 0.4 // 0.8 to 1.2 multiplier
          const radius = baseSize * config.sizeMult * sizeVariation

          // Color shade variation
          const palette = colorPalettes[config.type as keyof typeof colorPalettes]
          const colorIndex = Math.floor(Math.random() * palette.length)
          const color = palette[colorIndex]

          // Opacity variation
          const opacityVariation = 0.7 + Math.random() * 0.6 // 0.7 to 1.3 multiplier
          const baseOpacity = config.baseOpacity * opacityVariation

          // Orbital properties based on size (larger = further out, slower)
          const sizeInfluence = radius / (baseSize * 0.4) // Normalize to size factor
          const orbitRadius = (canvas.width + canvas.height) * (0.15 + sizeInfluence * 0.1) // 15-25% of screen
          const orbitAngle = Math.random() * Math.PI * 2
          const orbitSpeed = (0.5 + Math.random() * 0.3) / Math.sqrt(sizeInfluence) // Clearly visible orbital motion

          // Individual time offsets for variations
          const timeOffset = Math.random() * 100

          return {
            radius,
            baseOpacity,
            color,
            orbitRadius,
            orbitAngle,
            orbitSpeed,
            timeOffset,
            opacityPhase: 0,
            morphPhase: 0,
            x: centerX + Math.cos(orbitAngle) * orbitRadius,
            y: centerY + Math.sin(orbitAngle) * orbitRadius,
            currentOpacity: baseOpacity,
            scaleX: 1,
            scaleY: 1,
          }
        })
      }

      // Update cloud orbital radii based on new canvas size
      if (cloudsRef.current.length > 0) {
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2

        cloudsRef.current.forEach((cloud) => {
          // Recalculate orbital radius for new screen size
          const baseSize = Math.min(canvas.width, canvas.height)
          const sizeInfluence = cloud.radius / (baseSize * 0.4)
          cloud.orbitRadius = (canvas.width + canvas.height) * (0.15 + sizeInfluence * 0.1)

          // Update position based on current angle
          cloud.x = centerX + Math.cos(cloud.orbitAngle) * cloud.orbitRadius
          cloud.y = centerY + Math.sin(cloud.orbitAngle) * cloud.orbitRadius
        })
      }
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
      // Add click boost that decays over 1200ms
      clickBoostRef.current = Date.now()
    }

    const handleScroll = () => {
      // Treat scroll like mouse movement
      handleMouseMove()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)
    window.addEventListener('scroll', handleScroll)

    // Simple cloud rendering function
    const renderCloud = (cloud: (typeof cloudsRef.current)[0]) => {
      ctx.save()

      // Apply transformations for shape morphing
      ctx.translate(cloud.x, cloud.y)
      ctx.scale(cloud.scaleX, cloud.scaleY)

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, cloud.radius)

      // Use the cloud's current opacity
      const opacity = cloud.currentOpacity

      // Create gradient with cloud's color
      gradient.addColorStop(
        0,
        `rgba(${cloud.color.r}, ${cloud.color.g}, ${cloud.color.b}, ${opacity * 2})`
      )
      gradient.addColorStop(
        0.4,
        `rgba(${cloud.color.r}, ${cloud.color.g}, ${cloud.color.b}, ${opacity})`
      )
      gradient.addColorStop(
        0.7,
        `rgba(${cloud.color.r}, ${cloud.color.g}, ${cloud.color.b}, ${opacity * 0.5})`
      )
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

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

      // Calculate speed multiplier based on mouse interaction
      const interactionTime = Date.now()
      let speedMultiplier = 1

      // Mouse movement boost (3x speed while moving)
      if (isMovingRef.current) {
        speedMultiplier *= 3
      }

      // Click boost (5x speed that decays over 1200ms)
      const timeSinceClick = interactionTime - clickBoostRef.current
      if (timeSinceClick < 1200) {
        const clickDecay = 1 - timeSinceClick / 1200 // 1 to 0 over 1200ms
        const clickBoost = 1 + 4 * clickDecay // 1 to 5x speed
        speedMultiplier *= clickBoost
      }

      // Smooth transition for speed changes
      const targetSpeed = speedMultiplier
      speedMultiplierRef.current += (targetSpeed - speedMultiplierRef.current) * 0.2

      // Calculate time delta for this frame (affected by speed multiplier)
      const deltaTime = 0.008 * speedMultiplierRef.current // Adjusted for visible orbital motion

      // Update each cloud independently
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      cloudsRef.current.forEach((cloud) => {
        // Update orbital position (accumulative - no reset)
        cloud.orbitAngle += cloud.orbitSpeed * deltaTime
        cloud.x = centerX + Math.cos(cloud.orbitAngle) * cloud.orbitRadius
        cloud.y = centerY + Math.sin(cloud.orbitAngle) * cloud.orbitRadius

        // Update opacity phase (accumulative - no reset)
        cloud.opacityPhase += deltaTime * 2 // Opacity pulsing speed
        const opacityPulse = Math.sin(cloud.opacityPhase + cloud.timeOffset) * 0.3 + 1 // 0.7 to 1.3 range
        cloud.currentOpacity = cloud.baseOpacity * opacityPulse

        // Update shape morphing phase (accumulative - no reset)
        cloud.morphPhase += deltaTime * 0.8 // Shape morphing speed
        const morphX = Math.sin(cloud.morphPhase + cloud.timeOffset) * 0.15 + 1 // 0.85 to 1.15 range
        const morphY = Math.cos(cloud.morphPhase * 1.1 + cloud.timeOffset) * 0.15 + 1 // 0.85 to 1.15 range
        cloud.scaleX = morphX
        cloud.scaleY = morphY
      })

      // Sort clouds by size for proper layering (larger behind smaller)
      const sortedClouds = [...cloudsRef.current].sort((a, b) => b.radius - a.radius)

      // Render each cloud
      ctx.globalCompositeOperation = 'screen'
      sortedClouds.forEach((cloud) => {
        renderCloud(cloud)
      })

      // Add subtle overlap glow effects
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
            overlapGlow.addColorStop(0, `rgba(255, 255, 255, ${overlapStrength * 0.02})`)
            overlapGlow.addColorStop(0.5, `rgba(200, 200, 255, ${overlapStrength * 0.01})`)
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

      animationIdRef.current = requestAnimationFrame(animate)
    }

    // Start animation
    animate(0)

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
      style={{ zIndex: 2 }}
      aria-hidden="true"
    />
  )
}
