'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { RenderPipelineFactory } from '@/lib/rendering/pipeline-factory'
import { UnifiedRenderer } from '@/lib/rendering/unified-renderer'
import { IRenderPipeline, MeteorConfig, DirtyFlags } from '@/lib/rendering/interfaces'
import { DebugConfigManager } from '@/lib/performance/debug-config'

interface MeteorShowerProps {
  className?: string
  speedMultiplier?: number
  isPaused?: boolean
}

export default function MeteorShower({
  className = '',
  speedMultiplier = 1,
  isPaused = false,
}: MeteorShowerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const pipelineRef = useRef<IRenderPipeline | null>(null)
  const rendererRef = useRef<UnifiedRenderer | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const [isInitialized, setIsInitialized] = useState(false)
  const lastTimeRef = useRef(0)
  const debugConfig = useRef(DebugConfigManager.getInstance())

  // Generate random meteor spawn configuration
  const generateMeteorConfig = useCallback((canvas: HTMLCanvasElement): MeteorConfig => {
    const side = Math.floor(Math.random() * 4)
    let startX: number, startY: number, endX: number, endY: number

    switch (side) {
      case 0: // Top
        startX = Math.random() * canvas.width
        startY = -50
        endX = Math.random() * canvas.width
        endY = canvas.height + 50
        break
      case 1: // Right
        startX = canvas.width + 50
        startY = Math.random() * canvas.height
        endX = -50
        endY = Math.random() * canvas.height
        break
      case 2: // Bottom
        startX = Math.random() * canvas.width
        startY = canvas.height + 50
        endX = Math.random() * canvas.width
        endY = -50
        break
      default: // Left
        startX = -50
        startY = Math.random() * canvas.height
        endX = canvas.width + 50
        endY = Math.random() * canvas.height
        break
    }

    // Control point for bezier curve
    const controlX = (startX + endX) / 2 + (Math.random() - 0.5) * 200
    const controlY = (startY + endY) / 2 + (Math.random() - 0.5) * 200

    // Random meteor type
    const types: ('cool' | 'warm' | 'bright')[] = ['cool', 'warm', 'bright']
    const type = types[Math.floor(Math.random() * types.length)]

    // Type-based colors
    let colorR: number, colorG: number, colorB: number
    let glowR: number, glowG: number, glowB: number

    switch (type) {
      case 'cool':
        colorR = 150
        colorG = 200
        colorB = 255
        glowR = 100
        glowG = 180
        glowB = 255
        break
      case 'warm':
        colorR = 255
        colorG = 200
        colorB = 150
        glowR = 255
        glowG = 200
        glowB = 100
        break
      default: // bright
        colorR = 255
        colorG = 255
        colorB = 255
        glowR = 255
        glowG = 255
        glowB = 255
        break
    }

    return {
      startX,
      startY,
      controlX,
      controlY,
      endX,
      endY,
      size: 0.5 + Math.random() * 1.5,
      speed: 0.8 + Math.random() * 0.4,
      maxLife: 80 + Math.random() * 40,
      type,
      colorR,
      colorG,
      colorB,
      glowR,
      glowG,
      glowB,
      glowIntensity: 0.7 + Math.random() * 0.3,
    }
  }, [])

  // Initialize render pipeline
  useEffect(() => {
    if (!canvasRef.current || prefersReducedMotion) return

    const canvas = canvasRef.current

    const initPipeline = async () => {
      try {
        // Create render pipeline
        const pipeline = await RenderPipelineFactory.create(canvas, {
          maxMeteors: 20,
          maxParticles: 500,
          enableDebug: debugConfig.current.isEnabled('enableDebugOverlay'),
        })

        // Create unified renderer
        const renderer = new UnifiedRenderer(canvas)

        pipelineRef.current = pipeline
        rendererRef.current = renderer
        setIsInitialized(true)

        if (debugConfig.current.isEnabled('enableConsoleLogs')) {
          console.log('🚀 Meteor shower render pipeline initialized')
        }
      } catch (error) {
        console.error('Failed to initialize render pipeline:', error)
      }
    }

    initPipeline()

    // Cleanup
    return () => {
      if (pipelineRef.current) {
        pipelineRef.current.destroy()
        pipelineRef.current = null
      }
      rendererRef.current = null
      setIsInitialized(false)
    }
  }, [prefersReducedMotion])

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return

      const canvas = canvasRef.current
      const { width, height } = canvas.getBoundingClientRect()

      // Update canvas internal size
      canvas.width = width
      canvas.height = height

      // Update pipeline and renderer
      if (pipelineRef.current) {
        pipelineRef.current.updateCanvasSize?.(width, height)
      }
      if (rendererRef.current) {
        rendererRef.current.updateCanvasSize(width, height)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [isInitialized])

  // Spawn meteors periodically
  useEffect(() => {
    if (!isInitialized || !pipelineRef.current || !canvasRef.current || isPaused) return

    const spawnInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        // 30% chance to spawn
        const config = generateMeteorConfig(canvasRef.current!)
        pipelineRef.current!.spawnMeteor(config)
      }
    }, 1000) // Check every second

    return () => {
      clearInterval(spawnInterval)
    }
  }, [isInitialized, isPaused, generateMeteorConfig])

  // Animation loop
  useEffect(() => {
    if (!isInitialized || !pipelineRef.current || !rendererRef.current || isPaused) return

    const animate = (timestamp: number) => {
      const pipeline = pipelineRef.current!
      const renderer = rendererRef.current!

      // Calculate delta time
      const deltaTime = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0
      lastTimeRef.current = timestamp

      // Cap delta time to prevent large jumps
      const dt = Math.min(deltaTime, 0.1)

      // Update pipeline
      const dirtyFlags = pipeline.updateAll(dt, speedMultiplier)

      // Only render if something changed
      if (dirtyFlags !== 0) {
        // Get render data
        const renderData = pipeline.getRenderData()

        // Clear canvas if meteors changed (full clear for meteors due to trails)
        if (dirtyFlags & DirtyFlags.METEORS) {
          renderer.clear()
        }

        // Render
        renderer.render(renderData)
      }

      // Debug metrics
      if (debugConfig.current.isEnabled('enableDebugOverlay')) {
        const metrics = pipeline.getMetrics()
        // Could render metrics overlay here
      }

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isInitialized, isPaused, speedMultiplier])

  if (prefersReducedMotion) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
      aria-hidden="true"
    />
  )
}
