'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { skillSystemMemory, type SkillData } from '@/lib/wasm/skill-system'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import * as THREE from 'three'

interface SkillConstellationProps {
  skillsData: SkillData[]
}

export default function SkillConstellation({ skillsData }: SkillConstellationProps) {
  const linesRef = useRef<THREE.LineSegments>(null)
  const prefersReducedMotion = useReducedMotion()
  
  // Create connection mapping
  const connections = useMemo(() => {
    const connectionMap: Array<{ from: number; to: number; strength: number }> = []
    
    skillsData.forEach((skill, index) => {
      skill.connections.forEach(connectionName => {
        const targetIndex = skillsData.findIndex(s => s.name === connectionName)
        if (targetIndex !== -1 && targetIndex > index) { // Avoid duplicate connections
          connectionMap.push({
            from: index,
            to: targetIndex,
            strength: 0.6 + Math.random() * 0.4 // Random strength between 0.6-1.0
          })
        }
      })
    })
    
    return connectionMap
  }, [skillsData])
  
  // Create line geometry and material
  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(connections.length * 6) // 2 points per line, 3 coords per point
    const colors = new Float32Array(connections.length * 6) // 2 colors per line, 3 channels per color
    const opacities = new Float32Array(connections.length * 2) // 2 opacity values per line
    
    // Initialize with placeholder values
    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i]
      const baseIndex = i * 6
      const opacityIndex = i * 2
      
      // Get skill colors
      const fromSkill = skillsData[connection.from]
      const toSkill = skillsData[connection.to]
      
      // Start point (from skill)
      positions[baseIndex] = 0
      positions[baseIndex + 1] = 0
      positions[baseIndex + 2] = 0
      colors[baseIndex] = fromSkill.color.r
      colors[baseIndex + 1] = fromSkill.color.g
      colors[baseIndex + 2] = fromSkill.color.b
      opacities[opacityIndex] = connection.strength * 0.5
      
      // End point (to skill)
      positions[baseIndex + 3] = 0
      positions[baseIndex + 4] = 0
      positions[baseIndex + 5] = 0
      colors[baseIndex + 3] = toSkill.color.r
      colors[baseIndex + 4] = toSkill.color.g
      colors[baseIndex + 5] = toSkill.color.b
      opacities[opacityIndex + 1] = connection.strength * 0.5
    }
    
    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    lineGeometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1))
    
    // Custom shader material for constellation lines
    const lineMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float opacity;
        varying vec3 vColor;
        varying float vOpacity;
        
        void main() {
          vColor = color;
          vOpacity = opacity;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        
        void main() {
          gl_FragColor = vec4(vColor, vOpacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    })
    
    return { geometry: lineGeometry, material: lineMaterial }
  }, [connections, skillsData])
  
  // Update line positions from WASM
  useFrame((state) => {
    if (!skillSystemMemory.isInitialized() || !linesRef.current || prefersReducedMotion) return
    
    const time = state.clock.elapsedTime
    const positions = geometry.getAttribute('position').array as Float32Array
    const opacities = geometry.getAttribute('opacity').array as Float32Array
    
    connections.forEach((connection, i) => {
      const baseIndex = i * 6
      const opacityIndex = i * 2
      
      // Get positions from WASM
      const fromPos = skillSystemMemory.getSkillPosition(connection.from)
      const toPos = skillSystemMemory.getSkillPosition(connection.to)
      
      if (fromPos && toPos) {
        // Update start point
        positions[baseIndex] = fromPos[0]
        positions[baseIndex + 1] = fromPos[1]
        positions[baseIndex + 2] = fromPos[2]
        
        // Update end point
        positions[baseIndex + 3] = toPos[0]
        positions[baseIndex + 4] = toPos[1]
        positions[baseIndex + 5] = toPos[2]
        
        // Animate opacity with pulsing effect
        const pulsePhase = time * 2 + i * 0.5
        const pulse = Math.sin(pulsePhase) * 0.2 + 0.8
        const baseOpacity = connection.strength * 0.3
        
        // Check if either skill is hovered
        const fromHovered = skillSystemMemory.getSkillHover(connection.from)
        const toHovered = skillSystemMemory.getSkillHover(connection.to)
        const isHighlighted = fromHovered || toHovered
        
        const finalOpacity = baseOpacity * pulse * (isHighlighted ? 2.5 : 1)
        
        opacities[opacityIndex] = finalOpacity
        opacities[opacityIndex + 1] = finalOpacity
      }
    })
    
    geometry.getAttribute('position').needsUpdate = true
    geometry.getAttribute('opacity').needsUpdate = true
  })
  
  // Energy wave effect along lines (currently unused but kept for future enhancement)
  // const energyWaves = useMemo(() => {
  //   return connections.map((connection, index) => {
  //     const points = []
  //     for (let i = 0; i <= 20; i++) {
  //       const t = i / 20
  //       points.push(new THREE.Vector3(t * 10, Math.sin(t * Math.PI * 4) * 0.2, 0))
  //     }
  //     
  //     const curve = new THREE.CatmullRomCurve3(points)
  //     return curve
  //   })
  // }, [connections])
  
  return (
    <group>
      {/* Main constellation lines */}
      <lineSegments ref={linesRef} geometry={geometry} material={material} />
      
      {/* Energy particles along connections */}
      {!prefersReducedMotion && connections.map((connection, index) => (
        <EnergyWave
          key={index}
          connection={connection}
          skillsData={skillsData}
          index={index}
        />
      ))}
    </group>
  )
}

// Energy wave component for individual connections
function EnergyWave({ 
  connection, 
  skillsData, 
  index 
}: { 
  connection: { from: number; to: number; strength: number }
  skillsData: SkillData[]
  index: number 
}) {
  const particleRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (!skillSystemMemory.isInitialized() || !particleRef.current) return
    
    const time = state.clock.elapsedTime
    const fromPos = skillSystemMemory.getSkillPosition(connection.from)
    const toPos = skillSystemMemory.getSkillPosition(connection.to)
    
    if (fromPos && toPos) {
      // Animate particle along the line
      const speed = 0.5 + connection.strength * 0.5
      const t = ((time * speed + index * 0.3) % 1)
      
      // Linear interpolation between skills
      const x = fromPos[0] + (toPos[0] - fromPos[0]) * t
      const y = fromPos[1] + (toPos[1] - fromPos[1]) * t
      const z = fromPos[2] + (toPos[2] - fromPos[2]) * t
      
      particleRef.current.position.set(x, y, z)
      
      // Pulse scale
      const pulse = Math.sin(time * 10 + index) * 0.3 + 0.7
      particleRef.current.scale.setScalar(pulse * 0.1)
    }
  })
  
  const particleMaterial = useMemo(() => {
    const fromSkill = skillsData[connection.from]
    const color = new THREE.Color(fromSkill.color.r, fromSkill.color.g, fromSkill.color.b)
    
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
    })
  }, [connection, skillsData])
  
  return (
    <mesh ref={particleRef} material={particleMaterial}>
      <sphereGeometry args={[0.05, 8, 8]} />
    </mesh>
  )
}