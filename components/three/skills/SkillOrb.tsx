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
  const textRef = useRef<any>(null)
  const proficiencyRef = useRef<THREE.Mesh>(null)
  const [isHovered, setIsHovered] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  
  // Initial position - will be updated by useFrame when WASM is ready
  const [position] = useState(() => new THREE.Vector3(0, 0, 0))
  
  // Orb material based on category
  const orbMaterial = useMemo(() => {
    const baseColor = new THREE.Color(skillData.color.r, skillData.color.g, skillData.color.b)
    
    // Use basic material for debugging to ensure visibility
    return new THREE.MeshBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: 0.8,
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
      
      // Update text and proficiency indicator positions
      if (textRef.current) {
        textRef.current.position.set(
          meshRef.current.position.x,
          meshRef.current.position.y - 4.5,
          meshRef.current.position.z
        )
      }
      
      if (proficiencyRef.current) {
        proficiencyRef.current.position.set(
          meshRef.current.position.x,
          meshRef.current.position.y - 5.8,
          meshRef.current.position.z
        )
      }
    } else {
      // Debug: Set category-based orbital positions if WASM position is null
      const categoryPositions = {
        frontend: { center: [-8, 0, 0], radius: 6 },    // Left side - Blue
        backend: { center: [8, 0, 0], radius: 6 },      // Right side - Purple  
        crossPlatform: { center: [0, -8, 0], radius: 6 } // Bottom - Cyan
      }
      
      const categoryData = categoryPositions[skillData.category]
      if (categoryData && meshRef.current) {
        // Calculate orbital position based on time and skill index
        const time = Date.now() * 0.001
        const angleOffset = (skillIndex * Math.PI * 2) / 4 // 4 skills per category max
        const angle = time * 0.2 + angleOffset
        
        const x = categoryData.center[0] + Math.cos(angle) * categoryData.radius
        const y = categoryData.center[1] + Math.sin(angle) * categoryData.radius * 0.5
        const z = categoryData.center[2] + Math.sin(angle * 1.5) * 2
        
        meshRef.current.position.set(x, y, z)
        
        if (glowRef.current) {
          glowRef.current.position.copy(meshRef.current.position)
        }
        
        if (particlesRef.current) {
          particlesRef.current.position.copy(meshRef.current.position)
        }
        
        // Update text and proficiency indicator positions
        if (textRef.current) {
          textRef.current.position.set(x, y - 4.5, z)
        }
        
        if (proficiencyRef.current) {
          proficiencyRef.current.position.set(x, y - 5.8, z)
        }
      }
    }
    
    // Update glow intensity
    const glowIntensity = skillSystemMemory.getSkillGlowIntensity(skillIndex)
    if (glowRef.current && glowRef.current.material instanceof THREE.MeshBasicMaterial) {
      glowRef.current.material.opacity = 0.3 * Math.max(0.5, glowIntensity) * (isHovered ? 2 : 1)
    }
    
    // Update scale based on proficiency and hover state
    const baseScale = skillSystemMemory.getSkillScale(skillIndex)
    const finalScale = Math.max(1, baseScale) * (isHovered ? 1.3 : 1)
    
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
    <group>
      {/* Main orb */}
      <mesh
        ref={meshRef}
        material={orbMaterial}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[3, 32, 32]} />
      </mesh>
      
      {/* Glow effect */}
      <mesh ref={glowRef} material={glowMaterial}>
        <sphereGeometry args={[2.4, 16, 16]} />
      </mesh>
      
      {/* Particle system */}
      <points ref={particlesRef} geometry={particleSystem.geometry} material={particleSystem.material} />
      
      {/* Skill label - positioned relative to the orb */}
      <Text
        ref={textRef}
        position={[0, -4.5, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        font="/fonts/inter-medium.woff"
        characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?.()"
      >
        {skillData.name}
      </Text>
      
      {/* Proficiency indicator - positioned relative to the orb */}
      <mesh ref={proficiencyRef} position={[0, -5.8, 0]}>
        <planeGeometry args={[4 * skillData.proficiency, 0.2]} />
        <meshBasicMaterial 
          color={new THREE.Color(skillData.color.r, skillData.color.g, skillData.color.b)} 
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  )
}