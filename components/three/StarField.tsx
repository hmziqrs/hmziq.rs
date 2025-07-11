'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getOptimizedFunctions, type WASMModule, StarFieldSharedMemory } from '@/lib/wasm'

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

// interface StarGroup {
//   count: number
//   material: THREE.ShaderMaterial
//   mesh: React.RefObject<THREE.Points>
// }

function Stars() {
  const [screenDimensions, setScreenDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  })

  // WASM module state - mandatory, no fallbacks
  const [wasmModule, setWasmModule] = useState<WASMModule | null>(null)
  const wasmLoadingRef = useRef(false)

  // Shared memory state
  const sharedMemoryRef = useRef<StarFieldSharedMemory | null>(null)

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

    // Create material (doesn't depend on WASM)
    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    return {
      count: totalCount,
      material,
      mesh: starMeshRef as React.RefObject<THREE.Points>,
    }
  }, [screenDimensions])

  // Initialize shared memory when WASM is available
  useEffect(() => {
    if (wasmModule && starGroup && !sharedMemoryRef.current) {
      const { count } = starGroup

      // Create shared memory - all star data lives in WASM linear memory
      sharedMemoryRef.current = new StarFieldSharedMemory(wasmModule, count)

      // Update geometry attributes to use shared memory views
      if (starMeshRef.current?.geometry) {
        const geometry = starMeshRef.current.geometry
        const sharedMem = sharedMemoryRef.current

        // Direct references to WASM memory - zero copy!
        geometry.setAttribute('position', new THREE.BufferAttribute(sharedMem.positions, 3))
        geometry.setAttribute('customColor', new THREE.BufferAttribute(sharedMem.colors, 3))
        geometry.setAttribute('size', new THREE.BufferAttribute(sharedMem.sizes, 1))
        geometry.setAttribute('twinkle', new THREE.BufferAttribute(sharedMem.twinkles, 1))
        geometry.setAttribute('sparkle', new THREE.BufferAttribute(sharedMem.sparkles, 1))
      }
    }
  }, [wasmModule, starGroup])

  useFrame((state) => {
    if (!wasmModule || !sharedMemoryRef.current) return // Wait for WASM and shared memory

    // Get camera view projection matrix for frustum culling
    const camera = state.camera as THREE.PerspectiveCamera
    const viewProjectionMatrix = new THREE.Matrix4()
    viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)

    // Calculate delta time
    const currentFrameTime = state.clock.elapsedTime
    const deltaTime =
      lastFrameTimeRef.current === 0 ? 0.016 : currentFrameTime - lastFrameTimeRef.current
    lastFrameTimeRef.current = currentFrameTime

    // Prepare camera matrix
    const vpMatrix = new Float32Array(viewProjectionMatrix.elements)

    // Update frame using shared memory - all computation in WASM!
    const frameResult = sharedMemoryRef.current.updateFrame(
      wasmModule,
      state.clock.elapsedTime,
      deltaTime,
      vpMatrix,
      isMovingRef.current,
      clickBoostRef.current / 1000, // Convert to seconds
      speedMultiplierRef.current
    )

    // Update rotation (still calculated in WASM)
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

    // Update GPU attributes if needed
    if (starMeshRef.current?.geometry && frameResult.effects_dirty) {
      const geometry = starMeshRef.current.geometry
      const twinkleAttr = geometry.getAttribute('twinkle') as THREE.BufferAttribute
      const sparkleAttr = geometry.getAttribute('sparkle') as THREE.BufferAttribute

      if (twinkleAttr) twinkleAttr.needsUpdate = true
      if (sparkleAttr) sparkleAttr.needsUpdate = true
    }
  })

  return (
    <points ref={starMeshRef} material={starGroup.material}>
      <bufferGeometry />
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
