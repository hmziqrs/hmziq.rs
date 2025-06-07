'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function Stars() {
  const meshRef = useRef<THREE.Points>(null)
  
  const particles = useMemo(() => {
    const particles = new Float32Array(1000 * 3)
    
    for (let i = 0; i < 1000; i++) {
      const i3 = i * 3
      particles[i3] = (Math.random() - 0.5) * 100
      particles[i3 + 1] = (Math.random() - 0.5) * 100
      particles[i3 + 2] = (Math.random() - 0.5) * 100
    }
    
    return particles
  }, [])
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.05
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.075
    }
  })
  
  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        sizeAttenuation
        color="#ffffff"
        transparent
        opacity={0.8}
      />
    </points>
  )
}

export default function SimpleStarField() {
  return (
    <div className="fixed inset-0" style={{ zIndex: -10 }}>
      <Canvas
        camera={{ position: [0, 0, 50], fov: 75 }}
        style={{ background: '#000000' }}
      >
        <Stars />
      </Canvas>
    </div>
  )
}