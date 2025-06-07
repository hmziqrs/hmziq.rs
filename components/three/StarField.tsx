'use client'

import React, { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { generateStars, createStarGeometry, getFrameRate, getAdaptiveStarCount } from '@/lib/three-utils'
import { useScrollProgress } from '@/hooks/useScrollProgress'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useViewportSize } from '@/hooks/useViewportSize'

const Stars: React.FC = () => {
  const meshRef = useRef<THREE.Points>(null)
  const { scrollProgress } = useScrollProgress()
  const prefersReducedMotion = useReducedMotion()
  const viewport = useViewportSize()
  
  // Adaptive star count based on viewport size
  const baseStarCount = useMemo(() => {
    if (viewport.width < 768) return 500  // Mobile
    if (viewport.width < 1024) return 800 // Tablet
    return 1200 // Desktop
  }, [viewport.width])

  const [starCount, setStarCount] = React.useState(baseStarCount)
  
  // Generate star data
  const stars = useMemo(() => generateStars(starCount), [starCount])
  const geometry = useMemo(() => createStarGeometry(stars), [stars])
  
  // Store original positions for parallax
  const originalPositions = useMemo(() => {
    return new Float32Array(geometry.attributes.position.array)
  }, [geometry])

  // Star material with shader
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: prefersReducedMotion ? 0.6 : 1.0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vSize;
        
        void main() {
          vColor = color;
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        varying vec3 vColor;
        varying float vSize;
        
        void main() {
          float distance = length(gl_PointCoord - vec2(0.5));
          float alpha = 1.0 - smoothstep(0.0, 0.5, distance);
          
          // Subtle twinkling effect (disabled if reduced motion)
          float twinkle = 1.0;
          ${!prefersReducedMotion ? `
            twinkle = sin(time * 2.0 + gl_FragCoord.x * 0.01) * 0.2 + 0.8;
          ` : ''}
          
          gl_FragColor = vec4(vColor * twinkle, alpha * opacity);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [prefersReducedMotion])

  // Animation frame
  useFrame((state) => {
    if (!meshRef.current || prefersReducedMotion) return

    // Update time uniform for twinkling
    material.uniforms.time.value = state.clock.getElapsedTime()

    // Apply parallax effect based on scroll
    const positions = geometry.attributes.position.array as Float32Array
    
    for (let i = 0; i < positions.length; i += 3) {
      const z = originalPositions[i + 2]
      const parallaxFactor = Math.abs(z) / 500
      
      positions[i] = originalPositions[i] + scrollProgress * parallaxFactor * 20
      positions[i + 1] = originalPositions[i + 1] - scrollProgress * parallaxFactor * 10
      positions[i + 2] = originalPositions[i + 2]
    }
    
    geometry.attributes.position.needsUpdate = true

    // Adaptive performance monitoring
    const fps = getFrameRate(performance.now())
    const adaptiveCount = getAdaptiveStarCount(fps, baseStarCount)
    
    if (adaptiveCount !== starCount) {
      setStarCount(adaptiveCount)
    }
  })

  return (
    <points ref={meshRef} geometry={geometry} material={material} />
  )
}

const StarField: React.FC = () => {
  return (
    <div className="fixed inset-0" style={{ zIndex: 1 }}>
      <Canvas
        camera={{
          position: [0, 0, 100],
          fov: 75,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: false, // Disable for better performance
          alpha: true,
          powerPreference: "high-performance"
        }}
        dpr={Math.min(window.devicePixelRatio, 2)} // Limit DPR for performance
        style={{ width: '100%', height: '100%' }}
      >
        <Stars />
      </Canvas>
    </div>
  )
}

export default StarField