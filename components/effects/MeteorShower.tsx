'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { QualityManager } from '@/lib/performance/quality-manager'
import { gradientCaches, generateGradientKey } from '@/lib/performance/gradient-cache'
import { DebugConfigManager } from '@/lib/performance/debug-config'
import { 
  ObjectPool, 
  FrameTimer,
  calculateBezierPath,
  calculateBezierPathUniform,
  interpolateBezierPoint,
  isInViewport,
  type BezierPoint
} from '@/lib/performance/performance-utils'
import { getOptimizedFunctions } from '@/lib/wasm'
import { WASMMeteorSystem } from '@/lib/wasm/meteor-system'

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
  opacity: number
  color: { r: number; g: number; b: number }
  active: boolean
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
  startX: number
  startY: number
  endX: number
  endY: number
  controlX: number
  controlY: number
  pathPoints: BezierPoint[]
  pathPointsFlat?: Float32Array  // Pre-flattened path for WASM
  pathIndex: number
  color: { r: number; g: number; b: number }
  glowColor: { r: number; g: number; b: number }
  glowIntensity: number
  active: boolean
  type: 'cool' | 'warm' | 'bright'
  particles: Particle[] // JS ObjectPool: array of particle objects
  particleIndices?: number[] // WASM ParticlePool: array of particle indices
  isVisible: boolean
}

type MeteorType = 'cool' | 'warm' | 'bright'

const BASE_TRAIL_LENGTH = 50  // Increased from 34 to compensate for slower speed
const SPAWN_RATE = 0.08  // Increased from 0.06 for more frequent spawns
const BEZIER_SEGMENTS = 60

