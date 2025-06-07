'use client'

import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface RocketProps {
  bounds?: { x: number; y: number }
}

export default function SpaceRocket({ bounds = { x: 30, y: 20 } }: RocketProps) {
  const rocketRef = useRef<THREE.Group>(null)
  const [velocity] = useState(() => ({
    x: (Math.random() - 0.5) * 0.2,
    y: (Math.random() - 0.5) * 0.2,
    z: (Math.random() - 0.5) * 0.1
  }))
  
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

    // Smooth boundary detection and bounce
    const dampingFactor = 0.95
    const boundaryBuffer = 5 // Start slowing down before hitting boundary

    // X boundary
    if (rocket.position.x > bounds.x - boundaryBuffer) {
      velocity.x = -Math.abs(velocity.x) * dampingFactor
      rocket.position.x = bounds.x - boundaryBuffer
    } else if (rocket.position.x < -bounds.x + boundaryBuffer) {
      velocity.x = Math.abs(velocity.x) * dampingFactor
      rocket.position.x = -bounds.x + boundaryBuffer
    }

    // Y boundary
    if (rocket.position.y > bounds.y - boundaryBuffer) {
      velocity.y = -Math.abs(velocity.y) * dampingFactor
      rocket.position.y = bounds.y - boundaryBuffer
    } else if (rocket.position.y < -bounds.y + boundaryBuffer) {
      velocity.y = Math.abs(velocity.y) * dampingFactor
      rocket.position.y = -bounds.y + boundaryBuffer
    }

    // Z boundary (depth)
    if (rocket.position.z > 10) {
      velocity.z = -Math.abs(velocity.z) * dampingFactor
      rocket.position.z = 10
    } else if (rocket.position.z < -10) {
      velocity.z = Math.abs(velocity.z) * dampingFactor
      rocket.position.z = -10
    }

    // Maintain minimum velocity
    const minVelocity = 0.05
    if (Math.abs(velocity.x) < minVelocity) velocity.x = minVelocity * Math.sign(velocity.x)
    if (Math.abs(velocity.y) < minVelocity) velocity.y = minVelocity * Math.sign(velocity.y)

    // Rotate rocket to face direction of movement
    const targetRotationY = Math.atan2(velocity.x, velocity.z)
    const targetRotationX = Math.atan2(velocity.y, Math.sqrt(velocity.x ** 2 + velocity.z ** 2)) * 0.5
    
    rocket.rotation.y = THREE.MathUtils.lerp(rocket.rotation.y, targetRotationY, 0.1)
    rocket.rotation.x = THREE.MathUtils.lerp(rocket.rotation.x, targetRotationX, 0.1)
    
    // Add some spin
    rocket.rotation.z += rotation.z

    // Engine glow effect
    const exhaustScale = 1 + Math.sin(time * 10) * 0.2
    const exhaust = rocket.getObjectByName('exhaust')
    if (exhaust) {
      exhaust.scale.x = exhaustScale
      exhaust.scale.y = exhaustScale
    }
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