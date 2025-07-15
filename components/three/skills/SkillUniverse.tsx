'use client'

import { useRef, useEffect, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { skillSystemMemory, skillsData } from '@/lib/wasm/skill-system'
import SkillOrb from './SkillOrb'
import SkillConstellation from './SkillConstellation'

interface SkillUniverseProps {
  mousePosition: { x: number; y: number }
  isVisible: boolean
}

// Main 3D scene component
function SkillScene({ mousePosition, isVisible }: SkillUniverseProps) {
  const { camera } = useThree()
  const prefersReducedMotion = useReducedMotion()
  const timeRef = useRef(0)
  const lastUpdateRef = useRef(0)
  
  // Initialize camera position
  useEffect(() => {
    camera.position.set(0, 0, 15)
    camera.lookAt(0, 0, 0)
  }, [camera])
  
  // Main animation loop
  useFrame((state, delta) => {
    if (!isVisible || prefersReducedMotion) return
    
    timeRef.current += delta
    const currentTime = timeRef.current
    
    // Update skill system at 60fps
    if (currentTime - lastUpdateRef.current > 1/60) {
      if (skillSystemMemory.isInitialized()) {
        // Apply mouse parallax
        const parallaxX = (mousePosition.x - 0.5) * 2
        const parallaxY = (mousePosition.y - 0.5) * 2
        
        skillSystemMemory.updateSystem(
          currentTime,
          delta,
          parallaxX,
          parallaxY
        )
      }
      
      lastUpdateRef.current = currentTime
    }
  })
  
  // Lighting setup
  const lights = useMemo(() => (
    <>
      {/* Ambient light for overall illumination */}
      <ambientLight intensity={0.2} color="#ffffff" />
      
      {/* Main directional light */}
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={0.5} 
        color="#ffffff"
        castShadow
      />
      
      {/* Blue accent light for frontend skills */}
      <pointLight 
        position={[0, 0, 5]} 
        intensity={1.2} 
        color="#3B82F6"
        distance={25}
        decay={2}
      />
      
      {/* Purple accent light for backend skills */}
      <pointLight 
        position={[8, 0, 5]} 
        intensity={1.2} 
        color="#8B5CF6"
        distance={25}
        decay={2}
      />
      
      {/* Cyan accent light for cross-platform skills */}
      <pointLight 
        position={[-8, 0, 5]} 
        intensity={1.2} 
        color="#06B6D4"
        distance={25}
        decay={2}
      />
    </>
  ), [])
  
  return (
    <>
      {lights}
      
      {/* Skill orbs - render both with and without WASM for debugging */}
      {skillsData.map((skill, index) => (
        <SkillOrb
          key={skill.name}
          skillIndex={index}
          skillData={skill}
          time={timeRef.current}
        />
      ))}
      
      
      {/* Constellation connections - only render when WASM is initialized */}
      {skillSystemMemory.isInitialized() && <SkillConstellation skillsData={skillsData} />}
    </>
  )
}

// Loading fallback component
function SkillUniverseLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-gray-400 text-sm">Loading skill universe...</div>
    </div>
  )
}

// Main component with Canvas wrapper
export default function SkillUniverse({ mousePosition, isVisible }: SkillUniverseProps) {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ 
          position: [0, 0, 15], 
          fov: 75,
          near: 0.1,
          far: 1000
        }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance'
        }}
        dpr={[1, 2]}
        performance={{
          min: 0.5,
          max: 1,
          debounce: 200
        }}
      >
        <Suspense fallback={null}>
          <SkillScene 
            mousePosition={mousePosition} 
            isVisible={isVisible && !prefersReducedMotion}
          />
        </Suspense>
        
        {/* Fog for depth */}
        <fog attach="fog" args={['#000000', 50, 100]} />
      </Canvas>
      
      {/* Loading state */}
      {!skillSystemMemory.isInitialized() && <SkillUniverseLoading />}
    </div>
  )
}