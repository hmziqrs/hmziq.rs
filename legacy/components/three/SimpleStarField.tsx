'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import SpaceRocket from './SpaceRocket'

function Stars() {
  const meshRef = useRef<THREE.Points>(null)
  const [screenDimensions, setScreenDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  })

  // Mouse interaction state
  const speedMultiplierRef = useRef(1)
  const isMovingRef = useRef(false)
  const lastMouseMoveRef = useRef(0)
  const clickBoostRef = useRef(0)
  const mouseMoveTimeoutRef = useRef<NodeJS.Timeout>()

  // Rotation tracking to prevent bouncing
  const rotationXRef = useRef(0)
  const rotationYRef = useRef(0)
  const lastFrameTimeRef = useRef(0)

  useEffect(() => {
    const handleResize = () => {
      setScreenDimensions({ width: window.innerWidth, height: window.innerHeight })
    }

    const handleMouseMove = () => {
      lastMouseMoveRef.current = Date.now()
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
      // Add click boost that decays over 600ms
      clickBoostRef.current = Date.now()
    }

    const handleScroll = () => {
      // Treat scroll like mouse movement
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

  const { particles, colors, sizes } = useMemo(() => {
    // Calculate star count based on screen dimensions
    const baseStarDensity = 0.6 // Stars per 1000 pixels
    const screenArea = screenDimensions.width * screenDimensions.height
    const count = Math.floor((screenArea / 1000) * baseStarDensity)

    const particles = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    // Use a deterministic seed-based approach for consistent values between server and client
    const seed = (i: number) => {
      let x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
      return x - Math.floor(x)
    }

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      // Position - using deterministic pseudo-random based on index
      const radius = 50 + seed(i) * 100
      const theta = seed(i + 1000) * Math.PI * 2
      const phi = Math.acos(2 * seed(i + 2000) - 1)

      particles[i3] = radius * Math.sin(phi) * Math.cos(theta)
      particles[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      particles[i3 + 2] = radius * Math.cos(phi)

      // Colors - mix of white, blue, orange, and purple stars
      const colorChoice = seed(i + 3000)
      if (colorChoice < 0.5) {
        // White stars (most common)
        colors[i3] = 1
        colors[i3 + 1] = 1
        colors[i3 + 2] = 1
      } else if (colorChoice < 0.7) {
        // Blue stars
        colors[i3] = 0.6
        colors[i3 + 1] = 0.8
        colors[i3 + 2] = 1
      } else if (colorChoice < 0.85) {
        // Orange/yellow stars
        colors[i3] = 1
        colors[i3 + 1] = 0.8
        colors[i3 + 2] = 0.4
      } else {
        // Purple stars
        colors[i3] = 0.8
        colors[i3 + 1] = 0.6
        colors[i3 + 2] = 1
      }

      // Sizes - small and medium only
      const sizeRandom = seed(i + 4000)
      if (sizeRandom < 0.7) {
        // Small stars (70%)
        sizes[i] = 1 + seed(i + 5000) * 1.5
      } else {
        // Medium stars (30%)
        sizes[i] = 2.5 + seed(i + 6000) * 2
      }
    }

    return { particles, colors, sizes }
  }, [screenDimensions])

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 customColor;
        varying vec3 vColor;
        varying float vSize;
        varying vec3 vPosition;

        void main() {
          vColor = customColor;
          vSize = size;
          vPosition = position;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vColor;
        varying float vSize;
        varying vec3 vPosition;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);

          // Create soft circular shape
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);

          // Add glow effect - stronger for larger stars
          float glow = exp(-dist * 2.0) * 0.8 * (vSize / 10.0);

          // Enhanced twinkle effect with sparkles
          float twinkleBase = sin(time * 3.0 + vPosition.x * 10.0 + vPosition.y * 10.0) * 0.3 + 0.7;

          // Sparkle effect - occasional bright flashes
          float sparklePhase = sin(time * 15.0 + vPosition.x * 20.0 + vPosition.y * 30.0 + vPosition.z * 40.0);
          float sparkle = 0.0;
          if (sparklePhase > 0.98) {
            sparkle = pow((sparklePhase - 0.98) / 0.02, 2.0) * 3.0;
          }

          // Create spike/ray effect for sparkles
          float spike = 0.0;
          if (sparkle > 0.1) {
            vec2 coord = gl_PointCoord - 0.5;
            float angle = atan(coord.y, coord.x);
            float rays = sin(angle * 8.0) * 0.5 + 0.5;
            spike = rays * sparkle * (1.0 - dist * 2.0);
          }

          float twinkle = twinkleBase + sparkle;

          vec3 finalColor = vColor + glow;
          float finalAlpha = alpha + spike * 0.5;

          gl_FragColor = vec4(finalColor * twinkle, finalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [])

  useFrame((state) => {
    if (meshRef.current) {
      // Calculate delta time for smooth incremental rotation
      const currentFrameTime = state.clock.elapsedTime
      const deltaTime =
        lastFrameTimeRef.current === 0 ? 0.016 : currentFrameTime - lastFrameTimeRef.current
      lastFrameTimeRef.current = currentFrameTime

      // Calculate speed multiplier based on mouse interaction
      const currentTime = Date.now()
      let speedMultiplier = 1

      // Mouse movement boost (1.5x speed while moving)
      if (isMovingRef.current) {
        speedMultiplier *= 4.5
      }

      // Click boost (1.3x speed that decays over 600ms)
      const timeSinceClick = currentTime - clickBoostRef.current
      if (timeSinceClick < 1200) {
        const clickDecay = 1 - timeSinceClick / 1200 // 1 to 0 over 1200ms
        const clickBoost = 1 + 4.3 * clickDecay // 1 to 1.3x speed
        speedMultiplier *= clickBoost
      }

      // Smooth transition for speed changes (faster response)
      const targetSpeed = speedMultiplier
      speedMultiplierRef.current += (targetSpeed - speedMultiplierRef.current) * 0.2

      // Base rotation speeds
      const baseRotationSpeedX = 0.02
      const baseRotationSpeedY = 0.01

      // Calculate incremental rotation for this frame
      const rotationIncrementX = baseRotationSpeedX * speedMultiplierRef.current * deltaTime
      const rotationIncrementY = baseRotationSpeedY * speedMultiplierRef.current * deltaTime

      // Add incremental rotation to tracked rotation
      rotationXRef.current += rotationIncrementX
      rotationYRef.current += rotationIncrementY

      // Apply the tracked rotation
      meshRef.current.rotation.x = rotationXRef.current
      meshRef.current.rotation.y = rotationYRef.current

      // Update time uniform for twinkle effect
      const material = meshRef.current.material as THREE.ShaderMaterial
      if (material && material.uniforms && material.uniforms.time) {
        material.uniforms.time.value = state.clock.elapsedTime
      }
    }
  })

  return (
    <points ref={meshRef} material={shaderMaterial}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        <bufferAttribute attach="attributes-customColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
    </points>
  )
}

export default function SimpleStarField() {
  // Ensure we're on the client side
  if (typeof window === 'undefined') {
    return <div className="fixed inset-0" style={{ backgroundColor: '#000000', zIndex: 1 }} />
  }

  return (
    <div className="fixed inset-0" style={{ zIndex: 1 }}>
      <Canvas camera={{ position: [0, 0, 50], fov: 75 }} style={{ background: '#000000' }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <Stars />
        {/* <SpaceRocket bounds={{ x: 50, y: 30 }} /> */}
      </Canvas>
    </div>
  )
}
