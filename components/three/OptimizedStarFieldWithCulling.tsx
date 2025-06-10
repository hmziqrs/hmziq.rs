'use client'

import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Performance monitoring
let frameCount = 0
let lastTime = performance.now()
let fps = 60
let culledSectors = 0
let totalSectors = 0

// LOD (Level of Detail) configuration
const LOD_LEVELS = {
  NEAR: { distance: 30, quality: 'full' },
  MEDIUM: { distance: 70, quality: 'medium' },
  FAR: { distance: Infinity, quality: 'simple' }
}

// Spatial subdivision configuration
const SECTORS_PER_LOD = {
  NEAR: 8,    // 8 sectors for near stars (more granular culling)
  MEDIUM: 6,  // 6 sectors for medium stars
  FAR: 4      // 4 sectors for far stars (less granular, they're small anyway)
}

// Pre-calculated sin lookup table for performance
const SIN_TABLE_SIZE = 1024
const SIN_TABLE = new Float32Array(SIN_TABLE_SIZE)
for (let i = 0; i < SIN_TABLE_SIZE; i++) {
  SIN_TABLE[i] = Math.sin((i / SIN_TABLE_SIZE) * Math.PI * 2)
}

// Fast sin approximation using lookup table
function fastSin(x: number): number {
  const normalized = ((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  const index = Math.floor((normalized / (Math.PI * 2)) * SIN_TABLE_SIZE)
  return SIN_TABLE[index]
}

// Simplified shaders for different LOD levels
const SIMPLE_VERTEX_SHADER = `
  attribute float size;
  attribute vec3 customColor;
  varying vec3 vColor;
  
  void main() {
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const SIMPLE_FRAGMENT_SHADER = `
  varying vec3 vColor;
  
  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    
    // Simple circular fade
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    
    gl_FragColor = vec4(vColor, alpha);
  }
`

const MEDIUM_VERTEX_SHADER = `
  attribute float size;
  attribute vec3 customColor;
  attribute float twinkle; // Pre-calculated in CPU
  varying vec3 vColor;
  varying float vTwinkle;
  varying float vSize;
  
  void main() {
    vColor = customColor;
    vTwinkle = twinkle;
    vSize = size;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const MEDIUM_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vTwinkle;
  varying float vSize;
  
  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    
    // Soft circular shape with simple glow
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    float glow = exp(-dist * 3.0) * 0.5 * (vSize / 10.0);
    
    vec3 finalColor = vColor + glow;
    gl_FragColor = vec4(finalColor * vTwinkle, alpha);
  }
`

// Full quality shader (optimized version of original)
const FULL_VERTEX_SHADER = `
  attribute float size;
  attribute vec3 customColor;
  attribute float twinkle;
  attribute float sparkle;
  varying vec3 vColor;
  varying float vSize;
  varying float vTwinkle;
  varying float vSparkle;
  
  void main() {
    vColor = customColor;
    vSize = size;
    vTwinkle = twinkle;
    vSparkle = sparkle;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FULL_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vSize;
  varying float vTwinkle;
  varying float vSparkle;
  
  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    
    // Soft circular shape
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    
    // Glow effect
    float glow = exp(-dist * 2.0) * 0.8 * (vSize / 10.0);
    
    // Simplified spike effect (only when sparkling)
    float spike = 0.0;
    if (vSparkle > 0.1) {
      // Use step functions instead of complex trig
      vec2 coord = gl_PointCoord - 0.5;
      float cross = step(0.95, abs(coord.x)) + step(0.95, abs(coord.y));
      spike = cross * vSparkle * (1.0 - dist * 2.0);
    }
    
    vec3 finalColor = vColor + glow;
    float finalAlpha = alpha + spike * 0.5;
    
    gl_FragColor = vec4(finalColor * vTwinkle, finalAlpha);
  }
`

interface StarSector {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  twinkles: Float32Array | null
  sparkles: Float32Array | null
  count: number
  material: THREE.ShaderMaterial
  mesh: React.RefObject<THREE.Points>
  centerVector: THREE.Vector3 // Center direction of this sector for culling
  sectorIndex: number
}

interface StarLODGroup {
  sectors: StarSector[]
  lodLevel: string
  updateRate: number
}

function Stars() {
  const [screenDimensions, setScreenDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  })

  // Mouse interaction state
  const speedMultiplierRef = useRef(1)
  const isMovingRef = useRef(false)
  const clickBoostRef = useRef(0)
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout>()

  // Rotation tracking
  const rotationXRef = useRef(0)
  const rotationYRef = useRef(0)
  const lastFrameTimeRef = useRef(0)

  // Frame counter for temporal optimization
  const frameCounterRef = useRef(0)

  // Create refs for all sectors
  const sectorMeshRefs = useRef<{ [key: string]: React.RefObject<THREE.Points> }>({})

  useEffect(() => {
    const handleResize = () => {
      setScreenDimensions({ width: window.innerWidth, height: window.innerHeight })
    }

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

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)
    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', handleScroll)
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current)
      }
    }
  }, [])

  const starLODGroups = useMemo(() => {
    // Calculate total star count
    const baseStarDensity = 0.6
    const screenArea = screenDimensions.width * screenDimensions.height
    const totalCount = Math.floor((screenArea / 1000) * baseStarDensity)

    // Distribute stars across LOD levels
    const nearCount = Math.floor(totalCount * 0.15) // 15% near
    const mediumCount = Math.floor(totalCount * 0.35) // 35% medium
    const farCount = totalCount - nearCount - mediumCount // 50% far

    // Seed function for consistent values
    const seed = (i: number) => {
      let x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
      return x - Math.floor(x)
    }

    // Helper to create star sectors for a LOD group
    const createStarLODGroup = (
      totalCount: number,
      startIndex: number,
      minRadius: number,
      maxRadius: number,
      lodLevel: string,
      sectorCount: number
    ): StarLODGroup => {
      const sectors: StarSector[] = []
      const starsPerSector = Math.ceil(totalCount / sectorCount)

      // Create sectors
      for (let sectorIdx = 0; sectorIdx < sectorCount; sectorIdx++) {
        // Calculate sector boundaries (spherical segments)
        const phiStart = (sectorIdx / sectorCount) * Math.PI * 2
        const phiEnd = ((sectorIdx + 1) / sectorCount) * Math.PI * 2
        
        // Center direction of this sector (for culling reference)
        const phiCenter = (phiStart + phiEnd) / 2
        const centerVector = new THREE.Vector3(
          Math.cos(phiCenter),
          0,
          Math.sin(phiCenter)
        )

        // Allocate arrays for this sector
        const sectorStarCount = Math.min(starsPerSector, totalCount - sectorIdx * starsPerSector)
        if (sectorStarCount <= 0) continue

        const positions = new Float32Array(sectorStarCount * 3)
        const colors = new Float32Array(sectorStarCount * 3)
        const sizes = new Float32Array(sectorStarCount)
        const twinkles = lodLevel !== 'simple' ? new Float32Array(sectorStarCount) : null
        const sparkles = lodLevel === 'full' ? new Float32Array(sectorStarCount) : null

        // Fill sector with stars
        for (let i = 0; i < sectorStarCount; i++) {
          const globalIndex = startIndex + sectorIdx * starsPerSector + i
          const i3 = i * 3

          // Position - constrained to this sector
          const radius = minRadius + seed(globalIndex) * (maxRadius - minRadius)
          const phi = phiStart + seed(globalIndex + 1000) * (phiEnd - phiStart)
          const theta = Math.acos(2 * seed(globalIndex + 2000) - 1)

          positions[i3] = radius * Math.sin(theta) * Math.cos(phi)
          positions[i3 + 1] = radius * Math.cos(theta)
          positions[i3 + 2] = radius * Math.sin(theta) * Math.sin(phi)

          // Colors
          const colorChoice = seed(globalIndex + 3000)
          if (colorChoice < 0.5) {
            colors[i3] = colors[i3 + 1] = colors[i3 + 2] = 1
          } else if (colorChoice < 0.7) {
            colors[i3] = 0.6
            colors[i3 + 1] = 0.8
            colors[i3 + 2] = 1
          } else if (colorChoice < 0.85) {
            colors[i3] = 1
            colors[i3 + 1] = 0.8
            colors[i3 + 2] = 0.4
          } else {
            colors[i3] = 0.8
            colors[i3 + 1] = 0.6
            colors[i3 + 2] = 1
          }

          // Sizes
          const sizeRandom = seed(globalIndex + 4000)
          const baseSize = sizeRandom < 0.7 ? 1 + seed(globalIndex + 5000) * 1.5 : 2.5 + seed(globalIndex + 6000) * 2
          sizes[i] = lodLevel === 'simple' ? baseSize * 0.8 : baseSize

          // Initial twinkle and sparkle values
          if (twinkles) twinkles[i] = 1.0
          if (sparkles) sparkles[i] = 0.0
        }

        // Create material based on LOD
        let material: THREE.ShaderMaterial
        if (lodLevel === 'simple') {
          material = new THREE.ShaderMaterial({
            uniforms: {},
            vertexShader: SIMPLE_VERTEX_SHADER,
            fragmentShader: SIMPLE_FRAGMENT_SHADER,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        } else if (lodLevel === 'medium') {
          material = new THREE.ShaderMaterial({
            uniforms: {},
            vertexShader: MEDIUM_VERTEX_SHADER,
            fragmentShader: MEDIUM_FRAGMENT_SHADER,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        } else {
          material = new THREE.ShaderMaterial({
            uniforms: {},
            vertexShader: FULL_VERTEX_SHADER,
            fragmentShader: FULL_FRAGMENT_SHADER,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        }

        // Create ref for this sector
        const refKey = `${lodLevel}_${sectorIdx}`
        if (!sectorMeshRefs.current[refKey]) {
          sectorMeshRefs.current[refKey] = React.createRef<THREE.Points>()
        }

        sectors.push({
          positions,
          colors,
          sizes,
          twinkles,
          sparkles,
          count: sectorStarCount,
          material,
          mesh: sectorMeshRefs.current[refKey],
          centerVector,
          sectorIndex: sectorIdx
        })
      }

      return {
        sectors,
        lodLevel,
        updateRate: lodLevel === 'full' ? 1 : lodLevel === 'medium' ? 2 : 0
      }
    }

    // Create LOD groups with spatial sectors
    const near = createStarLODGroup(nearCount, 0, 20, 30, 'full', SECTORS_PER_LOD.NEAR)
    const medium = createStarLODGroup(mediumCount, nearCount, 30, 70, 'medium', SECTORS_PER_LOD.MEDIUM)
    const far = createStarLODGroup(farCount, nearCount + mediumCount, 70, 150, 'simple', SECTORS_PER_LOD.FAR)

    // Count total sectors for stats
    totalSectors = near.sectors.length + medium.sectors.length + far.sectors.length

    return { near, medium, far }
  }, [screenDimensions])

  // Update twinkle and sparkle values for a sector
  const updateSectorEffects = (sector: StarSector, time: number) => {
    if (!sector.twinkles) return

    const { positions, twinkles, sparkles, count } = sector

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const x = positions[i3]
      const y = positions[i3 + 1]

      // Use fast sin approximation
      const twinkleBase = fastSin(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7
      
      // Sparkle effect - simplified
      if (sparkles) {
        const sparklePhase = fastSin(time * 15.0 + x * 20.0 + y * 30.0)
        const sparkle = sparklePhase > 0.98 ? (sparklePhase - 0.98) / 0.02 : 0
        twinkles[i] = twinkleBase + sparkle
        sparkles[i] = sparkle
      } else {
        twinkles[i] = twinkleBase
      }
    }

    // Update attributes if mesh exists
    if (sector.mesh.current) {
      const geometry = sector.mesh.current.geometry
      const twinkleAttr = geometry.getAttribute('twinkle') as THREE.BufferAttribute
      const sparkleAttr = geometry.getAttribute('sparkle') as THREE.BufferAttribute
      
      if (twinkleAttr) twinkleAttr.needsUpdate = true
      if (sparkleAttr) sparkleAttr.needsUpdate = true
    }
  }

  useFrame((state) => {
    frameCounterRef.current++

    // Update FPS and culling stats every 30 frames
    if (frameCounterRef.current % 30 === 0) {
      const currentTime = performance.now()
      fps = 30000 / (currentTime - lastTime)
      lastTime = currentTime

      // Count visible sectors
      culledSectors = 0
      Object.values(sectorMeshRefs.current).forEach(meshRef => {
        if (meshRef.current && !meshRef.current.visible) {
          culledSectors++
        }
      })
    }

    // Calculate delta time
    const currentFrameTime = state.clock.elapsedTime
    const deltaTime = lastFrameTimeRef.current === 0 ? 0.016 : currentFrameTime - lastFrameTimeRef.current
    lastFrameTimeRef.current = currentFrameTime

    // Calculate speed multiplier
    const currentTime = Date.now()
    let speedMultiplier = 1

    if (isMovingRef.current) {
      speedMultiplier *= 4.5
    }

    const timeSinceClick = currentTime - clickBoostRef.current
    if (timeSinceClick < 1200) {
      const clickDecay = 1 - timeSinceClick / 1200
      const clickBoost = 1 + 4.3 * clickDecay
      speedMultiplier *= clickBoost
    }

    const targetSpeed = speedMultiplier
    speedMultiplierRef.current += (targetSpeed - speedMultiplierRef.current) * 0.2

    // Update rotation
    const baseRotationSpeedX = 0.02
    const baseRotationSpeedY = 0.01
    rotationXRef.current += baseRotationSpeedX * speedMultiplierRef.current * deltaTime
    rotationYRef.current += baseRotationSpeedY * speedMultiplierRef.current * deltaTime

    // Apply rotation to all sector meshes
    Object.values(sectorMeshRefs.current).forEach(meshRef => {
      if (meshRef.current) {
        meshRef.current.rotation.x = rotationXRef.current
        meshRef.current.rotation.y = rotationYRef.current
      }
    })

    // Update star effects based on LOD and update rate
    const time = state.clock.elapsedTime
    
    // Update near stars every frame
    if (starLODGroups.near.updateRate > 0 && frameCounterRef.current % starLODGroups.near.updateRate === 0) {
      starLODGroups.near.sectors.forEach(sector => updateSectorEffects(sector, time))
    }
    
    // Update medium stars every 2 frames
    if (starLODGroups.medium.updateRate > 0 && frameCounterRef.current % starLODGroups.medium.updateRate === 0) {
      starLODGroups.medium.sectors.forEach(sector => updateSectorEffects(sector, time))
    }
    
    // Far stars don't update (updateRate = 0)
  })

  // Render all star sectors
  const renderStarSector = (sector: StarSector, lodLevel: string) => (
    <points 
      key={`${lodLevel}_${sector.sectorIndex}`} 
      ref={sector.mesh} 
      material={sector.material}
      frustumCulled={true} // Explicitly enable frustum culling
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[sector.positions, 3]} />
        <bufferAttribute attach="attributes-customColor" args={[sector.colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sector.sizes, 1]} />
        {sector.twinkles && <bufferAttribute attach="attributes-twinkle" args={[sector.twinkles, 1]} />}
        {sector.sparkles && <bufferAttribute attach="attributes-sparkle" args={[sector.sparkles, 1]} />}
      </bufferGeometry>
    </points>
  )

  return (
    <>
      {/* Render all sectors from all LOD groups */}
      {starLODGroups.far.sectors.map(sector => renderStarSector(sector, 'far'))}
      {starLODGroups.medium.sectors.map(sector => renderStarSector(sector, 'medium'))}
      {starLODGroups.near.sectors.map(sector => renderStarSector(sector, 'near'))}
    </>
  )
}

export default function OptimizedStarFieldWithCulling() {
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'p' && e.ctrlKey) {
        setShowStats(prev => !prev)
      }
    }
    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [])

  if (typeof window === 'undefined') {
    return <div className="fixed inset-0" style={{ backgroundColor: '#000000', zIndex: 1 }} />
  }

  return (
    <div className="fixed inset-0" style={{ zIndex: 1 }}>
      <Canvas camera={{ position: [0, 0, 50], fov: 75 }} style={{ background: '#000000' }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <Stars />
      </Canvas>
      
      {showStats && (
        <div className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded font-mono text-sm" style={{ zIndex: 100 }}>
          <div>FPS: {fps.toFixed(1)}</div>
          <div>Culled: {culledSectors}/{totalSectors} sectors</div>
          <div className="text-xs mt-2 text-gray-400">Press Ctrl+P to toggle</div>
        </div>
      )}
    </div>
  )
}