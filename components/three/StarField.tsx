'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getOptimizedFunctions, type WASMModule } from '@/lib/wasm'

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

  // WASM module state - mandatory, no fallbacks
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

  // Load WASM module - mandatory
  useEffect(() => {
    if (!wasmLoadingRef.current) {
      wasmLoadingRef.current = true
      getOptimizedFunctions()
        .then((module) => {
          setWasmModule(module as WASMModule)
        })
        .catch((error) => {
          console.error('WASM SIMD module failed to load:', error)
          // No fallback - WASM is required
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

    // Create ultra quality star data - WASM only, no fallbacks
    const createStarGroup = (count: number): StarGroup => {
      // Initialize with default values until WASM loads
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const sizes = new Float32Array(count)

      // Temporary basic initialization until WASM takes over
      for (let i = 0; i < count; i++) {
        // Basic sphere distribution until WASM loads
        const phi = Math.acos(1 - 2 * Math.random())
        const theta = 2 * Math.PI * Math.random()
        const radius = 20 + Math.random() * 130

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
        positions[i * 3 + 2] = radius * Math.cos(phi)

        colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 1
        sizes[i] = 2.0
      }

      // Initialize effect arrays
      const twinkles = new Float32Array(count)
      const sparkles = new Float32Array(count)
      for (let i = 0; i < count; i++) {
        twinkles[i] = 0.8 + Math.random() * 0.2
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
        count: totalCount,
        material,
        mesh: starMeshRef as React.RefObject<THREE.Points>,
      }
    }

    return createStarGroup(totalCount)
  }, [screenDimensions])

  // Replace temporary data with WASM-generated data when available
  useEffect(() => {
    if (wasmModule && starGroup) {
      const { count } = starGroup

      // Generate using WASM SIMD - no fallbacks
      starGroup.positions = wasmModule.generate_star_positions(count, 0, 20, 150)
      starGroup.colors = wasmModule.generate_star_colors(count, 0)
      starGroup.sizes = wasmModule.generate_star_sizes(count, 0, 1.0)

      // Update geometry attributes
      if (starMeshRef.current?.geometry) {
        const geometry = starMeshRef.current.geometry
        geometry.setAttribute('position', new THREE.BufferAttribute(starGroup.positions, 3))
        geometry.setAttribute('customColor', new THREE.BufferAttribute(starGroup.colors, 3))
        geometry.setAttribute('size', new THREE.BufferAttribute(starGroup.sizes, 1))
      }
    }
  }, [wasmModule, starGroup])

  // Update star effects - WASM SIMD only
  const updateStarEffects = (
    group: StarGroup,
    time: number,
    viewProjMatrix?: Float32Array,
    useTemporalCoherence: boolean = true
  ) => {
    if (!wasmModule) return // Wait for WASM

    const { positions, twinkles, sparkles, count, mesh } = group

    // Apply frustum culling if view projection matrix is provided
    let visibleIndices: Uint32Array | null = null
    if (viewProjMatrix) {
      visibleIndices = wasmModule.get_visible_star_indices(positions, count, viewProjMatrix, 5.0)
    }

    // Apply temporal coherence optimization
    const temporalThreshold = 0.05

    if (useTemporalCoherence && wasmModule.calculate_star_effects_with_temporal_coherence) {
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
    } else {
      // Use WASM SIMD batch calculations
      if (visibleIndices && visibleIndices.length < count * 0.8) {
        // Process only visible stars if significant culling
        const visibleCount = visibleIndices.length
        const visiblePositions = new Float32Array(visibleCount * 3)

        for (let i = 0; i < visibleCount; i++) {
          const srcIdx = visibleIndices[i] * 3
          const dstIdx = i * 3
          visiblePositions[dstIdx] = positions[srcIdx]
          visiblePositions[dstIdx + 1] = positions[srcIdx + 1]
          visiblePositions[dstIdx + 2] = positions[srcIdx + 2]
        }

        const effects = wasmModule.calculate_star_effects_arrays(
          visiblePositions,
          visibleCount,
          time
        )

        for (let i = 0; i < visibleCount; i++) {
          const starIdx = visibleIndices[i]
          twinkles[starIdx] = effects[i * 2]
          sparkles[starIdx] = effects[i * 2 + 1]
        }
      } else {
        // Process all stars using WASM SIMD
        const effects = wasmModule.calculate_star_effects_arrays(positions, count, time)
        for (let i = 0; i < count; i++) {
          twinkles[i] = effects[i * 2]
          sparkles[i] = effects[i * 2 + 1]
        }
      }
    }

    // Update GPU attributes
    if (mesh.current?.geometry) {
      const geometry = mesh.current.geometry
      const twinkleAttr = geometry.getAttribute('twinkle') as THREE.BufferAttribute
      const sparkleAttr = geometry.getAttribute('sparkle') as THREE.BufferAttribute

      if (twinkleAttr) twinkleAttr.needsUpdate = true
      if (sparkleAttr) sparkleAttr.needsUpdate = true
    }
  }

  useFrame((state) => {
    if (!wasmModule) return // Wait for WASM to load

    // Get camera view projection matrix for frustum culling
    const camera = state.camera as THREE.PerspectiveCamera
    const viewProjectionMatrix = new THREE.Matrix4()
    viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)

    // Calculate delta time
    const currentFrameTime = state.clock.elapsedTime
    const deltaTime =
      lastFrameTimeRef.current === 0 ? 0.016 : currentFrameTime - lastFrameTimeRef.current
    lastFrameTimeRef.current = currentFrameTime

    // Speed multiplier calculation using WASM SIMD only
    const speedCalculationTime = Date.now()
    speedMultiplierRef.current = wasmModule.calculate_speed_multiplier(
      isMovingRef.current,
      clickBoostRef.current,
      speedCalculationTime,
      speedMultiplierRef.current
    )

    // Rotation calculation using WASM SIMD only
    const baseRotationSpeedX = 0.02
    const baseRotationSpeedY = 0.01
    const rotationDelta = wasmModule.calculate_rotation_delta(
      baseRotationSpeedX,
      baseRotationSpeedY,
      speedMultiplierRef.current,
      deltaTime
    )

    rotationXRef.current += rotationDelta[0]
    rotationYRef.current += rotationDelta[1]

    // Apply rotation to star mesh
    if (starMeshRef.current) {
      starMeshRef.current.rotation.x = rotationXRef.current
      starMeshRef.current.rotation.y = rotationYRef.current
    }

    // Update star effects using WASM SIMD
    const time = state.clock.elapsedTime
    const vpMatrix = new Float32Array(viewProjectionMatrix.elements)
    updateStarEffects(starGroup, time, vpMatrix)
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
