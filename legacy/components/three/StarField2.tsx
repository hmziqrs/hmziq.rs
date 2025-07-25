'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Performance monitoring
let frameCount = 0
let lastTime = performance.now()
let fps = 60

// LOD (Level of Detail) configuration
const LOD_LEVELS = {
  NEAR: { distance: 30, quality: 'full' },
  MEDIUM: { distance: 70, quality: 'medium' },
  FAR: { distance: Infinity, quality: 'simple' },
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

interface StarGroup {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  twinkles: Float32Array
  sparkles: Float32Array
  count: number
  material: THREE.ShaderMaterial
  mesh: React.RefObject<THREE.Points>
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

  // Refs for each LOD group
  const nearMeshRef = useRef<THREE.Points>(null)
  const mediumMeshRef = useRef<THREE.Points>(null)
  const farMeshRef = useRef<THREE.Points>(null)

  // Frame counter for temporal optimization
  const frameCounterRef = useRef(0)

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

  const starGroups = useMemo(() => {
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

    // Helper to create star data for a group
    const createStarGroup = (
      count: number,
      startIndex: number,
      minRadius: number,
      maxRadius: number,
      lodLevel: string
    ): StarGroup => {
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const sizes = new Float32Array(count)
      const twinkles = new Float32Array(count)
      const sparkles = new Float32Array(count)

      for (let i = 0; i < count; i++) {
        const globalIndex = startIndex + i
        const i3 = i * 3

        // Position
        const radius = minRadius + seed(globalIndex) * (maxRadius - minRadius)
        const theta = seed(globalIndex + 1000) * Math.PI * 2
        const phi = Math.acos(2 * seed(globalIndex + 2000) - 1)

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
        positions[i3 + 2] = radius * Math.cos(phi)

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

        // Sizes - adjust based on LOD
        const sizeRandom = seed(globalIndex + 4000)
        const baseSize =
          sizeRandom < 0.7 ? 1 + seed(globalIndex + 5000) * 1.5 : 2.5 + seed(globalIndex + 6000) * 2
        sizes[i] = lodLevel === 'simple' ? baseSize * 0.8 : baseSize

        // Initial twinkle and sparkle values
        twinkles[i] = 1.0
        sparkles[i] = 0.0
      }

      // Create appropriate material based on LOD
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

      return {
        positions,
        colors,
        sizes,
        twinkles,
        sparkles,
        count,
        material,
        mesh:
          lodLevel === 'full' ? nearMeshRef : lodLevel === 'medium' ? mediumMeshRef : farMeshRef,
      }
    }

    // Create LOD groups
    const near = createStarGroup(nearCount, 0, 20, 30, 'full')
    const medium = createStarGroup(mediumCount, nearCount, 30, 70, 'medium')
    const far = createStarGroup(farCount, nearCount + mediumCount, 70, 150, 'simple')

    return { near, medium, far }
  }, [screenDimensions])

  // Update twinkle and sparkle values
  const updateStarEffects = (group: StarGroup, time: number, updateRate: number) => {
    if (frameCounterRef.current % updateRate !== 0) return

    const { positions, twinkles, sparkles, count, mesh } = group

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const x = positions[i3]
      const y = positions[i3 + 1]

      // Use fast sin approximation
      const twinkleBase = fastSin(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7

      // Sparkle effect - simplified
      const sparklePhase = fastSin(time * 15.0 + x * 20.0 + y * 30.0)
      const sparkle = sparklePhase > 0.98 ? (sparklePhase - 0.98) / 0.02 : 0

      twinkles[i] = twinkleBase + sparkle
      sparkles[i] = sparkle
    }

    // Update attributes
    if (mesh.current) {
      const geometry = mesh.current.geometry
      const twinkleAttr = geometry.getAttribute('twinkle') as THREE.BufferAttribute
      const sparkleAttr = geometry.getAttribute('sparkle') as THREE.BufferAttribute

      if (twinkleAttr) {
        twinkleAttr.needsUpdate = true
      }
      if (sparkleAttr) {
        sparkleAttr.needsUpdate = true
      }
    }
  }

  useFrame((state) => {
    frameCounterRef.current++

    // Update FPS counter
    if (frameCounterRef.current % 30 === 0) {
      const currentTime = performance.now()
      fps = 30000 / (currentTime - lastTime)
      lastTime = currentTime
    }

    // Calculate delta time
    const currentFrameTime = state.clock.elapsedTime
    const deltaTime =
      lastFrameTimeRef.current === 0 ? 0.016 : currentFrameTime - lastFrameTimeRef.current
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

    // Apply rotation to all LOD groups
    const meshes = [nearMeshRef.current, mediumMeshRef.current, farMeshRef.current]
    meshes.forEach((mesh) => {
      if (mesh) {
        mesh.rotation.x = rotationXRef.current
        mesh.rotation.y = rotationYRef.current
      }
    })

    // Update star effects at different rates based on LOD
    const time = state.clock.elapsedTime
    updateStarEffects(starGroups.near, time, 1) // Every frame for near stars
    updateStarEffects(starGroups.medium, time, 2) // Every 2 frames for medium
    // Far stars don't need updates (no twinkle/sparkle)
  })

  // Render star group
  const renderStarGroup = (group: StarGroup, key: string) => (
    <points key={key} ref={group.mesh} material={group.material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[group.positions, 3]} />
        <bufferAttribute attach="attributes-customColor" args={[group.colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[group.sizes, 1]} />
        {group.twinkles && (
          <bufferAttribute attach="attributes-twinkle" args={[group.twinkles, 1]} />
        )}
        {group.sparkles && (
          <bufferAttribute attach="attributes-sparkle" args={[group.sparkles, 1]} />
        )}
      </bufferGeometry>
    </points>
  )

  return (
    <>
      {renderStarGroup(starGroups.far, 'far')}
      {renderStarGroup(starGroups.medium, 'medium')}
      {renderStarGroup(starGroups.near, 'near')}
    </>
  )
}

export default function OptimizedStarField() {
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'p' && e.ctrlKey) {
        setShowStats((prev) => !prev)
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
        <div
          className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded font-mono text-sm"
          style={{ zIndex: 100 }}
        >
          <div>FPS: {fps.toFixed(1)}</div>
          <div className="text-xs mt-2 text-gray-400">Press Ctrl+P to toggle</div>
        </div>
      )}
    </div>
  )
}
