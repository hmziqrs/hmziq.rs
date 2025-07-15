'use client'

import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { skillSystemMemory, type SkillData } from '@/lib/wasm/skill-system'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import * as THREE from 'three'

interface SkillOrbProps {
  skillIndex: number
  skillData: SkillData
  time?: number
}

export default function SkillOrb({ skillIndex, skillData }: SkillOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const [isHovered, setIsHovered] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  
  // Initial position - will be updated by useFrame when WASM is ready
  const [position] = useState(() => new THREE.Vector3(0, 0, 0))
  
  // Orb material based on category
  const orbMaterial = useMemo(() => {
    const baseColor = new THREE.Color(skillData.color.r, skillData.color.g, skillData.color.b)
    
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      metalness: 0.8,
      roughness: 0.2,
      emissive: baseColor.clone().multiplyScalar(0.1),
      emissiveIntensity: 0.5,
    })
  }, [skillData.color])
  
  // Glow material
  const glowMaterial = useMemo(() => {
    const glowColor = new THREE.Color(skillData.color.r, skillData.color.g, skillData.color.b)
    
    return new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    })
  }, [skillData.color])
  
  // Particle system for orb
  const particleSystem = useMemo(() => {
    const particleCount = 50
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    
    const color = new THREE.Color(skillData.color.r, skillData.color.g, skillData.color.b)
    
    for (let i = 0; i < particleCount; i++) {
      // Random positions around orb  
      const radius = 3 + Math.random() * 3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi)
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      
      // Color with some variation
      colors[i * 3] = color.r + (Math.random() - 0.5) * 0.2
      colors[i * 3 + 1] = color.g + (Math.random() - 0.5) * 0.2
      colors[i * 3 + 2] = color.b + (Math.random() - 0.5) * 0.2
      
      sizes[i] = Math.random() * 0.2 + 0.1
    }
    
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    })
    
    return { geometry, material }
  }, [skillData.color])
  
  // Update position from WASM system
  useFrame(() => {
    if (!skillSystemMemory.isInitialized() || prefersReducedMotion) return
    
    const wasmPosition = skillSystemMemory.getSkillPosition(skillIndex)
    if (wasmPosition && meshRef.current) {
      meshRef.current.position.set(wasmPosition[0], wasmPosition[1], wasmPosition[2])
      
      if (glowRef.current) {
        glowRef.current.position.copy(meshRef.current.position)
      }
      
      if (particlesRef.current) {
        particlesRef.current.position.copy(meshRef.current.position)
      }
    }
    
    // Update glow intensity
    const glowIntensity = skillSystemMemory.getSkillGlowIntensity(skillIndex)
    if (glowRef.current && glowRef.current.material instanceof THREE.MeshBasicMaterial) {
      glowRef.current.material.opacity = 0.3 * glowIntensity * (isHovered ? 2 : 1)
    }
    
    // Update scale based on proficiency and hover state
    const baseScale = skillSystemMemory.getSkillScale(skillIndex)
    const finalScale = baseScale * (isHovered ? 1.3 : 1)
    
    if (meshRef.current) {
      meshRef.current.scale.setScalar(finalScale)
    }
    
    // Rotate particles
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.005
      particlesRef.current.rotation.x += 0.002
    }
  })
  
  // Handle hover events
  const handlePointerOver = () => {
    setIsHovered(true)
    skillSystemMemory.setSkillHover(skillIndex, true)
    document.body.style.cursor = 'pointer'
  }
  
  const handlePointerOut = () => {
    setIsHovered(false)
    skillSystemMemory.setSkillHover(skillIndex, false)
    document.body.style.cursor = 'auto'
  }
  
  // Handle click events
  const handleClick = () => {
    // TODO: Implement skill detail modal or zoom effect
    console.log(`Clicked skill: ${skillData.name}`)
  }
  
  return (
    <group position={position}>
      {/* Main orb */}
      <mesh
        ref={meshRef}
        material={orbMaterial}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[2, 32, 32]} />
      </mesh>
      
      {/* Glow effect */}
      <mesh ref={glowRef} material={glowMaterial}>
        <sphereGeometry args={[2.4, 16, 16]} />
      </mesh>
      
      {/* Particle system */}
      <points ref={particlesRef} geometry={particleSystem.geometry} material={particleSystem.material} />
      
      {/* Skill label */}
      <Text
        position={[0, -3.5, 0]}
        fontSize={0.6}
        color="white"
        anchorX="center"
        anchorY="middle"
        font="/fonts/inter-medium.woff"
        characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?. "
      >
        {skillData.name}
      </Text>
      
      {/* Proficiency indicator */}
      <mesh position={[0, -4.2, 0]}>
        <planeGeometry args={[4 * skillData.proficiency, 0.15]} />
        <meshBasicMaterial 
          color={new THREE.Color(skillData.color.r, skillData.color.g, skillData.color.b)} 
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  )
}