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

  // Cloud system with orbital movement and shape morphing
  const cloudsRef = useRef<
    {
      x: number
      y: number
      orbitCenterX: number
      orbitCenterY: number
      orbitRadius: number
      baseOrbitRadius: number
      orbitAngle: number
      orbitSpeed: number
      orbitIndex: number // Which orbital center this belongs to
      radius: number
      scaleX: number
      scaleY: number
      rotation: number
      rotationSpeed: number
      color: string
      opacity: number
      phase: number
      morphSpeed: number
      attractionInfluence: number // How much other clouds affect this one
      centerVelocityX: number // Momentum for orbital center movement
      centerVelocityY: number // Momentum for orbital center movement
    }[]
  >([])

  // Orbital centers that clouds orbit around
  const orbitalCentersRef = useRef<
    {
      x: number
      y: number
      influence: number
      pulsePhase: number
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

      // Initialize orbital centers and clouds only once if empty
      if (cloudsRef.current.length === 0) {
        const baseSize = Math.min(canvas.width, canvas.height)
        
        // Create 3 orbital centers
        orbitalCentersRef.current = [
          {
            x: canvas.width * 0.3,
            y: canvas.height * 0.4,
            influence: 1.0,
            pulsePhase: 0
          },
          {
            x: canvas.width * 0.7,
            y: canvas.height * 0.6,
            influence: 0.8,
            pulsePhase: Math.PI * 0.5
          },
          {
            x: canvas.width * 0.5,
            y: canvas.height * 0.3,
            influence: 0.6,
            pulsePhase: Math.PI
          }
        ]
        
        // Helper function to create orbital clouds
        const createCloud = (color: string, sizeMultiplier: number, opacity: number, index: number) => {
          // Assign cloud to an orbital center
          const orbitIndex = index % orbitalCentersRef.current.length
          const orbitCenter = orbitalCentersRef.current[orbitIndex]
          
          // Orbital parameters
          const baseOrbitRadius = (canvas.width + canvas.height) * (0.1 + Math.random() * 0.15)
          const orbitAngle = Math.random() * Math.PI * 2
          const orbitSpeed = (0.0003 + Math.random() * 0.0007) * (1 + orbitIndex * 0.3) // Different speeds per orbit
          
          // Calculate initial position
          const x = orbitCenter.x + Math.cos(orbitAngle) * baseOrbitRadius
          const y = orbitCenter.y + Math.sin(orbitAngle) * baseOrbitRadius
          
          // Shape properties with more variation
          const scaleX = 0.4 + Math.random() * 1.2
          const scaleY = 0.4 + Math.random() * 1.2
          const rotation = Math.random() * Math.PI * 2
          const rotationSpeed = (Math.random() - 0.5) * 0.001
          
          // Animation properties
          const phase = Math.random() * Math.PI * 2
          const morphSpeed = 0.0001 + Math.random() * 0.0005
          
          return {
            x,
            y,
            orbitCenterX: orbitCenter.x,
            orbitCenterY: orbitCenter.y,
            orbitRadius: baseOrbitRadius,
            baseOrbitRadius,
            orbitAngle,
            orbitSpeed,
            orbitIndex,
            radius: baseSize * sizeMultiplier,
            scaleX,
            scaleY,
            rotation,
            rotationSpeed,
            color,
            opacity,
            phase,
            morphSpeed,
            attractionInfluence: 0.2 + Math.random() * 0.3,
            centerVelocityX: 0,
            centerVelocityY: 0
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

      // Calculate speed multiplier based on mouse interaction
      const interactionTime = Date.now()
      let speedMultiplier = 1

      // Mouse movement boost (2x speed while moving)
      if (isMovingRef.current) {
        speedMultiplier *= 2
      }

      // Click boost (2.5x speed that decays over 1200ms)
      const timeSinceClick = interactionTime - clickBoostRef.current
      if (timeSinceClick < 1200) {
        const clickDecay = 1 - timeSinceClick / 1200 // 1 to 0 over 1200ms
        const clickBoost = 1 + 1.5 * clickDecay // 1 to 2.5x speed
        speedMultiplier *= clickBoost
      }

      // Smooth transition for speed changes
      const targetSpeed = speedMultiplier
      speedMultiplierRef.current += (targetSpeed - speedMultiplierRef.current) * 0.15

      timeRef.current += 0.01 * speedMultiplierRef.current

      // Update orbital centers with subtle pulsing (affected by interaction)
      orbitalCentersRef.current.forEach((center) => {
        center.pulsePhase += 0.01 * speedMultiplierRef.current
        const pulse = Math.sin(center.pulsePhase) * 0.5 + 1 // 0.5 to 1.5 range
        center.influence = pulse
      })

      // Update cloud properties with orbital mechanics
      cloudsRef.current.forEach((cloud, index) => {
        // Get current orbital center
        const orbitCenter = orbitalCentersRef.current[cloud.orbitIndex]
        
        // Update orbital angle (accelerated by interaction)
        cloud.orbitAngle += cloud.orbitSpeed * orbitCenter.influence * speedMultiplierRef.current
        
        // Calculate attraction forces from other clouds
        let totalAttractionX = 0
        let totalAttractionY = 0
        let nearbyCloudInfluence = 0
        
        cloudsRef.current.forEach((otherCloud, otherIndex) => {
          if (index === otherIndex) return
          
          const dx = otherCloud.x - cloud.x
          const dy = otherCloud.y - cloud.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const maxInfluenceDistance = cloud.radius + otherCloud.radius + 100
          
          if (distance < maxInfluenceDistance && distance > 0) {
            const influence = (1 - distance / maxInfluenceDistance) * cloud.attractionInfluence
            totalAttractionX += (dx / distance) * influence * 2
            totalAttractionY += (dy / distance) * influence * 2
            nearbyCloudInfluence += influence
          }
        })
        
        // Calculate forces acting on orbital center
        const originalCenter = orbitalCentersRef.current[cloud.orbitIndex]
        let forceX = 0
        let forceY = 0
        
        // Attraction forces from nearby clouds (only during interaction)
        if (nearbyCloudInfluence > 0) {
          const attractionStrength = 0.05 * speedMultiplierRef.current
          forceX += totalAttractionX * attractionStrength
          forceY += totalAttractionY * attractionStrength
        }
        
        // Gentle return force to original position (always active but weak)
        const returnStrength = 0.008 // Very gentle constant return force
        const centerDx = originalCenter.x - cloud.orbitCenterX
        const centerDy = originalCenter.y - cloud.orbitCenterY
        forceX += centerDx * returnStrength
        forceY += centerDy * returnStrength
        
        // Boundary forces (stronger as we approach limits)
        const maxShift = Math.min(canvas.width, canvas.height) * 0.25 // Allow more movement
        const currentDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy)
        
        if (currentDistance > maxShift * 0.8) {
          const boundaryStrength = (currentDistance - maxShift * 0.8) / (maxShift * 0.2)
          const boundaryForce = boundaryStrength * 0.02
          forceX += centerDx * boundaryForce
          forceY += centerDy * boundaryForce
        }
        
        // Apply forces to velocity (momentum-based)
        cloud.centerVelocityX += forceX
        cloud.centerVelocityY += forceY
        
        // Apply damping to velocity
        const damping = 0.92 // Gradual slowdown
        cloud.centerVelocityX *= damping
        cloud.centerVelocityY *= damping
        
        // Update orbital center position based on velocity
        cloud.orbitCenterX += cloud.centerVelocityX
        cloud.orbitCenterY += cloud.centerVelocityY
        
        // Dynamic orbital radius based on nearby clouds and time (more dramatic during interaction)
        const radiusVariation = Math.sin(timeRef.current * 0.5 + cloud.phase) * 0.3 * speedMultiplierRef.current
        const attractionRadiusChange = nearbyCloudInfluence * 30 * speedMultiplierRef.current
        cloud.orbitRadius = cloud.baseOrbitRadius * (1 + radiusVariation) + attractionRadiusChange
        
        // Limit maximum orbital radius to prevent clouds from going too far off screen
        const maxOrbitRadius = Math.min(canvas.width, canvas.height) * 0.4 // Max 40% of screen size
        cloud.orbitRadius = Math.min(cloud.orbitRadius, maxOrbitRadius)
        
        // Calculate new position based on orbital mechanics
        cloud.x = cloud.orbitCenterX + Math.cos(cloud.orbitAngle) * cloud.orbitRadius
        cloud.y = cloud.orbitCenterY + Math.sin(cloud.orbitAngle) * cloud.orbitRadius

        // Apply very gentle cloud position nudging only for extreme cases
        const screenMargin = cloud.radius * 0.3 // Allow clouds to be mostly outside
        
        // Only apply gentle nudges if clouds are completely off screen
        if (cloud.x < -cloud.radius) {
          cloud.centerVelocityX += 0.001
        } else if (cloud.x > canvas.width + cloud.radius) {
          cloud.centerVelocityX -= 0.001
        }
        
        if (cloud.y < -cloud.radius) {
          cloud.centerVelocityY += 0.001
        } else if (cloud.y > canvas.height + cloud.radius) {
          cloud.centerVelocityY -= 0.001
        }

        // Update rotation (faster during interaction)
        cloud.rotation += cloud.rotationSpeed * speedMultiplierRef.current

        // Enhanced shape morphing based on interactions (more dramatic during interaction)
        const morphTime = timeRef.current * cloud.morphSpeed
        const baseScaleX = 1 + Math.sin(morphTime) * (0.4 * speedMultiplierRef.current)
        const baseScaleY = 1 + Math.cos(morphTime * 1.1) * (0.4 * speedMultiplierRef.current)
        
        // Additional morphing from nearby cloud interactions (enhanced during interaction)
        const interactionMorph = nearbyCloudInfluence * 0.5 * speedMultiplierRef.current
        cloud.scaleX = baseScaleX + interactionMorph
        cloud.scaleY = baseScaleY + interactionMorph * 0.7
        
        // Orbital speed changes based on distance to center
        const distanceToCenter = Math.sqrt(
          Math.pow(cloud.x - cloud.orbitCenterX, 2) + 
          Math.pow(cloud.y - cloud.orbitCenterY, 2)
        )
        const orbitalSpeedMultiplier = 1 + (cloud.baseOrbitRadius - distanceToCenter) * 0.00001
        cloud.orbitSpeed *= orbitalSpeedMultiplier
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
