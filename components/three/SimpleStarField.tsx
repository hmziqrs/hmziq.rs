'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function Stars() {
  const meshRef = useRef<THREE.Points>(null)
  
  const { particles, colors, sizes } = useMemo(() => {
    const count = 2000
    const particles = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      
      // Position
      const radius = 50 + Math.random() * 100
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      
      particles[i3] = radius * Math.sin(phi) * Math.cos(theta)
      particles[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      particles[i3 + 2] = radius * Math.cos(phi)
      
      // Colors - mix of white, blue, orange, and purple stars
      const colorChoice = Math.random()
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
      
      // Sizes - much larger with more variation
      const sizeRandom = Math.random()
      if (sizeRandom < 0.5) {
        // Small stars (50%)
        sizes[i] = 1 + Math.random() * 2
      } else if (sizeRandom < 0.8) {
        // Medium stars (30%)
        sizes[i] = 3 + Math.random() * 3
      } else if (sizeRandom < 0.95) {
        // Large stars (15%)
        sizes[i] = 6 + Math.random() * 4
      } else {
        // Extra large stars (5%)
        sizes[i] = 10 + Math.random() * 5
      }
    }
    
    return { particles, colors, sizes }
  }, [])
  
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 customColor;
        varying vec3 vColor;
        varying float vSize;
        
        void main() {
          vColor = customColor;
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vColor;
        varying float vSize;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          // Create soft circular shape
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          
          // Add glow effect - stronger for larger stars
          float glow = exp(-dist * 2.0) * 0.8 * (vSize / 10.0);
          
          // Twinkle effect
          float twinkle = sin(time + gl_FragCoord.x * 0.1) * 0.1 + 0.9;
          
          vec3 finalColor = vColor + glow;
          gl_FragColor = vec4(finalColor * twinkle, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }, [])
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.02
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.01
      // Update time uniform for twinkle effect
      ;(meshRef.current.material as THREE.ShaderMaterial).uniforms.time.value = state.clock.elapsedTime
    }
  })
  
  return (
    <points ref={meshRef} material={shaderMaterial}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles, 3]}
        />
        <bufferAttribute
          attach="attributes-customColor"
          args={[colors, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
    </points>
  )
}

function Nebula() {
  const mesh = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.z = state.clock.elapsedTime * 0.005
    }
  })
  
  return (
    <mesh ref={mesh} position={[0, 0, -50]}>
      <planeGeometry args={[200, 200]} />
      <shaderMaterial
        transparent
        blending={THREE.AdditiveBlending}
        uniforms={{
          time: { value: 0 }
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          uniform float time;
          
          float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
          }
          
          float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
          }
          
          void main() {
            vec2 st = vUv * 3.0;
            float n = noise(st + time * 0.1);
            
            // Create nebula colors
            vec3 color1 = vec3(0.1, 0.0, 0.2); // Deep purple
            vec3 color2 = vec3(0.0, 0.1, 0.3); // Deep blue
            vec3 nebula = mix(color1, color2, n);
            
            // Distance from center
            float dist = length(vUv - 0.5);
            float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * 0.15 * n;
            
            gl_FragColor = vec4(nebula, alpha);
          }
        `}
      />
    </mesh>
  )
}

export default function SimpleStarField() {
  return (
    <div className="fixed inset-0" style={{ zIndex: 1 }}>
      <Canvas
        camera={{ position: [0, 0, 50], fov: 75 }}
        style={{ background: '#000000' }}
      >
        <Nebula />
        <Stars />
      </Canvas>
    </div>
  )
}