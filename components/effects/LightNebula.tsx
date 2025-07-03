'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { QualityManager } from '@/lib/performance/quality-manager'
import { gradientCaches, generateGradientKey } from '@/lib/performance/gradient-cache'
import { 
  FrameTimer,
  isInViewport
} from '@/lib/performance/performance-utils'
import { getNebulaSpatialIndexing } from '@/lib/wasm/nebula-spatial'

interface Cloud {
  // Core properties
  id: number
  radius: number
  baseOpacity: number
  color: { r: number; g: number; b: number }
  
  // Orbital properties
  orbitCenterX: number
  orbitCenterY: number
  orbitRadius: number
  orbitAngle: number
  orbitSpeed: number
  orbitIndex: number
  
  // Animation properties
  timeOffset: number
  opacityPhase: number
  morphPhase: number
  
  // Current state
  x: number
  y: number
  currentOpacity: number
  scaleX: number
  scaleY: number
  
  // Visibility
  isVisible: boolean
  lastVisibilityCheck: number
}

interface OrbitalCenter {
  x: number
  y: number
  baseRadius: number
  radiusVariation: number
}

// Pre-defined color palettes
const COLOR_PALETTES = {
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

// Quality-based cloud configurations
const CLOUD_CONFIGS = [
  { type: 'pink', sizeMult: 0.4, baseOpacity: 0.09 },
  { type: 'blue', sizeMult: 0.35, baseOpacity: 0.06 },
  { type: 'purple', sizeMult: 0.3, baseOpacity: 0.05 },
  { type: 'cyan', sizeMult: 0.25, baseOpacity: 0.04 },
  { type: 'pink', sizeMult: 0.32, baseOpacity: 0.03 },
  { type: 'blue', sizeMult: 0.28, baseOpacity: 0.04 },
]

export default function LightNebula2DOptimized() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationIdRef = useRef<number>()
  const prefersReducedMotion = useReducedMotion()
  const frameTimer = useRef(new FrameTimer())
  
  // Performance management
  const qualityManager = useRef<QualityManager>()
  
  // Cloud management
  const cloudsRef = useRef<Cloud[]>([])
  const sortedCloudsRef = useRef<Cloud[]>([])
  const orbitalCentersRef = useRef<OrbitalCenter[]>([])
  const cloudsSortNeeded = useRef(true)
  
  // Mouse interaction state
  const speedMultiplierRef = useRef(1)
  const isMovingRef = useRef(false)
  const clickBoostRef = useRef(0)
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout>()
  
  // Frame counters for optimization
  const frameCountRef = useRef(0)
  const visibilityCheckInterval = useRef(10) // Check visibility every N frames
  
  // Spatial indexing for efficient overlap detection
  const spatialIndexingRef = useRef(getNebulaSpatialIndexing())

  useEffect(() => {
    if (prefersReducedMotion) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { 
      alpha: true,
      desynchronized: true
    })
    if (!ctx) return

    // Initialize performance management
    qualityManager.current = QualityManager.getInstance()
    const settings = qualityManager.current.getSettings()
    
    // Initialize gradient cache
    gradientCaches.nebula.setContext(ctx)
    
    // Update visibility check interval based on quality
    visibilityCheckInterval.current = {
      performance: 20,
      balanced: 15,
      ultra: 10
    }[qualityManager.current.getTier()]

    // Set canvas size and initialize clouds
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const baseSize = Math.min(canvas.width, canvas.height)

      // Update orbital centers
      orbitalCentersRef.current = [
        {
          x: centerX - baseSize * 0.08,
          y: centerY - baseSize * 0.05,
          baseRadius: baseSize * 0.18,
          radiusVariation: baseSize * 0.12
        },
        {
          x: centerX + baseSize * 0.06,
          y: centerY - baseSize * 0.03,
          baseRadius: baseSize * 0.22,
          radiusVariation: baseSize * 0.15
        },
        {
          x: centerX - baseSize * 0.03,
          y: centerY + baseSize * 0.07,
          baseRadius: baseSize * 0.15,
          radiusVariation: baseSize * 0.10
        },
        {
          x: centerX + baseSize * 0.09,
          y: centerY + baseSize * 0.04,
          baseRadius: baseSize * 0.25,
          radiusVariation: baseSize * 0.18
        }
      ]

      // Initialize clouds only once
      if (cloudsRef.current.length === 0) {
        const cloudCount = qualityManager.current!.getAdaptiveCount(
          settings.nebulaCloudCount,
          canvas.width,
          canvas.height
        )
        
        const configs = CLOUD_CONFIGS.slice(0, cloudCount)
        
        cloudsRef.current = configs.map((config, index) => {
          const sizeVariation = 0.8 + Math.random() * 0.4
          const radius = baseSize * config.sizeMult * sizeVariation

          const palette = COLOR_PALETTES[config.type as keyof typeof COLOR_PALETTES]
          const colorIndex = Math.floor(Math.random() * palette.length)
          const color = palette[colorIndex]

          const opacityVariation = 0.7 + Math.random() * 0.6
          const baseOpacity = config.baseOpacity * opacityVariation

          const orbitIndex = index % orbitalCentersRef.current.length
          const orbitCenter = orbitalCentersRef.current[orbitIndex]
          
          const sizeInfluence = radius / (baseSize * 0.4)
          const orbitRadius = orbitCenter.baseRadius + (Math.random() * orbitCenter.radiusVariation)
          const orbitAngle = Math.random() * Math.PI * 2
          const orbitSpeed = (0.5 + Math.random() * 0.3) / Math.sqrt(sizeInfluence)

          const timeOffset = Math.random() * 100

          return {
            id: index,
            radius,
            baseOpacity,
            color,
            orbitCenterX: orbitCenter.x,
            orbitCenterY: orbitCenter.y,
            orbitRadius,
            orbitAngle,
            orbitSpeed,
            orbitIndex,
            timeOffset,
            opacityPhase: 0,
            morphPhase: 0,
            x: orbitCenter.x + Math.cos(orbitAngle) * orbitRadius,
            y: orbitCenter.y + Math.sin(orbitAngle) * orbitRadius,
            currentOpacity: baseOpacity,
            scaleX: 1,
            scaleY: 1,
            isVisible: true,
            lastVisibilityCheck: 0
          }
        })
        
        cloudsSortNeeded.current = true
      } else {
        // Update existing clouds for new canvas size
        cloudsRef.current.forEach((cloud) => {
          const orbitCenter = orbitalCentersRef.current[cloud.orbitIndex]
          cloud.orbitCenterX = orbitCenter.x
          cloud.orbitCenterY = orbitCenter.y
          
          cloud.orbitRadius = orbitCenter.baseRadius + (Math.random() * orbitCenter.radiusVariation)
          
          cloud.x = cloud.orbitCenterX + Math.cos(cloud.orbitAngle) * cloud.orbitRadius
          cloud.y = cloud.orbitCenterY + Math.sin(cloud.orbitAngle) * cloud.orbitRadius
        })
      }
      
      // Re-initialize spatial indexing with new canvas dimensions
      spatialIndexingRef.current.initialize(canvas.width, canvas.height)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

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
      }, 100)
    }

    const handleClick = () => {
      clickBoostRef.current = Date.now()
    }

    const handleScroll = () => {
      handleMouseMove()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)
    window.addEventListener('scroll', handleScroll)

    // Optimized cloud rendering with gradient caching
    const renderCloud = (cloud: Cloud, settings: ReturnType<QualityManager['getSettings']>) => {
      if (!cloud.isVisible) return
      
      ctx.save()
      
      // Apply transformations
      ctx.translate(cloud.x, cloud.y)
      
      // Only apply morphing in balanced/ultra modes
      if (settings.nebulaComplexity !== 'simple') {
        ctx.scale(cloud.scaleX, cloud.scaleY)
      }

      // Get cached gradient
      const gradientKey = generateGradientKey(
        'nebula_cloud',
        cloud.id,
        Math.floor(cloud.currentOpacity * 100)
      )
      
      const gradient = gradientCaches.nebula.getRadialGradient(
        gradientKey,
        0, 0, 0,
        0, 0, cloud.radius,
        [
          [0, `rgba(${cloud.color.r}, ${cloud.color.g}, ${cloud.color.b}, ${cloud.currentOpacity * 2})`],
          [0.4, `rgba(${cloud.color.r}, ${cloud.color.g}, ${cloud.color.b}, ${cloud.currentOpacity})`],
          [0.7, `rgba(${cloud.color.r}, ${cloud.color.g}, ${cloud.color.b}, ${cloud.currentOpacity * 0.5})`],
          [1, 'rgba(0, 0, 0, 0)']
        ]
      )

      if (gradient) {
        ctx.fillStyle = gradient
        ctx.fillRect(-cloud.radius, -cloud.radius, cloud.radius * 2, cloud.radius * 2)
      }

      ctx.restore()
    }

    // Animation loop
    const animate = (currentTime: number) => {
      const deltaTime = frameTimer.current.update(currentTime)
      qualityManager.current!.updateMetrics(deltaTime)
      
      const settings = qualityManager.current!.getSettings()
      
      // Adaptive frame limiting based on quality
      const targetFPS = {
        performance: 30,
        balanced: 45,
        ultra: 60
      }[qualityManager.current!.getTier()]
      
      const frameInterval = 1000 / targetFPS
      
      if (deltaTime < frameInterval * 0.9) {
        animationIdRef.current = requestAnimationFrame(animate)
        return
      }
      
      frameCountRef.current++
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Calculate speed multiplier
      const interactionTime = Date.now()
      let speedMultiplier = 1

      if (isMovingRef.current) {
        speedMultiplier *= 3
      }

      const timeSinceClick = interactionTime - clickBoostRef.current
      if (timeSinceClick < 1200) {
        const clickDecay = 1 - timeSinceClick / 1200
        const clickBoost = 1 + 4 * clickDecay
        speedMultiplier *= clickBoost
      }

      const targetSpeed = speedMultiplier
      speedMultiplierRef.current += (targetSpeed - speedMultiplierRef.current) * 0.2

      const animDeltaTime = 0.008 * speedMultiplierRef.current

      // Update clouds
      cloudsRef.current.forEach((cloud) => {
        // Check visibility periodically
        if (frameCountRef.current - cloud.lastVisibilityCheck >= visibilityCheckInterval.current) {
          cloud.isVisible = isInViewport(
            cloud.x,
            cloud.y,
            cloud.radius * 1.5,
            canvas.width,
            canvas.height
          )
          cloud.lastVisibilityCheck = frameCountRef.current
        }
        
        // Skip updates for invisible clouds
        if (!cloud.isVisible) return
        
        // Update orbital position
        cloud.orbitAngle += cloud.orbitSpeed * animDeltaTime
        cloud.x = cloud.orbitCenterX + Math.cos(cloud.orbitAngle) * cloud.orbitRadius
        cloud.y = cloud.orbitCenterY + Math.sin(cloud.orbitAngle) * cloud.orbitRadius

        // Update effects based on quality
        if (settings.nebulaComplexity !== 'simple') {
          // Opacity pulsing
          cloud.opacityPhase += animDeltaTime * 2
          const opacityPulse = Math.sin(cloud.opacityPhase + cloud.timeOffset) * 0.3 + 1
          cloud.currentOpacity = cloud.baseOpacity * opacityPulse
          
          // Shape morphing (only in medium/complex modes)
          if (settings.nebulaComplexity === 'complex') {
            cloud.morphPhase += animDeltaTime * 0.8
            const morphX = Math.sin(cloud.morphPhase + cloud.timeOffset) * 0.15 + 1
            const morphY = Math.cos(cloud.morphPhase * 1.1 + cloud.timeOffset) * 0.15 + 1
            cloud.scaleX = morphX
            cloud.scaleY = morphY
          }
        }
      })

      // Sort clouds only when needed
      if (cloudsSortNeeded.current) {
        sortedCloudsRef.current = [...cloudsRef.current].sort((a, b) => b.radius - a.radius)
        cloudsSortNeeded.current = false
      }
      
      // Update spatial indexing with current cloud positions
      spatialIndexingRef.current.updateCloudPositions(cloudsRef.current)

      // Render clouds
      ctx.globalCompositeOperation = 'screen'
      sortedCloudsRef.current.forEach((cloud) => {
        renderCloud(cloud, settings)
      })

      // Overlap glow effects (only in ultra mode)
      if (settings.nebulaComplexity === 'complex' && frameCountRef.current % 2 === 0) {
        ctx.globalCompositeOperation = 'screen'
        
        // Use spatial indexing for efficient overlap detection
        const overlaps = spatialIndexingRef.current.findOverlaps(0.8)
        
        overlaps.forEach((overlap) => {
          const cloud1 = cloudsRef.current[overlap.id1]
          const cloud2 = cloudsRef.current[overlap.id2]
          
          // Check if both clouds are still visible
          if (!cloud1.isVisible || !cloud2.isVisible) return
          
          const combinedRadius = (cloud1.radius + cloud2.radius) * 0.8

          const overlapKey = generateGradientKey(
            'nebula_overlap',
            overlap.id1,
            overlap.id2,
            Math.floor(overlap.overlapStrength * 10)
          )
          
          const overlapGlow = gradientCaches.nebula.getRadialGradient(
            overlapKey,
            overlap.midX, overlap.midY, 0,
            overlap.midX, overlap.midY, combinedRadius * 0.3,
            [
              [0, `rgba(255, 255, 255, ${overlap.overlapStrength * 0.02})`],
              [0.5, `rgba(200, 200, 255, ${overlap.overlapStrength * 0.01})`],
              [1, 'rgba(0, 0, 0, 0)']
            ]
          )

          if (overlapGlow) {
            ctx.fillStyle = overlapGlow
            ctx.fillRect(
              overlap.midX - combinedRadius * 0.3,
              overlap.midY - combinedRadius * 0.3,
              combinedRadius * 0.6,
              combinedRadius * 0.6
            )
          }
        })
      }

      animationIdRef.current = requestAnimationFrame(animate)
    }

    // Listen for quality changes
    const handleQualityChange = (e: Event) => {
      const event = e as CustomEvent
      const newSettings = event.detail.settings
      
      // Update cloud count if needed
      const newCount = qualityManager.current!.getAdaptiveCount(
        newSettings.nebulaCloudCount,
        canvas.width,
        canvas.height
      )
      
      if (cloudsRef.current.length !== newCount) {
        // Adjust cloud count
        if (newCount > cloudsRef.current.length) {
          // Add more clouds
          const additionalCount = newCount - cloudsRef.current.length
          const configs = CLOUD_CONFIGS.slice(cloudsRef.current.length, cloudsRef.current.length + additionalCount)
          
          configs.forEach((config, idx) => {
            const index = cloudsRef.current.length + idx
            const baseSize = Math.min(canvas.width, canvas.height)
            
            // Create new cloud similar to initialization
            const sizeVariation = 0.8 + Math.random() * 0.4
            const radius = baseSize * config.sizeMult * sizeVariation
            
            const palette = COLOR_PALETTES[config.type as keyof typeof COLOR_PALETTES]
            const colorIndex = Math.floor(Math.random() * palette.length)
            const color = palette[colorIndex]
            
            const opacityVariation = 0.7 + Math.random() * 0.6
            const baseOpacity = config.baseOpacity * opacityVariation
            
            const orbitIndex = index % orbitalCentersRef.current.length
            const orbitCenter = orbitalCentersRef.current[orbitIndex]
            
            const cloud: Cloud = {
              id: index,
              radius,
              baseOpacity,
              color,
              orbitCenterX: orbitCenter.x,
              orbitCenterY: orbitCenter.y,
              orbitRadius: orbitCenter.baseRadius + (Math.random() * orbitCenter.radiusVariation),
              orbitAngle: Math.random() * Math.PI * 2,
              orbitSpeed: (0.5 + Math.random() * 0.3) / Math.sqrt(radius / (baseSize * 0.4)),
              orbitIndex,
              timeOffset: Math.random() * 100,
              opacityPhase: 0,
              morphPhase: 0,
              x: 0,
              y: 0,
              currentOpacity: baseOpacity,
              scaleX: 1,
              scaleY: 1,
              isVisible: true,
              lastVisibilityCheck: 0
            }
            
            cloud.x = cloud.orbitCenterX + Math.cos(cloud.orbitAngle) * cloud.orbitRadius
            cloud.y = cloud.orbitCenterY + Math.sin(cloud.orbitAngle) * cloud.orbitRadius
            
            cloudsRef.current.push(cloud)
          })
        } else {
          // Remove excess clouds
          cloudsRef.current = cloudsRef.current.slice(0, newCount)
        }
        
        cloudsSortNeeded.current = true
      }
      
      // Update visibility check interval
      visibilityCheckInterval.current = {
        performance: 20,
        balanced: 15,
        ultra: 10
      }[qualityManager.current!.getTier()]
    }
    window.addEventListener('qualityTierChanged', handleQualityChange)

    // Start animation
    animate(performance.now())
    
    // Capture spatial indexing ref for cleanup
    const spatialIndexing = spatialIndexingRef.current

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('qualityTierChanged', handleQualityChange)
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current)
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      gradientCaches.nebula.clear()
      
      // Dispose spatial indexing
      if (spatialIndexing) {
        spatialIndexing.dispose()
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