export default function MeteorShower2DOptimized() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const meteorsRef = useRef<Meteor[]>([])
  const animationIdRef = useRef<number | undefined>(undefined)
  const prefersReducedMotion = useReducedMotion()
  const frameTimer = useRef(new FrameTimer())
  
  // WASM module state
  const [wasmModule, setWasmModule] = useState<any>(null)
  const [wasmLoading, setWasmLoading] = useState(true)
  const [wasmError, setWasmError] = useState<string | null>(null)
  const meteorSystemRef = useRef<WASMMeteorSystem | null>(null)
  
  // Performance management
  const qualityManager = useRef<QualityManager | undefined>(undefined)
  const particlePool = useRef<any | undefined>(undefined) // WASM ParticlePool
  const particleData = useRef<Particle[]>([]) // JavaScript particle data aligned with WASM indices
  const meteorSystemId = 1 // System ID for meteor particles

  // Mouse interaction state
  const speedMultiplierRef = useRef(1)
  const isMovingRef = useRef(false)
  const clickBoostRef = useRef(0)
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Load WASM module
  useEffect(() => {
    let mounted = true
    
    const loadWasm = async () => {
      try {
        const module = await getOptimizedFunctions()
        
        if (!mounted) return
        
        if (module) {
          setWasmModule(module)
          setWasmError(null)
        } else {
          throw new Error('WASM module returned null')
        }
      } catch (error) {
        if (!mounted) return
        
        console.warn('MeteorShower: Failed to load WASM module, using JS fallback:', error)
        setWasmError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        if (mounted) {
          setWasmLoading(false)
        }
      }
    }
    
    loadWasm()
    
    return () => {
      mounted = false
      // Clean up MeteorSystem if it exists
      if (meteorSystemRef.current) {
        meteorSystemRef.current.cleanup()
        meteorSystemRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (prefersReducedMotion || wasmLoading) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { 
      alpha: true,
      desynchronized: true
    })
    if (!ctx) {
      console.error('Failed to get 2D context')
      return
    }

    
    // Initialize WASM MeteorSystem before starting animation
    let animationStarted = false
    const initMeteorSystem = async () => {
      if (!meteorSystemRef.current) {
        meteorSystemRef.current = new WASMMeteorSystem(window.innerWidth, window.innerHeight)
        const success = await meteorSystemRef.current.initialize()
        if (!success) {
          console.warn('MeteorShower: Failed to initialize WASM MeteorSystem, falling back to JS')
          meteorSystemRef.current = null
        }
      }
      
      // Start animation only after MeteorSystem is initialized
      if (!animationStarted) {
        animationStarted = true
        animate(performance.now())
      }
    }

    // Initialize performance management
    qualityManager.current = QualityManager.getInstance()
    const settings = qualityManager.current.getSettings()
    
    // Initialize gradient cache
    gradientCaches.meteors.setContext(ctx)
    
    // Initialize WASM ParticlePool for better memory locality
    try {
      if (wasmModule && wasmModule.ParticlePool) {
        particlePool.current = new wasmModule.ParticlePool()
        
        // Initialize JavaScript particle data array to match WASM pool capacity
        const capacity = particlePool.current.get_total_capacity()
        particleData.current = Array(capacity).fill(null).map(() => ({
          x: 0, y: 0, vx: 0, vy: 0, life: 0, size: 0, opacity: 1,
          color: { r: 255, g: 255, b: 255 },
          active: false
        }))
      } else {
        throw new Error('WASM ParticlePool not available')
      }
    } catch (error) {
      console.warn('MeteorShower: Failed to initialize WASM ParticlePool, using JS fallback:', error)
      
      // Fallback to JavaScript ObjectPool
      const maxParticlesPerMeteor = 7
      const maxMeteors = settings.meteorCount
      const poolInitialSize = maxMeteors * maxParticlesPerMeteor
      const poolMaxSize = poolInitialSize * 1.5
      
      particlePool.current = new ObjectPool<Particle>(
        () => ({
          x: 0, y: 0, vx: 0, vy: 0, life: 0, size: 0, opacity: 1,
          color: { r: 255, g: 255, b: 255 },
          active: false
        }),
        (particle) => {
          particle.active = false
          particle.life = 0
          particle.opacity = 1
        },
        poolInitialSize,
        poolMaxSize
      )
      particleData.current = [] // Not used in JS fallback mode
    }

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      
      // Update MeteorSystem canvas size if available
      if (meteorSystemRef.current) {
        meteorSystemRef.current.updateCanvasSize(canvas.width, canvas.height)
      }
      
      // Recalculate meteor count based on quality settings
      const meteorCount = qualityManager.current!.getAdaptiveCount(
        settings.meteorCount,
        canvas.width,
        canvas.height
      )
      
      // Initialize or adjust meteor pool while preserving active meteors
      
      if (meteorsRef.current.length !== meteorCount) {
        const currentMeteors = meteorsRef.current
        const activeMeteors = currentMeteors.filter(m => m.active)
        
        if (meteorCount > currentMeteors.length) {
          // Add more meteors
          const additionalCount = meteorCount - currentMeteors.length
          const newMeteors = Array.from({ length: additionalCount }, () => createMeteor())
          meteorsRef.current = [...currentMeteors, ...newMeteors]
        } else {
          // Reduce meteors but keep active ones
          // First, keep all active meteors
          const inactiveMeteors = currentMeteors.filter(m => !m.active)
          const meteorsToKeep = [...activeMeteors]
          
          // Add inactive meteors up to the new count
          const inactiveNeeded = Math.max(0, meteorCount - activeMeteors.length)
          meteorsToKeep.push(...inactiveMeteors.slice(0, inactiveNeeded))
          
          // Ensure we have exactly meteorCount meteors
          while (meteorsToKeep.length < meteorCount) {
            meteorsToKeep.push(createMeteor())
          }
          
          meteorsRef.current = meteorsToKeep.slice(0, meteorCount)
        }
      }
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    
    // Spawn initial meteors with clustered random delays
    const initialMeteorCount = Math.max(3, Math.floor(meteorsRef.current.length * 0.3))
    let spawnIndex = 0
    
    // Create clusters of spawn times
    const spawnClusters = []
    const clusterCount = 3 + Math.floor(Math.random() * 2) // 3-4 clusters
    
    for (let i = 0; i < clusterCount; i++) {
      const clusterTime = Math.random() * 3000 // Clusters spread over 3 seconds
      const clusterSize = Math.ceil(initialMeteorCount / clusterCount)
      
      for (let j = 0; j < clusterSize && spawnIndex < initialMeteorCount; j++) {
        // Add small random offset within cluster (0-300ms)
        const spawnTime = clusterTime + Math.random() * 300
        spawnClusters.push(spawnTime)
        spawnIndex++
      }
    }
    
    // Sort spawn times
    spawnClusters.sort((a, b) => a - b)
    
    // Store timeouts for cleanup
    const spawnTimeouts: NodeJS.Timeout[] = []
    
    // Schedule spawns
    spawnClusters.forEach((delay, index) => {
      const timeout = setTimeout(() => {
        // Find next inactive meteor
        for (let i = 0; i < meteorsRef.current.length; i++) {
          if (meteorsRef.current[i] && !meteorsRef.current[i].active) {
            spawnMeteor(meteorsRef.current[i])
            break
          }
        }
      }, delay)
      spawnTimeouts.push(timeout)
    })
    
    const debugConfig = DebugConfigManager.getInstance()
    if (debugConfig.isEnabled('enableMeteorLogs') || debugConfig.isEnabled('enableConsoleLogs')) {
    }

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
      }, 150)
    }

    const handleClick = () => {
      clickBoostRef.current = Date.now()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)

    // Calculate dynamic particle limit based on meteor size
    function getDynamicParticleLimit(meteor: Meteor): number {
      const settings = qualityManager.current!.getSettings()
      const baseLimit = settings.meteorParticleLimit
      
      // Size-based multiplier: smaller meteors get fewer particles, larger get more
      // But cap it to prevent outlandish amounts
      const sizeMultiplier = Math.pow(meteor.size, 0.6) // Gentle scaling (0.3^0.6 ≈ 0.54, 1.0^0.6 = 1.0)
      const dynamicLimit = Math.ceil(baseLimit * sizeMultiplier)
      
      // Reasonable caps based on quality tier
      const maxLimits = {
        performance: 3,
        balanced: 5, 
        ultra: 7
      }
      
      const tierKey = settings.meteorTrailQuality === 'simple' ? 'performance' : 
                     settings.meteorTrailQuality === 'smooth' ? 'balanced' : 'ultra'
      
      return Math.min(dynamicLimit, maxLimits[tierKey])
    }

    // Create meteor object
    function createMeteor(): Meteor {
      return {
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
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        controlX: 0,
        controlY: 0,
        pathPoints: [],
        pathIndex: 0,
        color: { r: 255, g: 255, b: 255 },
        glowColor: { r: 255, g: 255, b: 255 },
        glowIntensity: 1,
        active: false,
        type: 'cool',
        particles: [], // JS ObjectPool: array of particle objects
        particleIndices: [], // WASM ParticlePool: array of particle indices
        isVisible: true
      }
    }

    // Spawn meteor with pre-calculated path
    function spawnMeteor(meteor: Meteor | number) {
      if (!canvas) return // Safety check
      
      const meteorIndex = typeof meteor === 'number' ? meteor : meteorsRef.current.indexOf(meteor)
      if (meteorIndex === -1 && typeof meteor !== 'number') {
        return
      }
      
      const centerX = canvas.width / 2
      const bottomY = canvas.height + 20 // Extend beyond screen edge
      const spawnType = Math.random()
      
      let startX: number, startY: number, endX: number, endY: number

      if (spawnType < 0.8) {
        // Top spawn (most common)
        startX = Math.random() * canvas.width
        startY = -20
        endX = -20 + Math.random() * (canvas.width + 40) // Can go beyond edges
      } else if (spawnType < 0.9) {
        // Left side spawn
        startX = -20
        startY = Math.random() * canvas.height * 0.3
        endX = -20 + Math.random() * (canvas.width * 0.6) // Can reach left edge
      } else {
        // Right side spawn
        startX = canvas.width + 20
        startY = Math.random() * canvas.height * 0.3
        endX = canvas.width * 0.4 + Math.random() * (canvas.width * 0.6 + 20) // Can reach right edge
      }
      
      endY = bottomY

      // Calculate Bezier control point
      const isLeftSide = startX < canvas.width / 2
      const controlX = isLeftSide ? 
        startX + (endX - startX) * 0.8 :
        startX + (endX - startX) * 0.2
      const controlY = startY + (endY - startY) * 0.6

      const size = 0.3 + Math.random() * 0.7
      
      // Dynamic speed with 0-25% range based on size
      const baseSpeed = 0.66  // Increased base speed by 10%
      const sizeRatio = (size - 0.3) / 0.7  // 0 to 1 range
      
      // Speed increases from base (small meteors) to +25% (large meteors)
      // No negative variations - all meteors at least base speed
      const speedVariation = 0.25 * sizeRatio  // 0 to 0.25 range
      const speed = baseSpeed * (1 + speedVariation)  // 0.66 to 0.825 range
      
      const dx = endX - startX
      const dy = endY - startY
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      const maxLife = Math.floor(distance / speed)

      // Set meteor type and colors
      const typeRandom = Math.random()
      let type: 'cool' | 'warm' | 'bright'
      let color: { r: number; g: number; b: number }
      let glowColor: { r: number; g: number; b: number }
      let glowIntensity: number
      let finalSize = size
      
      if (typeRandom < 0.4) {
        type = 'cool'
        color = { r: 220, g: 240, b: 255 }
        glowColor = { r: 150, g: 200, b: 255 }
        glowIntensity = 0.8 + Math.random() * 0.3
      } else if (typeRandom < 0.7) {
        type = 'warm'
        color = { r: 255, g: 200, b: 150 }
        glowColor = { r: 255, g: 150, b: 100 }
        glowIntensity = 0.9 + Math.random() * 0.4
      } else {
        type = 'bright'
        color = { r: 255, g: 255, b: 255 }
        glowColor = { r: 200, g: 220, b: 255 }
        glowIntensity = 2.0 + Math.random() * 0.5 // Maximum brightness for shine
        finalSize = size * 1.8 // Even larger for dramatic effect
      }
      
      // Try to use WASM MeteorSystem
      if (meteorSystemRef.current && meteorSystemRef.current.isReady()) {
        const success = meteorSystemRef.current.initMeteor({
          index: meteorIndex,
          startX,
          startY,
          controlX,
          controlY,
          endX,
          endY,
          size: finalSize,
          speed,
          maxLife,
          type,
          colorR: color.r,
          colorG: color.g,
          colorB: color.b,
          glowR: glowColor.r,
          glowG: glowColor.g,
          glowB: glowColor.b,
          glowIntensity
        })
        
        
        if (success) {
          // Update JS meteor object for compatibility
          const meteorObj = typeof meteor === 'number' ? meteorsRef.current[meteor] : meteor
          if (meteorObj) {
            // IMPORTANT: Reset all position properties for recycled meteors
            meteorObj.startX = startX
            meteorObj.startY = startY
            meteorObj.endX = endX
            meteorObj.endY = endY
            meteorObj.x = startX
            meteorObj.y = startY
            meteorObj.controlX = controlX
            meteorObj.controlY = controlY
            meteorObj.vx = Math.cos(Math.atan2(dy, dx)) * speed
            meteorObj.vy = Math.sin(Math.atan2(dy, dx)) * speed
            meteorObj.life = 0
            meteorObj.speed = speed
            meteorObj.maxLife = maxLife
            meteorObj.angle = Math.atan2(dy, dx) * 180 / Math.PI
            meteorObj.pathIndex = 0
            meteorObj.active = true
            meteorObj.isVisible = true
            meteorObj.type = type
            meteorObj.size = finalSize
            meteorObj.color = color
            meteorObj.glowColor = glowColor
            meteorObj.glowIntensity = glowIntensity
            meteorObj.trail = []
            meteorObj.particles = []
            meteorObj.particleIndices = []
            meteorObj.pathPoints = []
            meteorObj.pathPointsFlat = undefined
          }
          return
        }
      }
      
      // Fallback to JS implementation
      if (typeof meteor === 'number') {
        return // Can't fallback with just index
      }
      
      meteor.startX = startX
      meteor.startY = startY
      meteor.endX = endX
      meteor.endY = endY
      meteor.x = startX
      meteor.y = startY
      meteor.controlX = controlX
      meteor.controlY = controlY

      // Pre-calculate entire path
      if (wasmModule && wasmModule.precalculate_bezier_path) {
        // Use regular WASM Bezier calculation (natural speed variation)
        try {
          const pathArray = wasmModule.precalculate_bezier_path(
            startX,
            startY,
            controlX,
            controlY,
            endX,
            endY,
            BEZIER_SEGMENTS
          )
          // Store flattened array for WASM interpolation
          meteor.pathPointsFlat = pathArray
          // Also convert to BezierPoint array for compatibility
          meteor.pathPoints = []
          for (let i = 0; i < pathArray.length; i += 2) {
            meteor.pathPoints.push({ x: pathArray[i], y: pathArray[i + 1] })
          }
        } catch (error) {
          console.warn('WASM uniform Bezier calculation failed, trying regular WASM:', error)
          // Try regular WASM Bezier as fallback
          if (wasmModule.precalculate_bezier_path) {
            try {
              const pathArray = wasmModule.precalculate_bezier_path(
                startX,
                startY,
                controlX,
                controlY,
                endX,
                endY,
                BEZIER_SEGMENTS
              )
              meteor.pathPointsFlat = pathArray
              meteor.pathPoints = []
              for (let i = 0; i < pathArray.length; i += 2) {
                meteor.pathPoints.push({ x: pathArray[i], y: pathArray[i + 1] })
              }
            } catch (error2) {
              console.warn('Regular WASM Bezier also failed, falling back to JS:', error2)
              meteor.pathPoints = calculateBezierPath(
                startX,
                startY,
                controlX,
                controlY,
                endX,
                endY,
                BEZIER_SEGMENTS
              )
              meteor.pathPointsFlat = undefined
            }
          } else {
            // JS fallback
            meteor.pathPoints = calculateBezierPath(
              startX,
              startY,
              controlX,
              controlY,
              endX,
              endY,
              BEZIER_SEGMENTS
            )
            meteor.pathPointsFlat = undefined
          }
        }
      } else if (wasmModule && wasmModule.precalculate_bezier_path) {
        // Use regular WASM Bezier if uniform version not available
        try {
          const pathArray = wasmModule.precalculate_bezier_path(
            startX,
            startY,
            controlX,
            controlY,
            endX,
            endY,
            BEZIER_SEGMENTS
          )
          meteor.pathPointsFlat = pathArray
          meteor.pathPoints = []
          for (let i = 0; i < pathArray.length; i += 2) {
            meteor.pathPoints.push({ x: pathArray[i], y: pathArray[i + 1] })
          }
        } catch (error) {
          console.warn('WASM Bezier calculation failed, falling back to JS:', error)
          meteor.pathPoints = calculateBezierPath(
            startX,
            startY,
            controlX,
            controlY,
            endX,
            endY,
            BEZIER_SEGMENTS
          )
          meteor.pathPointsFlat = undefined
        }
      } else {
        // JS fallback
        meteor.pathPoints = calculateBezierPath(
          startX,
          startY,
          controlX,
          controlY,
          endX,
          endY,
          BEZIER_SEGMENTS
        )
        meteor.pathPointsFlat = undefined
      }

      meteor.size = finalSize
      meteor.speed = speed
      meteor.maxLife = maxLife
      meteor.life = 0
      
      meteor.angle = Math.atan2(dy, dx) * 180 / Math.PI
      
      const angleRad = meteor.angle * Math.PI / 180
      meteor.vx = Math.cos(angleRad) * speed
      meteor.vy = Math.sin(angleRad) * speed

      meteor.trail = []
      meteor.type = type
      meteor.color = color
      meteor.glowColor = glowColor
      meteor.glowIntensity = glowIntensity
      meteor.active = true
      meteor.isVisible = true
    }

    // Draw tapered trail based on quality tier
    function drawTaperedTrail(meteor: Meteor, ctx: CanvasRenderingContext2D) {
      const settings = qualityManager.current!.getSettings()
      
      if (meteor.trail.length < 2) return
      
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      
      if (settings.meteorTrailQuality === 'tapered') {
        // High quality tapered trail
        drawHighQualityTaperedTrail(meteor, ctx)
      } else if (settings.meteorTrailQuality === 'smooth') {
        // Medium quality smooth trail
        drawSmoothTrail(meteor, ctx)
      } else {
        // Simple trail for performance
        drawSimpleTrail(meteor, ctx)
      }
      
      ctx.restore()
    }

    function drawHighQualityTaperedTrail(meteor: Meteor, ctx: CanvasRenderingContext2D) {
      const trailLength = meteor.trail.length
      
      if (trailLength < 2) return
      
      // Ensure minimum width for small meteors to prevent artifacts
      const baseWidth = 2  // Minimum base width
      const maxWidth = Math.max(baseWidth, Math.min(meteor.size * 5, 4))
      const minWidth = 0.5  // Increased from 0.1 for better visibility
      
      // Build the trail shape using WASM optimization when available
      ctx.beginPath()
      
      // Try WASM optimization first
      if (wasmModule && wasmModule.calculate_trail_geometry) {
        try {
          // Extract trail coordinates for WASM
          const trailX = new Float32Array(trailLength)
          const trailY = new Float32Array(trailLength)
          
          for (let i = 0; i < trailLength; i++) {
            trailX[i] = meteor.trail[i].x
            trailY[i] = meteor.trail[i].y
          }
          
          // Calculate trail geometry in WASM (much faster)
          const vertices = wasmModule.calculate_trail_geometry(
            trailX,
            trailY, 
            maxWidth,
            minWidth,
            2.5  // taper exponent
          )
          
          if (vertices && vertices.length >= 8) { // Need at least 4 vertices (8 values)
            // Use WASM-calculated vertices to build path
            const vertexCount = vertices.length / 4 // 4 values per point (top_x, top_y, bottom_x, bottom_y)
            
            // Draw top edge using pre-calculated vertices
            for (let i = 0; i < vertexCount; i++) {
              const topX = vertices[i * 4]
              const topY = vertices[i * 4 + 1]
              
              if (i === 0) {
                ctx.moveTo(topX, topY)
              } else {
                ctx.lineTo(topX, topY)
              }
            }
            
            // Draw bottom edge (reverse) using pre-calculated vertices
            for (let i = vertexCount - 1; i >= 0; i--) {
              const bottomX = vertices[i * 4 + 2]
              const bottomY = vertices[i * 4 + 3]
              ctx.lineTo(bottomX, bottomY)
            }
            
            ctx.closePath()
          } else {
            // Fallback to JS if WASM returned insufficient data
            drawTrailFallback()
          }
        } catch (error) {
          console.warn('WASM trail geometry failed, using JS fallback:', error)
          drawTrailFallback()
        }
      } else {
        // Fallback to original JS implementation
        drawTrailFallback()
      }
      
      // Fallback function for trail geometry calculation
      function drawTrailFallback() {
        const trailPoints: { x: number, y: number, width: number }[] = []
        
        for (let i = 0; i < trailLength; i++) {
          const progress = i / (trailLength - 1)  // 0 = oldest (tail), 1 = newest (head)
          const width = maxWidth * Math.pow(progress, 2.5) + minWidth  // REVERSED: thin at tail, thick at head
          trailPoints.push({
            x: meteor.trail[i].x,
            y: meteor.trail[i].y,
            width: width
          })
        }
        
        // Draw top edge
        for (let i = 0; i < trailPoints.length; i++) {
          const point = trailPoints[i]
          const angle = i < trailPoints.length - 1 
            ? Math.atan2(trailPoints[i + 1].y - point.y, trailPoints[i + 1].x - point.x)
            : Math.atan2(point.y - trailPoints[i - 1].y, point.x - trailPoints[i - 1].x)
          
          const perpAngle = angle + Math.PI / 2
          const offsetX = Math.cos(perpAngle) * point.width / 2
          const offsetY = Math.sin(perpAngle) * point.width / 2
          
          if (i === 0) {
            ctx.moveTo(point.x + offsetX, point.y + offsetY)
          } else {
            ctx.lineTo(point.x + offsetX, point.y + offsetY)
          }
        }
        
        // Draw bottom edge (reverse)
        for (let i = trailPoints.length - 1; i >= 0; i--) {
          const point = trailPoints[i]
          const angle = i < trailPoints.length - 1 
            ? Math.atan2(trailPoints[i + 1].y - point.y, trailPoints[i + 1].x - point.x)
            : Math.atan2(point.y - trailPoints[i - 1].y, point.x - trailPoints[i - 1].x)
          
          const perpAngle = angle + Math.PI / 2
          const offsetX = Math.cos(perpAngle) * point.width / 2
          const offsetY = Math.sin(perpAngle) * point.width / 2
          
          ctx.lineTo(point.x - offsetX, point.y - offsetY)
        }
        
        ctx.closePath()
      }
      
      // Enhanced gradient with color transitions - from head to tail
      const gradient = gradientCaches.meteors.getLinearGradient(
        generateGradientKey('trail_tapered_enhanced', meteor.type, Math.floor(meteor.size * 10)),
        meteor.x,  // Start from current position (head)
        meteor.y,
        meteor.trail[0].x,  // To oldest position (tail)
        meteor.trail[0].y,
        [
          // Intense white-hot core at head
          [0, `rgba(255, 255, 255, 1)`],
          [0.02, `rgba(255, 255, 255, 0.9)`],
          // Sharp transition to bright meteor color
          [0.08, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.85)`],
          [0.2, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.7)`],
          // Transition to warmer glow tones
          [0.35, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, 0.5)`],
          // Cool down to blue/purple tones (realistic cooling)
          [0.6, `rgba(${Math.floor(meteor.glowColor.r * 0.6)}, ${Math.floor(meteor.glowColor.g * 0.7)}, ${Math.min(255, Math.floor(meteor.glowColor.b * 1.3))}, 0.3)`],
          [0.8, `rgba(${Math.floor(meteor.glowColor.r * 0.3)}, ${Math.floor(meteor.glowColor.g * 0.4)}, ${Math.min(255, Math.floor(meteor.glowColor.b * 1.5))}, 0.15)`],
          // Dark red-orange ember effect at tail
          [0.95, `rgba(80, 30, 20, 0.05)`],
          [1, `rgba(0, 0, 0, 0)`]
        ]
      )
      
      if (gradient) {
        ctx.fillStyle = gradient
        ctx.fill()
      }
    }

    function drawSmoothTrail(meteor: Meteor, ctx: CanvasRenderingContext2D) {
      // Medium quality - multiple strokes with decreasing width
      const segments = 5
      const baseWidth = 1.5  // Minimum base width for small meteors
      const maxWidth = Math.max(baseWidth, Math.min(meteor.size * 4, 3))
      
      for (let seg = 0; seg < segments; seg++) {
        const segmentProgress = seg / segments
        const width = maxWidth * (1 - segmentProgress)
        const opacity = 1 - segmentProgress * 0.7
        
        ctx.lineWidth = width
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        
        // Enhanced color gradient for smooth trails
        const headIntensity = opacity
        const gradient = gradientCaches.meteors.getLinearGradient(
          generateGradientKey('trail_smooth_enhanced', meteor.type, seg),
          meteor.x,  // From head
          meteor.y,
          meteor.trail[0].x,  // To tail
          meteor.trail[0].y,
          [
            // Intense white-hot at head
            [0, `rgba(255, 255, 255, ${headIntensity})`],
            [0.05, `rgba(255, 255, 255, ${headIntensity * 0.9})`],
            // Sharp transition to meteor color
            [0.15, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, ${headIntensity * 0.75})`],
            [0.35, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${headIntensity * 0.5})`],
            // Cool down with blue shift
            [0.6, `rgba(${Math.floor(meteor.glowColor.r * 0.6)}, ${Math.floor(meteor.glowColor.g * 0.7)}, ${Math.min(255, Math.floor(meteor.glowColor.b * 1.2))}, ${headIntensity * 0.25})`],
            [0.85, `rgba(60, 40, 120, ${headIntensity * 0.1})`], // Dark purple-blue
            [1, `rgba(0, 0, 0, 0)`]
          ]
        )
        
        if (gradient) {
          ctx.strokeStyle = gradient
          ctx.beginPath()
          ctx.moveTo(meteor.trail[0].x, meteor.trail[0].y)
          
          const step = Math.ceil(meteor.trail.length / 10)
          for (let i = step; i < meteor.trail.length; i += step) {
            ctx.lineTo(meteor.trail[i].x, meteor.trail[i].y)
          }
          
          ctx.stroke()
        }
      }
    }

    function drawMeteorHead(
      x: number, 
      y: number, 
      size: number, 
      glowIntensity: number, 
      meteor: { glowColor: { r: number; g: number; b: number }, color: { r: number; g: number; b: number } }, 
      ctx: CanvasRenderingContext2D
    ) {
      ctx.save()
      
      // Balanced shine for visibility on all sizes
      const shineBase = 12  // Increased for small meteor visibility
      const shineScale = size * 5  // Keep scale the same
      const shineSize = shineBase + shineScale
      
      const shineGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, shineSize
      )
      // Reduced white intensity and faster fade
      shineGradient.addColorStop(0, `rgba(255, 255, 255, ${glowIntensity * 0.3})`)
      shineGradient.addColorStop(0.1, `rgba(255, 255, 255, ${glowIntensity * 0.2})`)
      shineGradient.addColorStop(0.2, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${glowIntensity * 0.2})`)
      shineGradient.addColorStop(0.4, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, ${glowIntensity * 0.1})`)
      shineGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = shineGradient
      ctx.fillRect(
        x - shineSize,
        y - shineSize,
        shineSize * 2,
        shineSize * 2
      )
      
      // Bright core - reduced brightness
      const coreSize = size * 3
      const coreGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, coreSize
      )
      coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
      coreGradient.addColorStop(0.2, `rgba(255, 255, 255, 0.7)`)
      coreGradient.addColorStop(0.5, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.6)`)
      coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      
      ctx.fillStyle = coreGradient
      ctx.fillRect(
        x - coreSize,
        y - coreSize,
        coreSize * 2,
        coreSize * 2
      )
      
      ctx.restore()
    }
    
    function drawSimpleTrail(meteor: Meteor, ctx: CanvasRenderingContext2D) {
      // Simple performance mode
      const baseWidth = 1.2  // Minimum width for small meteors
      ctx.lineWidth = Math.max(baseWidth, Math.min(meteor.size * 3, 2.5))
      ctx.lineCap = 'round'
      
      // Enhanced simple gradient with color transitions
      const gradient = gradientCaches.meteors.getLinearGradient(
        generateGradientKey('trail_simple_enhanced', meteor.type),
        meteor.x,  // From head
        meteor.y,
        meteor.trail[0].x,  // To tail
        meteor.trail[0].y,
        [
          // Simplified but still colorful gradient for performance
          [0, `rgba(255, 255, 255, 0.7)`],  // White-hot head
          [0.15, `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, 0.6)`],
          [0.5, `rgba(${meteor.glowColor.r}, ${meteor.glowColor.g}, ${meteor.glowColor.b}, 0.3)`],
          [1, `rgba(0, 0, 0, 0)`]  // Fade to transparent
        ]
      )
      
      if (gradient) {
        ctx.strokeStyle = gradient
        ctx.beginPath()
        ctx.moveTo(meteor.trail[0].x, meteor.trail[0].y)
        
        const step = 3
        for (let i = step; i < meteor.trail.length; i += step) {
          ctx.lineTo(meteor.trail[i].x, meteor.trail[i].y)
        }
        
        ctx.stroke()
      }
    }

    // Animation loop
    let frameCount = 0
    const animate = (currentTime: number) => {
      const deltaTime = frameTimer.current.update(currentTime)
      qualityManager.current!.updateMetrics(deltaTime)
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Debug log on first frame
      if (frameCount === 0) {
        // First frame initialization
      }
      
      // Calculate speed multiplier with limits to prevent meteors from disappearing
      let targetMultiplier = 1
      const timeSinceClick = currentTime - clickBoostRef.current
      const isClickActive = timeSinceClick < 600 && clickBoostRef.current > 0

      if (isClickActive) {
        const decay = 1 - timeSinceClick / 600
        targetMultiplier = 1 + 0.4 * decay  // Further reduced for slower effect
      } else if (isMovingRef.current) {
        targetMultiplier = 1.15  // Further reduced for slower effect
      }

      const smoothingFactor = 0.15
      speedMultiplierRef.current += (targetMultiplier - speedMultiplierRef.current) * smoothingFactor
      
      // Clamp speed multiplier to prevent meteors from completing too quickly
      speedMultiplierRef.current = Math.min(speedMultiplierRef.current, 1.5)
      
      // Check if WASM MeteorSystem is available
      const useWASM = meteorSystemRef.current && meteorSystemRef.current.isReady()
      
      // Log once which path we're using
      if (frameCount === 0) {
      }
      
      if (useWASM) {
        // WASM path: Update meteors using MeteorSystem
        const settings = qualityManager.current!.getSettings()
        const qualityTier = settings.meteorTrailQuality === 'simple' ? 0 : 
                          settings.meteorTrailQuality === 'smooth' ? 1 : 2
        
        // Update all meteors
        const activeMeteorCount = meteorSystemRef.current!.updateMeteors(speedMultiplierRef.current, qualityTier)
        
        // Update particles
        meteorSystemRef.current!.updateParticles(speedMultiplierRef.current)
        
        // Spawn new meteors
        if (Math.random() < SPAWN_RATE) {
          // Find first inactive meteor index
          for (let i = 0; i < meteorsRef.current.length; i++) {
            if (!meteorsRef.current[i].active) {
              spawnMeteor(i)
              break
            }
          }
        }
        
        // Debug log every 60 frames
        if (frameCount++ % 60 === 0) {
          const debugConfig = DebugConfigManager.getInstance()
          if (debugConfig.isEnabled('enableMeteorLogs') || debugConfig.isEnabled('enableConsoleLogs')) {
            const activeParticleCount = meteorSystemRef.current!.getActiveParticleCount()
          }
        }
      } else {
        // JS fallback path
        // Debug log every 60 frames
        if (frameCount++ % 60 === 0) {
          const debugConfig = DebugConfigManager.getInstance()
          if (debugConfig.isEnabled('enableMeteorLogs') || debugConfig.isEnabled('enableConsoleLogs')) {
            const activeMeteors = meteorsRef.current.filter(m => m.active).length
            const totalParticles = meteorsRef.current.reduce((sum, m) => sum + m.particles.length, 0)
          }
        }
        
        // Spawn new meteors
        if (Math.random() < SPAWN_RATE) {
          const inactiveMeteor = meteorsRef.current.find((m) => !m.active)
          if (inactiveMeteor) {
            spawnMeteor(inactiveMeteor)
          }
        }
      }

      // Prepare for batch particle physics if WASM is available
      let allParticles: Particle[] = []
      let particleOwners: number[] = [] // Track which meteor owns each particle
      let batchProcessed = false
      
      if (wasmModule && wasmModule.batch_update_positions && wasmModule.batch_apply_drag) {
        // Collect all particles for batch processing (works with both WASM and JS approaches)
        meteorsRef.current.forEach((meteor, meteorIndex) => {
          if (meteor.active) {
            // Check WASM ParticlePool approach first
            if (meteor.particleIndices && meteor.particleIndices.length > 0) {
              meteor.particleIndices.forEach((particleIndex) => {
                const particle = particleData.current[particleIndex]
                if (particle.active) {
                  allParticles.push(particle)
                  particleOwners.push(meteorIndex)
                }
              })
            }
            // Fallback to JavaScript ObjectPool approach
            else if (meteor.particles.length > 0) {
              meteor.particles.forEach((particle) => {
                allParticles.push(particle)
                particleOwners.push(meteorIndex)
              })
            }
          }
        })
        
        // Perform batch physics updates if we have particles
        if (allParticles.length > 0) {
          try {
            // Extract particle data into arrays
            const positionsX = new Float32Array(allParticles.map(p => p.x))
            const positionsY = new Float32Array(allParticles.map(p => p.y))
            const velocitiesX = new Float32Array(allParticles.map(p => p.vx))
            const velocitiesY = new Float32Array(allParticles.map(p => p.vy))
            
            // Batch update positions
            wasmModule.batch_update_positions(
              positionsX,
              positionsY,
              velocitiesX,
              velocitiesY,
              speedMultiplierRef.current
            )
            
            // Batch apply drag
            wasmModule.batch_apply_drag(
              velocitiesX,
              velocitiesY,
              0.01  // 1 - 0.99 = 0.01 drag coefficient
            )
            
            // Apply results back to particles
            allParticles.forEach((particle, i) => {
              particle.x = positionsX[i]
              particle.y = positionsY[i]
              particle.vx = velocitiesX[i]
              particle.vy = velocitiesY[i]
              particle.life += speedMultiplierRef.current
              
              // Still need to apply random drift (not batched yet)
              particle.vx += (Math.random() - 0.5) * 0.02 * speedMultiplierRef.current
              particle.vy += (Math.random() - 0.5) * 0.02 * speedMultiplierRef.current
            })
            
            batchProcessed = true
          } catch (error) {
            console.warn('Batch particle physics failed, falling back to JS:', error)
            batchProcessed = false
          }
        }
      }

      // Update and draw meteors
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      
      if (useWASM) {
        // WASM rendering path
        const positions = meteorSystemRef.current!.getMeteorPositions()
        const properties = meteorSystemRef.current!.getMeteorProperties()
        const wasmParticleData = meteorSystemRef.current!.getParticleData()
        const particleColors = meteorSystemRef.current!.getParticleColors()
        
        // Debug log WASM data on first few frames
        if (frameCount < 5) {
          // WASM data available
        }
        
        // Update meteor trails and render
        positions.forEach((pos, index) => {
          const meteor = meteorsRef.current[index]
          if (!meteor) return
          
          // Sync active state from WASM
          meteor.active = pos.active
          
          // Clear trail and particles when meteor becomes inactive
          if (!pos.active) {
            meteor.trail = []
            meteor.particles = [] // Clear for JS ObjectPool
            meteor.particleIndices = [] // Clear for WASM ParticlePool
            meteor.life = 0
            return
          }
          
          if (!pos.visible) return
          
          const props = properties[index]
          
          // Update JS meteor object with WASM data for trail management
          meteor.x = pos.x
          meteor.y = pos.y
          meteor.isVisible = pos.visible
          meteor.life = props.lifeRatio * meteor.maxLife  // Sync life from WASM
          
          // Update trail
          meteor.trail.push({ x: pos.x, y: pos.y, opacity: 1 })
          const maxTrailLength = Math.floor(BASE_TRAIL_LENGTH * (0.5 + props.size * 0.5))
          if (meteor.trail.length > maxTrailLength) {
            meteor.trail.shift()
          }
          
          // Spawn particles using WASM
          const settings = qualityManager.current!.getSettings()
          const dynamicParticleLimit = getDynamicParticleLimit(meteor)
          if (dynamicParticleLimit > 0 && meteor.trail.length > 5) {
            const baseSpawnRate = meteor.type === 'bright' ? 0.3 : 0.2
            const spawnRate = baseSpawnRate * Math.max(1, speedMultiplierRef.current * 0.5)
            meteorSystemRef.current!.spawnParticle(index, spawnRate, dynamicParticleLimit)
          }
          
          // Skip rendering if not visible
          if (!pos.visible) return
          
          // Draw trail
          drawTaperedTrail(meteor, ctx)
          
          // Draw meteor head
          drawMeteorHead(pos.x, pos.y, props.size, props.glowIntensity, meteor, ctx)
          
          // Update fade out near end
          if (props.lifeRatio > 0.9) {
            const fadeOpacity = 1 - (props.lifeRatio - 0.9) / 0.1
            meteor.glowIntensity = (meteor.type === 'bright' ? 1.35 : 1) * fadeOpacity
          }
        })
        
        // Render particles from WASM data
        // Parse WASM particle data (x, y, size, opacity, active per particle)
        const PARTICLE_STRIDE = 5
        const particleCount = Math.floor(wasmParticleData.length / PARTICLE_STRIDE)
        
        for (let i = 0; i < particleCount; i++) {
          const baseIndex = i * PARTICLE_STRIDE
          const active = wasmParticleData[baseIndex + 4] > 0.5
          
          if (!active) continue
          
          const particle = {
            x: wasmParticleData[baseIndex],
            y: wasmParticleData[baseIndex + 1],
            size: wasmParticleData[baseIndex + 2],
            opacity: wasmParticleData[baseIndex + 3]
          }
          
          const colorIndex = i * 3
          const color = {
            r: particleColors[colorIndex] || 255,
            g: particleColors[colorIndex + 1] || 255,
            b: particleColors[colorIndex + 2] || 255
          }
          
          // Create radiant shine gradient
          const shineSize = particle.size * 8
          const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, shineSize
          )
          
          // Bright white core with colored glow
          gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity})`)
          gradient.addColorStop(0.2, `rgba(255, 255, 255, ${particle.opacity * 0.8})`)
          gradient.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.opacity * 0.6})`)
          gradient.addColorStop(0.7, `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.opacity * 0.3})`)
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
          
          // Draw with screen blend for glow effect
          ctx.save()
          ctx.globalCompositeOperation = 'screen'
          ctx.fillStyle = gradient
          ctx.fillRect(
            particle.x - shineSize,
            particle.y - shineSize,
            shineSize * 2,
            shineSize * 2
          )
          ctx.restore()
        }
      } else {
        // JS fallback rendering path
        meteorsRef.current.forEach((meteor) => {
          if (!meteor.active) return

          // Check visibility
          meteor.isVisible = isInViewport(
            meteor.x, 
            meteor.y, 
            50, 
            canvas.width, 
            canvas.height
          )

          // Update position from pre-calculated path with safeguards
          const lifeIncrement = Math.min(speedMultiplierRef.current, 2.0)  // Cap increment
          meteor.life += lifeIncrement
          const t = Math.min(meteor.life / meteor.maxLife, 1)
          
          // Use WASM interpolation if available
          if (wasmModule && wasmModule.interpolate_bezier_point && meteor.pathPointsFlat) {
            try {
              const wasmPos = wasmModule.interpolate_bezier_point(meteor.pathPointsFlat, t)
              meteor.x = wasmPos[0]
              meteor.y = wasmPos[1]
            } catch (error) {
              // Fallback to JS interpolation
              const newPos = interpolateBezierPoint(meteor.pathPoints, t)
              meteor.x = newPos.x
              meteor.y = newPos.y
            }
          } else {
            // JS fallback
            const newPos = interpolateBezierPoint(meteor.pathPoints, t)
            meteor.x = newPos.x
            meteor.y = newPos.y
          }

          // Update trail
          meteor.trail.push({ x: meteor.x, y: meteor.y, opacity: 1 })
          
          const maxTrailLength = Math.floor(BASE_TRAIL_LENGTH * (0.5 + meteor.size * 0.5))
          if (meteor.trail.length > maxTrailLength) {
            meteor.trail.shift()
          }

          // Update particles if quality allows - particles are "left behind" along the path
          const settings = qualityManager.current!.getSettings()
          const dynamicParticleLimit = getDynamicParticleLimit(meteor)
          if (dynamicParticleLimit > 0 && meteor.trail.length > 5) {
            // Spawn particles from current position (head) that get left behind
            const baseSpawnRate = meteor.type === 'bright' ? 0.3 : 0.2
            const spawnRate = baseSpawnRate * Math.max(1, speedMultiplierRef.current * 0.5)
            // Check current particle count (works with both WASM and JS approaches)
            const currentParticleCount = meteor.particleIndices ? meteor.particleIndices.length : meteor.particles.length
            
            if (Math.random() < spawnRate && currentParticleCount < dynamicParticleLimit) {
              // Try WASM ParticlePool first, fallback to JS ObjectPool
              if (particlePool.current && typeof particlePool.current.allocate === 'function') {
                // WASM ParticlePool path
                const particleIndex = particlePool.current.allocate(meteorSystemId)
                if (particleIndex !== undefined) {
                  // Initialize particle indices array if needed
                  if (!meteor.particleIndices) {
                    meteor.particleIndices = []
                  }
                  
                  // Get particle object from data array using index
                  const particle = particleData.current[particleIndex]
                  
                  // Configure particle (same logic as before)
                  particle.x = meteor.x + (Math.random() - 0.5) * meteor.size * 2
                  particle.y = meteor.y + (Math.random() - 0.5) * meteor.size * 2
                  
                  particle.vx = -meteor.vx * (0.1 + Math.random() * 0.15)
                  particle.vy = -meteor.vy * (0.1 + Math.random() * 0.15)
                  
                  const lateralSpeed = 0.4 + Math.random() * 0.4
                  const lateralAngle = Math.random() * Math.PI * 2
                  
                  particle.vx += Math.cos(lateralAngle) * lateralSpeed
                  particle.vy += Math.sin(lateralAngle) * lateralSpeed
                  
                  const particleAngleRad = meteor.angle * Math.PI / 180
                  const meteorDirX = Math.cos(particleAngleRad)
                  const meteorDirY = Math.sin(particleAngleRad)
                  const forwardSpeed = particle.vx * meteorDirX + particle.vy * meteorDirY
                  
                  if (forwardSpeed > Math.sqrt(meteor.vx * meteor.vx + meteor.vy * meteor.vy) * 0.5) {
                    particle.vx -= meteorDirX * forwardSpeed * 0.7
                    particle.vy -= meteorDirY * forwardSpeed * 0.7
                  }
                  
                  particle.life = 0
                  
                  const baseParticleSize = 0.21
                  const meteorSizeRatio = (meteor.size - 0.3) / 0.7
                  const sizeVariation = 0.25 * meteorSizeRatio
                  const dynamicSize = baseParticleSize * (1 + sizeVariation)
                  particle.size = dynamicSize * (0.9 + Math.random() * 0.2)
                  
                  const baseOpacity = 0.64
                  const opacityVariation = 0.25 * meteorSizeRatio
                  particle.opacity = baseOpacity * (1 + opacityVariation)
                  
                  particle.color = { ...meteor.glowColor }
                  particle.active = true
                  
                  // Store particle index instead of object
                  meteor.particleIndices.push(particleIndex)
                }
              } else {
                // JavaScript ObjectPool fallback
                const particle = particlePool.current!.acquire()
                
                particle.x = meteor.x + (Math.random() - 0.5) * meteor.size * 2
                particle.y = meteor.y + (Math.random() - 0.5) * meteor.size * 2
                
                particle.vx = -meteor.vx * (0.1 + Math.random() * 0.15)
                particle.vy = -meteor.vy * (0.1 + Math.random() * 0.15)
                
                const lateralSpeed = 0.4 + Math.random() * 0.4
                const lateralAngle = Math.random() * Math.PI * 2
                
                particle.vx += Math.cos(lateralAngle) * lateralSpeed
                particle.vy += Math.sin(lateralAngle) * lateralSpeed
                
                const particleAngleRad = meteor.angle * Math.PI / 180
                const meteorDirX = Math.cos(particleAngleRad)
                const meteorDirY = Math.sin(particleAngleRad)
                const forwardSpeed = particle.vx * meteorDirX + particle.vy * meteorDirY
                
                if (forwardSpeed > Math.sqrt(meteor.vx * meteor.vx + meteor.vy * meteor.vy) * 0.5) {
                  particle.vx -= meteorDirX * forwardSpeed * 0.7
                  particle.vy -= meteorDirY * forwardSpeed * 0.7
                }
                
                particle.life = 0
                
                const baseParticleSize = 0.21
                const meteorSizeRatio = (meteor.size - 0.3) / 0.7
                const sizeVariation = 0.25 * meteorSizeRatio
                const dynamicSize = baseParticleSize * (1 + sizeVariation)
                particle.size = dynamicSize * (0.9 + Math.random() * 0.2)
                
                const baseOpacity = 0.64
                const opacityVariation = 0.25 * meteorSizeRatio
                particle.opacity = baseOpacity * (1 + opacityVariation)
                
                particle.color = { ...meteor.glowColor }
                particle.active = true
                meteor.particles.push(particle)
              }
            }
          }

          // Update particles (works with both WASM and JS approaches)
          if (meteor.particleIndices && particlePool.current && typeof particlePool.current.free === 'function') {
            // WASM ParticlePool path - filter by index
            meteor.particleIndices = meteor.particleIndices.filter((particleIndex) => {
              const particle = particleData.current[particleIndex]
              
              if (!batchProcessed) {
                particle.x += particle.vx * lifeIncrement
                particle.y += particle.vy * lifeIncrement
                particle.life += lifeIncrement
                
                particle.vx *= 0.99
                particle.vy *= 0.99
                
                particle.vx += (Math.random() - 0.5) * 0.02 * lifeIncrement
                particle.vy += (Math.random() - 0.5) * 0.02 * lifeIncrement
              }
              
              if (particle.life >= 50) {
                particle.active = false
                particlePool.current!.free(particleIndex)
                return false
              }
              return true
            })
          } else {
            // JavaScript ObjectPool fallback
            meteor.particles = meteor.particles.filter((particle) => {
              if (!batchProcessed) {
                particle.x += particle.vx * lifeIncrement
                particle.y += particle.vy * lifeIncrement
                particle.life += lifeIncrement
                
                particle.vx *= 0.99
                particle.vy *= 0.99
                
                particle.vx += (Math.random() - 0.5) * 0.02 * lifeIncrement
                particle.vy += (Math.random() - 0.5) * 0.02 * lifeIncrement
              }
              
              if (particle.life >= 50) {
                particlePool.current!.release(particle)
                return false
              }
              return true
            })
          }

          // Check if meteor is done
          if (t >= 1 || meteor.life >= meteor.maxLife) {
            meteor.active = false
            
            // Release all particles (works with both WASM and JS approaches)
            if (meteor.particleIndices && particlePool.current && typeof particlePool.current.free_block === 'function') {
              // WASM ParticlePool path - bulk release by indices
              if (meteor.particleIndices.length > 0) {
                // Mark particles as inactive
                meteor.particleIndices.forEach(index => {
                  particleData.current[index].active = false
                })
                // Free the block of particles
                const indices = new Uint32Array(meteor.particleIndices)
                particlePool.current.free_block(indices)
                meteor.particleIndices = []
              }
            } else {
              // JavaScript ObjectPool fallback
              meteor.particles.forEach(p => particlePool.current!.release(p))
              meteor.particles = []
              meteor.particleIndices = [] // Clear for consistency
            }
            return
          }

          // Skip rendering if not visible
          if (!meteor.isVisible) return

          // Draw trail
          drawTaperedTrail(meteor, ctx)

          // Draw particles with radiant shine effect (works with both WASM and JS approaches)
          if (meteor.particleIndices && meteor.particleIndices.length > 0) {
            // WASM ParticlePool path - render by indices
            meteor.particleIndices.forEach((particleIndex) => {
              const particle = particleData.current[particleIndex]
              if (!particle.active) {
                return
              }
              
              const lifetimeFade = Math.pow(1 - particle.life / 50, 0.3)
              const finalOpacity = particle.opacity * lifetimeFade
              
              const shineSize = particle.size * 8
              const gradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, shineSize
              )
              
              gradient.addColorStop(0, `rgba(255, 255, 255, ${finalOpacity})`)
              gradient.addColorStop(0.2, `rgba(255, 255, 255, ${finalOpacity * 0.8})`)
              gradient.addColorStop(0.4, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${finalOpacity * 0.6})`)
              gradient.addColorStop(0.7, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${finalOpacity * 0.3})`)
              gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
              
              ctx.save()
              ctx.globalCompositeOperation = 'screen'
              ctx.fillStyle = gradient
              ctx.fillRect(
                particle.x - shineSize,
                particle.y - shineSize,
                shineSize * 2,
                shineSize * 2
              )
              ctx.restore()
            })
          } else if (meteor.particles.length > 0) {
            // JavaScript ObjectPool fallback - render by objects
            meteor.particles.forEach((particle) => {
              const lifetimeFade = Math.pow(1 - particle.life / 50, 0.3)
              const finalOpacity = particle.opacity * lifetimeFade
              
              const shineSize = particle.size * 8
              const gradient = ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, shineSize
              )
              
              gradient.addColorStop(0, `rgba(255, 255, 255, ${finalOpacity})`)
              gradient.addColorStop(0.2, `rgba(255, 255, 255, ${finalOpacity * 0.8})`)
              gradient.addColorStop(0.4, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${finalOpacity * 0.6})`)
              gradient.addColorStop(0.7, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${finalOpacity * 0.3})`)
              gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
              
              ctx.save()
              ctx.globalCompositeOperation = 'screen'
              ctx.fillStyle = gradient
              ctx.fillRect(
                particle.x - shineSize,
                particle.y - shineSize,
                shineSize * 2,
                shineSize * 2
              )
              ctx.restore()
            })
          }

          // Draw meteor head
          drawMeteorHead(meteor.x, meteor.y, meteor.size, meteor.glowIntensity, meteor, ctx)

          // Fade out near end
          if (t > 0.9) {
            const fadeOpacity = 1 - (t - 0.9) / 0.1
            meteor.glowIntensity = (meteor.type === 'bright' ? 1.35 : 1) * fadeOpacity
          }
        })
      }

      ctx.restore()

      animationIdRef.current = requestAnimationFrame(animate)
    }

    // Listen for quality changes
    const handleQualityChange = (e: Event) => {
      const event = e as CustomEvent
      const newSettings = event.detail.settings
      
      // Get new meteor count
      const newCount = qualityManager.current!.getAdaptiveCount(
        newSettings.meteorCount,
        canvas.width,
        canvas.height
      )
      
      // Only adjust if count actually changed
      if (meteorsRef.current.length !== newCount) {
        // Preserve active meteors when adjusting count
        const activeMeteors = meteorsRef.current.filter(m => m.active)
        
        if (newCount > meteorsRef.current.length) {
          // Add more meteors
          const additionalCount = newCount - meteorsRef.current.length
          const newMeteors = Array.from({ length: additionalCount }, () => createMeteor())
          meteorsRef.current = [...meteorsRef.current, ...newMeteors]
        } else if (newCount < meteorsRef.current.length) {
          // Reduce meteors but keep active ones
          const inactiveMeteors = meteorsRef.current.filter(m => !m.active)
          const meteorsToKeep = [...activeMeteors]
          
          // Add inactive meteors up to the new count
          const inactiveNeeded = Math.max(0, newCount - activeMeteors.length)
          meteorsToKeep.push(...inactiveMeteors.slice(0, inactiveNeeded))
          
          // Ensure we have exactly newCount meteors
          while (meteorsToKeep.length < newCount) {
            meteorsToKeep.push(createMeteor())
          }
          
          meteorsRef.current = meteorsToKeep.slice(0, newCount)
        }
        
        const debugConfig = DebugConfigManager.getInstance()
        if (debugConfig.isEnabled('enableMeteorLogs') || debugConfig.isEnabled('enableConsoleLogs')) {
        }
      }
    }
    window.addEventListener('qualityTierChanged', handleQualityChange)

    // Start initialization (animation will start after WASM init)
    initMeteorSystem()

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('qualityTierChanged', handleQualityChange)
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current)
      }
      // Clear spawn timeouts
      spawnTimeouts.forEach(timeout => clearTimeout(timeout))
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      gradientCaches.meteors.clear()
      particlePool.current?.clear()
      // Clean up MeteorSystem if it exists
      if (meteorSystemRef.current) {
        meteorSystemRef.current.cleanup()
        meteorSystemRef.current = null
      }
    }
  }, [prefersReducedMotion, wasmModule, wasmLoading])

  if (prefersReducedMotion) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ 
        zIndex: 3 // Above nebula (2) but below content (10)
      }}
      aria-hidden="true"
    />
  )
}