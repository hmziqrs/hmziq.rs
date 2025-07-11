'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getOptimizedFunctions, type WASMModule } from '@/lib/wasm'

// Performance monitoring
let lastTime = performance.now()

// Pre-calculated sin lookup table for performance (kept for non-WASM fallback)
const SIN_TABLE_SIZE = 1024
const SIN_TABLE = new Float32Array(SIN_TABLE_SIZE)
for (let i = 0; i < SIN_TABLE_SIZE; i++) {
  SIN_TABLE[i] = Math.sin((i / SIN_TABLE_SIZE) * Math.PI * 2)
}

// Fast sin approximation using lookup table (fallback for non-WASM)
function fastSin(x: number): number {
  const normalized = ((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  const index = Math.floor((normalized / (Math.PI * 2)) * SIN_TABLE_SIZE)
  return SIN_TABLE[index]
}

// Ultra quality shaders
const VERTEX_SHADER = `
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

const FRAGMENT_SHADER = `
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

  // WASM module state
  const [wasmModule, setWasmModule] = useState<WASMModule | null>(null)
  const wasmLoadingRef = useRef(false)

  // Mouse interaction state
  const speedMultiplierRef = useRef(1)
  const isMovingRef = useRef(false)
  const clickBoostRef = useRef(0)
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Rotation tracking
  const rotationXRef = useRef(0)
  const rotationYRef = useRef(0)
  const lastFrameTimeRef = useRef(0)

  // Ref for star mesh
  const starMeshRef = useRef<THREE.Points>(null)

  // Frame counter for temporal optimization
  const frameCounterRef = useRef(0)

  // Load WASM module
  useEffect(() => {
    if (!wasmLoadingRef.current) {
      wasmLoadingRef.current = true
      getOptimizedFunctions()
        .then((module) => {
          setWasmModule(module as WASMModule)
        })
        .catch(() => {
          // Silent fallback
        })
    }
  }, [])

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

  const starGroup = useMemo(() => {
    // Calculate total star count for ultra tier
    const ultraStarDensity = 0.36 * 1.125 // Ultra tier multiplier
    const screenArea = screenDimensions.width * screenDimensions.height
    const totalCount = Math.floor((screenArea / 1000) * ultraStarDensity)

    // Create ultra quality star data
    const createStarGroup = (count: number): StarGroup => {
      let positions: Float32Array
      let colors: Float32Array
      let sizes: Float32Array

      // Use WASM if available, otherwise fall back to JS
      if (wasmModule) {
        positions = wasmModule.generate_star_positions(count, 0, 20, 150)
        colors = wasmModule.generate_star_colors(count, 0)
        sizes = wasmModule.generate_star_sizes(count, 0, 1.0)
      } else {
        // Fallback to original JS implementation
        positions = new Float32Array(count * 3)
        colors = new Float32Array(count * 3)
        sizes = new Float32Array(count)

        const seed = (i: number) => {
          const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
          return x - Math.floor(x)
        }

        for (let i = 0; i < count; i++) {
          const i3 = i * 3

          // Position - distributed across full radius range
          const radius = 20 + seed(i) * 130 // 20 to 150 radius
          const theta = seed(i + 1000) * Math.PI * 2
          const phi = Math.acos(2 * seed(i + 2000) - 1)

          positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
          positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
          positions[i3 + 2] = radius * Math.cos(phi)

          // Colors
          const colorChoice = seed(i + 3000)
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

          // Sizes - full quality
          const sizeRandom = seed(i + 4000)
          const baseSize = sizeRandom < 0.7 ? 1 + seed(i + 5000) * 1.5 : 2.5 + seed(i + 6000) * 2
          sizes[i] = baseSize
        }
      }

      // Initialize with slightly varying values to ensure visibility
      const twinkles = new Float32Array(count)
      const sparkles = new Float32Array(count)
      for (let i = 0; i < count; i++) {
        twinkles[i] = 0.8 + Math.random() * 0.2 // 0.8 to 1.0
        sparkles[i] = 0.0
      }

      // Create ultra quality material
      const material = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })

      return {
        positions,
        colors,
        sizes,
        twinkles,
        sparkles,
        count,
        material,
        mesh: starMeshRef as React.RefObject<THREE.Points>,
      }
    }

    // Create single ultra quality star group
    return createStarGroup(totalCount)
  }, [screenDimensions, wasmModule])

  // Update twinkle and sparkle values using WASM with frustum culling and temporal coherence
  const updateStarEffects = (
    group: StarGroup,
    time: number,
    updateRate: number,
    viewProjMatrix?: Float32Array,
    useTemporalCoherence: boolean = true
  ) => {
    if (frameCounterRef.current % updateRate !== 0) return

    const { positions, twinkles, sparkles, count, mesh } = group

    // Apply frustum culling if view projection matrix is provided
    let visibleIndices: Uint32Array | null = null
    if (viewProjMatrix && wasmModule && wasmModule.get_visible_star_indices) {
      // Get indices of stars visible in the frustum
      visibleIndices = wasmModule.get_visible_star_indices(positions, count, viewProjMatrix, 5.0) // 5.0 margin for star size
    }

    // Apply temporal coherence optimization
    const temporalThreshold = 0.05 // Only update if change is > 5%

    if (
      useTemporalCoherence &&
      wasmModule &&
      wasmModule.calculate_star_effects_with_temporal_coherence
    ) {
      // Use temporal coherence to update only stars that have changed significantly
      const temporalResults = wasmModule.calculate_star_effects_with_temporal_coherence(
        positions,
        twinkles,
        sparkles,
        count,
        time,
        temporalThreshold
      )

      // Process results - format is [needs_update, twinkle, sparkle] triplets
      for (let i = 0; i < count; i++) {
        const idx = i * 3
        const needsUpdate = temporalResults[idx]

        if (needsUpdate > 0.5) {
          twinkles[i] = temporalResults[idx + 1]
          sparkles[i] = temporalResults[idx + 2]
        }
      }
    } else if (wasmModule && wasmModule.calculate_star_effects_arrays) {
      // Fallback to regular update method
      if (visibleIndices && visibleIndices.length < count * 0.8) {
        // If more than 20% of stars are culled, process only visible ones
        // Create temporary arrays for visible stars
        const visibleCount = visibleIndices.length
        const visiblePositions = new Float32Array(visibleCount * 3)

        // Copy visible star positions
        for (let i = 0; i < visibleCount; i++) {
          const srcIdx = visibleIndices[i] * 3
          const dstIdx = i * 3
          visiblePositions[dstIdx] = positions[srcIdx]
          visiblePositions[dstIdx + 1] = positions[srcIdx + 1]
          visiblePositions[dstIdx + 2] = positions[srcIdx + 2]
        }

        // Calculate effects only for visible stars
        const effects = wasmModule.calculate_star_effects_arrays(
          visiblePositions,
          visibleCount,
          time
        )

        // Update only visible stars
        for (let i = 0; i < visibleCount; i++) {
          const starIdx = visibleIndices[i]
          twinkles[starIdx] = effects[i * 2]
          sparkles[starIdx] = effects[i * 2 + 1]
        }
      } else {
        // Process all stars if culling doesn't save much
        const effects = wasmModule.calculate_star_effects_arrays(positions, count, time)
        // Effects array contains [twinkle, sparkle] pairs
        for (let i = 0; i < count; i++) {
          twinkles[i] = effects[i * 2]
          sparkles[i] = effects[i * 2 + 1]
        }
      }
    } else if (wasmModule && wasmModule.fast_sin) {
      // Use WASM functions with individual calculations
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        const x = positions[i3]
        const y = positions[i3 + 1]

        // Use WASM fast_sin for better performance
        const twinkleBase = wasmModule.fast_sin(time * 3.0 + x * 10.0 + y * 10.0) * 0.3 + 0.7

        // Sparkle effect using WASM
        const sparklePhase = wasmModule.fast_sin(time * 15.0 + x * 20.0 + y * 30.0)
        const sparkle = sparklePhase > 0.98 ? (sparklePhase - 0.98) / 0.02 : 0

        twinkles[i] = twinkleBase + sparkle
        sparkles[i] = sparkle
      }
    } else {
      // Fallback to JS implementation
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
    }

    // Update attributes - this is crucial for the GPU to see the changes
    if (mesh.current && mesh.current.geometry) {
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
    const currentTime = performance.now()

    if (wasmModule && wasmModule.calculate_fps) {
      // Use WASM for FPS calculation
      const fpsResult = wasmModule.calculate_fps(frameCounterRef.current, currentTime, lastTime)
      if (fpsResult[1] > 0.5) {
        // Should update
        // Reconstruct time from two f32 values
        lastTime = fpsResult[2] * 1000 + fpsResult[3]
      }
    } else {
      // Fallback to JS implementation
      if (frameCounterRef.current % 30 === 0) {
        lastTime = currentTime
      }
    }

    // Get camera view projection matrix for frustum culling
    const camera = state.camera as THREE.PerspectiveCamera
    const viewProjectionMatrix = new THREE.Matrix4()
    viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)

    // Calculate delta time
    const currentFrameTime = state.clock.elapsedTime
    const deltaTime =
      lastFrameTimeRef.current === 0 ? 0.016 : currentFrameTime - lastFrameTimeRef.current
    lastFrameTimeRef.current = currentFrameTime

    // Calculate speed multiplier
    const speedCalculationTime = Date.now()

    if (wasmModule && wasmModule.calculate_speed_multiplier) {
      // Use WASM for optimized speed calculations
      speedMultiplierRef.current = wasmModule.calculate_speed_multiplier(
        isMovingRef.current,
        clickBoostRef.current,
        speedCalculationTime,
        speedMultiplierRef.current
      )
    } else {
      // Fallback to JS implementation
      let speedMultiplier = 1

      if (isMovingRef.current) {
        speedMultiplier *= 4.5
      }

      const timeSinceClick = speedCalculationTime - clickBoostRef.current
      if (timeSinceClick < 1200) {
        const clickDecay = 1 - timeSinceClick / 1200
        const clickBoost = 1 + 4.3 * clickDecay
        speedMultiplier *= clickBoost
      }

      const targetSpeed = speedMultiplier
      speedMultiplierRef.current += (targetSpeed - speedMultiplierRef.current) * 0.2
    }

    // Update rotation
    const baseRotationSpeedX = 0.02
    const baseRotationSpeedY = 0.01

    if (wasmModule) {
      const rotationDelta = wasmModule.calculate_rotation_delta(
        baseRotationSpeedX,
        baseRotationSpeedY,
        speedMultiplierRef.current,
        deltaTime
      )
      rotationXRef.current += rotationDelta[0]
      rotationYRef.current += rotationDelta[1]
    } else {
      rotationXRef.current += baseRotationSpeedX * speedMultiplierRef.current * deltaTime
      rotationYRef.current += baseRotationSpeedY * speedMultiplierRef.current * deltaTime
    }

    // Apply rotation to star mesh
    if (starMeshRef.current) {
      starMeshRef.current.rotation.x = rotationXRef.current
      starMeshRef.current.rotation.y = rotationYRef.current
    }

    // Update star effects
    const time = state.clock.elapsedTime
    const vpMatrix = new Float32Array(viewProjectionMatrix.elements)

    // Update star effects every frame for ultra quality
    updateStarEffects(starGroup, time, 1, vpMatrix)
  })

  return (
    <points ref={starGroup.mesh} material={starGroup.material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[starGroup.positions, 3]} />
        <bufferAttribute attach="attributes-customColor" args={[starGroup.colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[starGroup.sizes, 1]} />
        <bufferAttribute attach="attributes-twinkle" args={[starGroup.twinkles, 1]} />
        <bufferAttribute attach="attributes-sparkle" args={[starGroup.sparkles, 1]} />
      </bufferGeometry>
    </points>
  )
}

export default function OptimizedStarField() {
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
    </div>
  )
}
