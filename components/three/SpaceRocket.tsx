'use client'

import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface RocketProps {
  bounds?: { x: number; y: number }
}

export default function SpaceRocket({ bounds = { x: 50, y: 30 } }: RocketProps) {
  const rocketRef = useRef<THREE.Group>(null)
  const { viewport } = useThree()
  const isMobile = viewport.width < 10 // Roughly mobile if viewport width is less than 10 units
  
  // Movement state
  const velocityRef = useRef({ x: 0, y: 0, z: 0 })
  const targetRotationRef = useRef({ x: 0, y: 0, z: 0 })
  const currentRotationRef = useRef({ x: 0, y: 0, z: 0 })
  const positionRef = useRef({ x: 0, y: 0, z: 0 })
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize random velocity and position
  useEffect(() => {
    const speed = isMobile ? 0.02 : 0.03
    const angle = Math.random() * Math.PI * 2
    velocityRef.current = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
      z: 0
    }
    
    // Start from center
    positionRef.current = { x: 0, y: 0, z: 0 }
    setIsInitialized(true)
  }, [isMobile])

  useFrame((state) => {
    if (!rocketRef.current || !isInitialized) return

    const rocket = rocketRef.current
    const time = state.clock.elapsedTime
    const velocity = velocityRef.current
    const targetRotation = targetRotationRef.current
    const currentRotation = currentRotationRef.current
    const position = positionRef.current

    // Calculate boundary based on viewport
    const boundaryX = viewport.width / 2 - 2 // 50px equivalent in 3D units
    const boundaryY = viewport.height / 2 - 2

    // Update position
    position.x += velocity.x
    position.y += velocity.y

    // Check boundaries and smoothly redirect
    if (Math.abs(position.x) > boundaryX) {
      // Reverse X velocity and add some randomness
      velocity.x = -velocity.x * (0.8 + Math.random() * 0.4)
      // Add random Y component
      velocity.y += (Math.random() - 0.5) * 0.01
      // Keep rocket within bounds
      position.x = Math.sign(position.x) * boundaryX
    }
    
    if (Math.abs(position.y) > boundaryY) {
      // Reverse Y velocity and add some randomness
      velocity.y = -velocity.y * (0.8 + Math.random() * 0.4)
      // Add random X component
      velocity.x += (Math.random() - 0.5) * 0.01
      // Keep rocket within bounds
      position.y = Math.sign(position.y) * boundaryY
    }

    // Normalize velocity to maintain consistent speed
    const currentSpeed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2)
    const desiredSpeed = isMobile ? 0.02 : 0.03
    if (currentSpeed > 0) {
      velocity.x = (velocity.x / currentSpeed) * desiredSpeed
      velocity.y = (velocity.y / currentSpeed) * desiredSpeed
    }

    // Apply position to rocket
    rocket.position.x = position.x
    rocket.position.y = position.y
    rocket.position.z = position.z

    // Calculate target rotation based on velocity direction
    const angle = Math.atan2(velocity.y, velocity.x)
    targetRotation.z = angle - Math.PI / 2 // Adjust for rocket pointing up

    // Add subtle wobble
    targetRotation.x = Math.sin(time * 2) * 0.05
    targetRotation.y = Math.cos(time * 1.5) * 0.05

    // Smoothly interpolate rotation
    const rotationSpeed = 0.1
    currentRotation.x += (targetRotation.x - currentRotation.x) * rotationSpeed
    currentRotation.y += (targetRotation.y - currentRotation.y) * rotationSpeed
    currentRotation.z += (targetRotation.z - currentRotation.z) * rotationSpeed

    // Apply rotation
    rocket.rotation.x = currentRotation.x
    rocket.rotation.y = currentRotation.y
    rocket.rotation.z = currentRotation.z

    // Dynamic scaling based on Z position and screen size
    const baseScale = isMobile ? 0.25 : 0.35
    const minScale = isMobile ? 0.8 : 1.0
    const maxScale = isMobile ? 1.5 : 2.0

    const normalizedZ = 0.5
    const scaleRange = maxScale - minScale
    const scaleMultiplier = minScale + normalizedZ * scaleRange

    const dynamicScale = baseScale * scaleMultiplier
    rocket.scale.setScalar(dynamicScale)

    // Engine glow effect - varies with thrust
    const exhaustIntensity = 1.0 + Math.sin(time * 2) * 0.2
    const exhaustScale = (exhaustIntensity + Math.sin(time * 8) * 0.2) * (dynamicScale / baseScale)
    const exhaust = rocket.getObjectByName('exhaust')
    if (exhaust) {
      exhaust.scale.x = exhaustScale
      exhaust.scale.y = exhaustScale * (0.8 + Math.sin(time * 12) * 0.2)
    }

    // Adjust material opacity based on Z position for depth effect
    rocket.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        // Keep opacity between 0.8 and 1.0 for better visibility
        const opacity = 0.9
        child.material.opacity = Math.max(0.8, Math.min(1, opacity))
        child.material.transparent = true
      }
    })
  })

  return (
    <group ref={rocketRef} position={[0, 0, 0]} scale={0.3}>
      {/* Main Rocket Group */}
      <group rotation={[Math.PI / 2, 0, 0]}>
        {/* Rocket Body - Clean White */}
        <mesh name="body" position={[0, -0.5, 0]}>
          <cylinderGeometry args={[0.7, 0.8, 3, 16]} />
          <meshStandardMaterial
            color="#f8f9fa"
            metalness={0.2}
            roughness={0.4}
            emissive="#ffffff"
            emissiveIntensity={0.05}
          />
        </mesh>

        {/* Upper Body Transition */}
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 1, 16]} />
          <meshStandardMaterial
            color="#f8f9fa"
            metalness={0.2}
            roughness={0.4}
            emissive="#ffffff"
            emissiveIntensity={0.05}
          />
        </mesh>

        {/* Nose Cone - Integrated Design */}
        <group name="nose">
          {/* Smooth transition from body to nose */}
          <mesh position={[0, 2.2, 0]}>
            <cylinderGeometry args={[0.65, 0.7, 0.6, 16]} />
            <meshStandardMaterial
              color="#ffffff"
              metalness={0.25}
              roughness={0.35}
              emissive="#ffffff"
              emissiveIntensity={0.06}
            />
          </mesh>

          {/* Tapered section */}
          <mesh position={[0, 2.8, 0]}>
            <cylinderGeometry args={[0.4, 0.65, 1.2, 16]} />
            <meshStandardMaterial
              color="#ffffff"
              metalness={0.25}
              roughness={0.35}
              emissive="#ffffff"
              emissiveIntensity={0.06}
            />
          </mesh>

          {/* Rounded tip */}
          <mesh position={[0, 3.5, 0]}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial
              color="#ffffff"
              metalness={0.3}
              roughness={0.3}
              emissive="#ffffff"
              emissiveIntensity={0.08}
            />
          </mesh>
        </group>

        {/* Black Accent Band */}
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.72, 0.72, 0.3, 12]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Engine Section - Metallic */}
        <mesh position={[0, -2, 0]}>
          <cylinderGeometry args={[0.8, 0.9, 1, 12]} />
          <meshStandardMaterial color="#e0e0e0" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Fins - Aerodynamic Curved Design */}
        {[0, 120, 240].map((angle, i) => (
          <group
            key={i}
            position={[
              Math.sin((angle * Math.PI) / 180) * 0.9,
              -1.5,
              Math.cos((angle * Math.PI) / 180) * 0.9,
            ]}
            rotation={[0, (angle * Math.PI) / 180, 0]}
          >
            {/* Main fin body - tapered */}
            <mesh position={[0, 0, 0.3]} rotation={[0.2, 0, 0]}>
              <extrudeGeometry
                args={[
                  (() => {
                    const shape = new THREE.Shape()
                    shape.moveTo(0, -0.8)
                    shape.lineTo(0.6, -0.8)
                    shape.quadraticCurveTo(0.8, -0.6, 0.8, -0.3)
                    shape.lineTo(0.8, 0.5)
                    shape.quadraticCurveTo(0.7, 0.8, 0.4, 0.9)
                    shape.lineTo(0, 0.9)
                    shape.closePath()
                    return shape
                  })(),
                  {
                    depth: 0.06,
                    bevelEnabled: true,
                    bevelThickness: 0.02,
                    bevelSize: 0.02,
                    bevelSegments: 3,
                  },
                ]}
              />
              <meshStandardMaterial color="#f8f9fa" metalness={0.2} roughness={0.4} />
            </mesh>

            {/* Fin root fairing - smooth transition to body */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.15, 0.25, 1.8, 8, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color="#f8f9fa" metalness={0.2} roughness={0.4} />
            </mesh>
          </group>
        ))}

        {/* Engine Nozzles */}
        <group position={[0, -2.5, 0]}>
          {[0, 120, 240].map((angle, i) => (
            <mesh
              key={i}
              position={[
                Math.sin((angle * Math.PI) / 180) * 0.3,
                0,
                Math.cos((angle * Math.PI) / 180) * 0.3,
              ]}
            >
              <cylinderGeometry args={[0.15, 0.2, 0.5, 8]} />
              <meshStandardMaterial color="#2a2a2a" metalness={0.9} roughness={0.1} />
            </mesh>
          ))}
        </group>

        {/* Engine Exhaust - Clean Blue Flame with Twinkling */}
        <group position={[0, -3, 0]} name="exhaust">
          <mesh>
            <coneGeometry args={[0.6, 1.8, 12]} />
            <meshStandardMaterial
              color="#4d94ff"
              emissive="#0066ff"
              emissiveIntensity={2}
              transparent
              opacity={0.4}
            />
          </mesh>

          {/* Inner flame - Hot White Core */}
          <mesh scale={0.6}>
            <coneGeometry args={[0.4, 1.5, 12]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={4}
              transparent
              opacity={0.8}
            />
          </mesh>

          {/* Outer glow */}
          <mesh scale={1.2}>
            <coneGeometry args={[0.7, 1.2, 12]} />
            <meshStandardMaterial
              color="#6bb6ff"
              emissive="#0066ff"
              emissiveIntensity={1}
              transparent
              opacity={0.2}
            />
          </mesh>

          {/* Flickering particles */}
          <mesh scale={1.8} position={[0, -0.5, 0]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#4d94ff"
              emissiveIntensity={2}
              transparent
              opacity={0.1}
            />
          </mesh>
        </group>

        {/* Engine Glow - Blue */}
        <pointLight
          name="engineLight"
          position={[0, -3.5, 0]}
          color="#4d94ff"
          intensity={2}
          distance={10}
        />
      </group>
    </group>
  )
}
