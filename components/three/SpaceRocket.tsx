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
  
  const [velocity] = useState(() => ({
    x: (Math.random() - 0.5) * 0.3,  // Increased velocity
    y: (Math.random() - 0.5) * 0.3,
    z: (Math.random() - 0.5) * 0.2
  }))
  
  // Store target velocity for smooth transitions
  const targetVelocity = useRef({ ...velocity })
  
  const [rotation] = useState(() => ({
    x: Math.random() * 0.02,
    y: Math.random() * 0.02,
    z: Math.random() * 0.02
  }))

  useFrame((state) => {
    if (!rocketRef.current) return

    const rocket = rocketRef.current
    const time = state.clock.elapsedTime

    // Update position
    rocket.position.x += velocity.x
    rocket.position.y += velocity.y
    rocket.position.z += velocity.z

    // Dynamic scaling based on Z position and screen size
    const baseScale = isMobile ? 0.25 : 0.35
    const minScale = isMobile ? 0.8 : 1.0  // Much higher minimum - never goes below base size
    const maxScale = isMobile ? 1.5 : 2.0
    
    // Map Z position (-15 to 15) to scale (minScale to maxScale)
    const normalizedZ = (rocket.position.z + 15) / 30  // 0 to 1
    const scaleRange = maxScale - minScale
    const scaleMultiplier = minScale + (normalizedZ * scaleRange)
    
    const dynamicScale = baseScale * scaleMultiplier
    rocket.scale.setScalar(dynamicScale)

    // Smooth velocity interpolation for curved motion
    const lerpFactor = 0.05
    velocity.x = THREE.MathUtils.lerp(velocity.x, targetVelocity.current.x, lerpFactor)
    velocity.y = THREE.MathUtils.lerp(velocity.y, targetVelocity.current.y, lerpFactor)
    velocity.z = THREE.MathUtils.lerp(velocity.z, targetVelocity.current.z, lerpFactor)

    // Smooth boundary detection with curved turns
    const dampingFactor = 0.98
    const boundaryBuffer = 8
    const curveStrength = 0.02  // How much to curve when approaching boundary

    // X boundary with smooth curves
    if (rocket.position.x > bounds.x - boundaryBuffer) {
      const distance = rocket.position.x - (bounds.x - boundaryBuffer)
      targetVelocity.current.x = -Math.abs(targetVelocity.current.x) * dampingFactor
      targetVelocity.current.y += curveStrength * distance * (Math.random() - 0.5)
    } else if (rocket.position.x < -bounds.x + boundaryBuffer) {
      const distance = (-bounds.x + boundaryBuffer) - rocket.position.x
      targetVelocity.current.x = Math.abs(targetVelocity.current.x) * dampingFactor
      targetVelocity.current.y += curveStrength * distance * (Math.random() - 0.5)
    }

    // Y boundary with smooth curves
    if (rocket.position.y > bounds.y - boundaryBuffer) {
      const distance = rocket.position.y - (bounds.y - boundaryBuffer)
      targetVelocity.current.y = -Math.abs(targetVelocity.current.y) * dampingFactor
      targetVelocity.current.x += curveStrength * distance * (Math.random() - 0.5)
    } else if (rocket.position.y < -bounds.y + boundaryBuffer) {
      const distance = (-bounds.y + boundaryBuffer) - rocket.position.y
      targetVelocity.current.y = Math.abs(targetVelocity.current.y) * dampingFactor
      targetVelocity.current.x += curveStrength * distance * (Math.random() - 0.5)
    }

    // Z boundary with smooth curves
    if (rocket.position.z > 15) {
      targetVelocity.current.z = -Math.abs(targetVelocity.current.z) * dampingFactor
    } else if (rocket.position.z < -15) {
      targetVelocity.current.z = Math.abs(targetVelocity.current.z) * dampingFactor
    }

    // Maintain minimum velocity
    const minVelocity = 0.1
    if (Math.abs(targetVelocity.current.x) < minVelocity) {
      targetVelocity.current.x = minVelocity * Math.sign(targetVelocity.current.x || 1)
    }
    if (Math.abs(targetVelocity.current.y) < minVelocity) {
      targetVelocity.current.y = minVelocity * Math.sign(targetVelocity.current.y || 1)
    }

    // Rotate rocket to face direction of movement
    const targetRotationY = Math.atan2(velocity.x, velocity.z)
    const targetRotationX = Math.atan2(velocity.y, Math.sqrt(velocity.x ** 2 + velocity.z ** 2)) * 0.5
    
    rocket.rotation.y = THREE.MathUtils.lerp(rocket.rotation.y, targetRotationY, 0.1)
    rocket.rotation.x = THREE.MathUtils.lerp(rocket.rotation.x, targetRotationX, 0.1)
    
    // Add some spin
    rocket.rotation.z += rotation.z

    // Engine glow effect - also affected by rocket scale
    const exhaustScale = (1 + Math.sin(time * 10) * 0.2) * (dynamicScale / baseScale)
    const exhaust = rocket.getObjectByName('exhaust')
    if (exhaust) {
      exhaust.scale.x = exhaustScale
      exhaust.scale.y = exhaustScale
    }
    
    // Adjust material opacity based on Z position for depth effect
    rocket.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        // Keep opacity between 0.8 and 1.0 for better visibility
        const opacity = 0.9 + (rocket.position.z / 30) * 0.1
        child.material.opacity = Math.max(0.8, Math.min(1, opacity))
        child.material.transparent = true
      }
    })
  })

  return (
    <group ref={rocketRef} position={[0, 0, 0]} scale={0.3}>
      {/* Main Rocket Group */}
      <group rotation={[Math.PI / 2, 0, 0]}>
        {/* Rocket Body */}
        <mesh name="body">
          <cylinderGeometry args={[0.6, 0.8, 4, 6]} />
          <meshStandardMaterial 
            color="#c0c0c0" 
            metalness={0.9} 
            roughness={0.1}
            emissive="#ffffff"
            emissiveIntensity={0.1}
          />
        </mesh>
        
        {/* Nose Cone */}
        <mesh position={[0, 2.5, 0]} name="nose">
          <coneGeometry args={[0.6, 1.5, 6]} />
          <meshStandardMaterial 
            color="#ff6b6b" 
            metalness={0.8} 
            roughness={0.2}
            emissive="#ff4444"
            emissiveIntensity={0.2}
          />
        </mesh>
        
        {/* Engine Section */}
        <mesh position={[0, -2, 0]}>
          <cylinderGeometry args={[0.8, 0.9, 1, 6]} />
          <meshStandardMaterial 
            color="#4a4a4a" 
            metalness={0.7} 
            roughness={0.3}
          />
        </mesh>
        
        {/* Fins */}
        {[0, 120, 240].map((angle, i) => (
          <mesh
            key={i}
            position={[
              Math.sin((angle * Math.PI) / 180) * 1,
              -1.5,
              Math.cos((angle * Math.PI) / 180) * 1
            ]}
            rotation={[0, (angle * Math.PI) / 180, 0]}
          >
            <boxGeometry args={[0.1, 1.5, 1]} />
            <meshStandardMaterial 
              color="#ff6b6b" 
              metalness={0.7} 
              roughness={0.3}
              emissive="#ff4444"
              emissiveIntensity={0.1}
            />
          </mesh>
        ))}
        
        {/* Engine Exhaust */}
        <group position={[0, -2.8, 0]} name="exhaust">
          <mesh>
            <coneGeometry args={[0.7, 1.5, 6]} />
            <meshStandardMaterial
              color="#ffaa00"
              emissive="#ff6600"
              emissiveIntensity={3}
              transparent
              opacity={0.6}
            />
          </mesh>
          
          {/* Inner flame */}
          <mesh scale={0.7}>
            <coneGeometry args={[0.5, 1.2, 6]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffff00"
              emissiveIntensity={4}
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
        
        {/* Engine Glow */}
        <pointLight position={[0, -3.5, 0]} color="#ff6600" intensity={3} distance={8} />
      </group>
    </group>
  )
}