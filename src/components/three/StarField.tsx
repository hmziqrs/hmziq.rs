import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useMemo, useState, useEffect } from 'react'
import * as THREE from 'three'

import { useWASM } from '~/contexts/WASMContext'
import { StarFieldSharedMemory } from '~/lib/wasm/starfield'

const STARFIELD_CAMERA = { position: [0, 0, 50] as [number, number, number], fov: 75 } as const

const VERTEX_SHADER = `
  // SoA attributes for SIMD
  attribute float positionX;
  attribute float positionY;
  attribute float positionZ;
  attribute float colorR;
  attribute float colorG;
  attribute float colorB;
  attribute float size;
  attribute float twinkle;
  attribute float sparkle;

  varying vec3 vColor;
  varying float vSize;
  varying float vTwinkle;
  varying float vSparkle;

  void main() {
    // Reconstruct from SoA
    vec3 position = vec3(positionX, positionY, positionZ);
    vec3 customColor = vec3(colorR, colorG, colorB);

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

    // Spike effect when sparkling
    float spike = 0.0;
    if (vSparkle > 0.1) {
      // Use step functions
      vec2 coord = gl_PointCoord - 0.5;
      float cross = step(0.95, abs(coord.x)) + step(0.95, abs(coord.y));
      spike = cross * vSparkle * (1.0 - dist * 2.0);
    }

    vec3 finalColor = min(vColor + glow, vec3(1.0));
    float finalAlpha = alpha + spike * 0.5;

    gl_FragColor = vec4(finalColor * vTwinkle, finalAlpha);
  }
`
function Stars() {
  const [screenDimensions, setScreenDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  })

  const { wasmModule } = useWASM()

  const sharedMemoryRef = useRef<StarFieldSharedMemory | null>(null)

  const speedMultiplierRef = useRef(1)
  const isMovingRef = useRef(false)
  const clickBoostRef = useRef(0)
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldBoostFromClick = useRef(false)

  const rotationXRef = useRef(0)
  const rotationYRef = useRef(0)
  const lastFrameTimeRef = useRef(0)

  const starMeshRef = useRef<THREE.Points>(null)
  const viewProjectionMatrixRef = useRef<THREE.Matrix4 | null>(null)
  const vpMatrixBufferRef = useRef<Float32Array | null>(null)

  useEffect(() => {
    const handleResize = () => {
      setScreenDimensions({ width: window.innerWidth, height: window.innerHeight })
    }

    const handleMouseMove = () => {
      if (!isMovingRef.current) {
        isMovingRef.current = true
      }

      const currentTimeout = mouseMoveTimeoutRef.current
      if (currentTimeout) {
        clearTimeout(currentTimeout)
      }

      mouseMoveTimeoutRef.current = setTimeout(() => {
        isMovingRef.current = false
      }, 100)
    }

    const handleClick = () => {
      shouldBoostFromClick.current = true
    }

    const handleScroll = () => {
      handleMouseMove()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)
    window.addEventListener('scroll', handleScroll, { passive: true })

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

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  )

  const starGroup = useMemo(() => {
    const ultraStarDensity = 0.36 * 1.125
    const screenArea = screenDimensions.width * screenDimensions.height
    const rawCount = Math.floor((screenArea / 1000) * ultraStarDensity)
    const totalCount = Math.ceil(rawCount / 8) * 8

    return {
      count: totalCount,
      material,
      mesh: starMeshRef,
    }
  }, [screenDimensions, material])

  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  useEffect(() => {
    if (sharedMemoryRef.current) {
      sharedMemoryRef.current.dispose()
    }
    sharedMemoryRef.current = null

    if (starMeshRef.current?.geometry) {
      const geometry = starMeshRef.current.geometry
      for (const key of Object.keys(geometry.attributes)) {
        geometry.deleteAttribute(key)
      }
    }

    if (wasmModule && starGroup) {
      const { count } = starGroup

      sharedMemoryRef.current = new StarFieldSharedMemory(wasmModule, count)

      if (starMeshRef.current?.geometry) {
        const geometry = starMeshRef.current.geometry
        const sharedMem = sharedMemoryRef.current

        geometry.setAttribute('positionX', new THREE.BufferAttribute(sharedMem.positions_x!, 1))
        geometry.setAttribute('positionY', new THREE.BufferAttribute(sharedMem.positions_y!, 1))
        geometry.setAttribute('positionZ', new THREE.BufferAttribute(sharedMem.positions_z!, 1))
        geometry.setAttribute('colorR', new THREE.BufferAttribute(sharedMem.colors_r!, 1))
        geometry.setAttribute('colorG', new THREE.BufferAttribute(sharedMem.colors_g!, 1))
        geometry.setAttribute('colorB', new THREE.BufferAttribute(sharedMem.colors_b!, 1))
        geometry.setAttribute('size', new THREE.BufferAttribute(sharedMem.sizes!, 1))
        geometry.setAttribute('twinkle', new THREE.BufferAttribute(sharedMem.twinkles!, 1))
        geometry.setAttribute('sparkle', new THREE.BufferAttribute(sharedMem.sparkles!, 1))

        let minX = Infinity,
          maxX = -Infinity
        let minY = Infinity,
          maxY = -Infinity
        let minZ = Infinity,
          maxZ = -Infinity
        const px = sharedMem.positions_x!
        const py = sharedMem.positions_y!
        const pz = sharedMem.positions_z!
        for (let i = 0; i < count; i++) {
          if (px[i] < minX) minX = px[i]
          if (px[i] > maxX) maxX = px[i]
          if (py[i] < minY) minY = py[i]
          if (py[i] > maxY) maxY = py[i]
          if (pz[i] < minZ) minZ = pz[i]
          if (pz[i] > maxZ) maxZ = pz[i]
        }

        geometry.boundingBox = new THREE.Box3(
          new THREE.Vector3(minX, minY, minZ),
          new THREE.Vector3(maxX, maxY, maxZ)
        )

        geometry.boundingSphere = new THREE.Sphere()
        geometry.boundingBox.getBoundingSphere(geometry.boundingSphere)

        // CRITICAL: Set vertex count for custom attributes
        geometry.setDrawRange(0, count)
      }
    }

    return () => {
      sharedMemoryRef.current?.dispose()
      sharedMemoryRef.current = null
    }
  }, [wasmModule, starGroup])

  useFrame((state) => {
    if (!wasmModule || !sharedMemoryRef.current) return

    try {
      if (!(state.camera instanceof THREE.PerspectiveCamera)) return
      const camera = state.camera
      if (!viewProjectionMatrixRef.current) viewProjectionMatrixRef.current = new THREE.Matrix4()
      if (!vpMatrixBufferRef.current) vpMatrixBufferRef.current = new Float32Array(16)
      const viewProjectionMatrix = viewProjectionMatrixRef.current
      const vpMatrix = vpMatrixBufferRef.current
      viewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)

      const currentFrameTime = state.clock.elapsedTime
      const deltaTime =
        lastFrameTimeRef.current === 0 ? 0.016 : currentFrameTime - lastFrameTimeRef.current
      lastFrameTimeRef.current = currentFrameTime

      if (shouldBoostFromClick.current) {
        clickBoostRef.current = currentFrameTime
        shouldBoostFromClick.current = false
      }

      speedMultiplierRef.current = wasmModule.calculate_speed_multiplier(
        isMovingRef.current,
        clickBoostRef.current,
        currentFrameTime,
        speedMultiplierRef.current
      )

      vpMatrix.set(viewProjectionMatrix.elements)

      const frameResult = sharedMemoryRef.current.updateFrame(
        wasmModule,
        state.clock.elapsedTime,
        deltaTime,
        vpMatrix,
        isMovingRef.current,
        clickBoostRef.current,
        speedMultiplierRef.current
      )

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

      if (starMeshRef.current) {
        starMeshRef.current.rotation.x = rotationXRef.current
        starMeshRef.current.rotation.y = rotationYRef.current
      }

      if (starMeshRef.current?.geometry && frameResult.effects_dirty) {
        const geometry = starMeshRef.current.geometry
        const twinkleAttr = geometry.getAttribute('twinkle')
        const sparkleAttr = geometry.getAttribute('sparkle')

        if (twinkleAttr instanceof THREE.BufferAttribute) twinkleAttr.needsUpdate = true
        if (sparkleAttr instanceof THREE.BufferAttribute) sparkleAttr.needsUpdate = true
      }
    } catch (error) {
      console.error('StarField frame error:', error)
      return
    }
  })

  return (
    // eslint-disable-next-line react-hooks-js/refs -- ref passed to Three.js element, not read during render
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
    <div className="fixed inset-0" style={{ zIndex: 1 }} aria-hidden="true">
      <Canvas camera={STARFIELD_CAMERA} style={{ background: '#000000' }}>
        <Stars />
      </Canvas>
    </div>
  )
}
