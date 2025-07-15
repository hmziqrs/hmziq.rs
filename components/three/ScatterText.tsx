'use client'

import { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { loadWASM, ScatterTextSharedMemory } from '@/lib/wasm'

interface ScatterTextProps {
  text: string
  fontSize?: number
  fontFamily?: string
  color?: string
  skip?: number
  autoAnimate?: boolean
  animationDelay?: number
}

// Vertex shader
const vertexShader = `
  attribute float opacity;
  attribute vec3 color;
  
  varying float vOpacity;
  varying vec3 vColor;
  
  void main() {
    vOpacity = opacity;
    vColor = color;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 0.0, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = 2.0;
  }
`

// Fragment shader
const fragmentShader = `
  varying float vOpacity;
  varying vec3 vColor;
  
  void main() {
    if (vOpacity <= 0.0) discard;
    
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    
    gl_FragColor = vec4(vColor, vOpacity);
  }
`

export default function ScatterText({
  text,
  fontSize = 100,
  fontFamily = 'Arial',
  color = 'white',
  skip = 4,
  autoAnimate = false,
  animationDelay = 3000
}: ScatterTextProps) {
  const { size } = useThree()
  const meshRef = useRef<THREE.Points>(null)
  const geometryRef = useRef<THREE.BufferGeometry>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const [wasmModule, setWasmModule] = useState<any>(null)
  const [sharedMemory, setSharedMemory] = useState<ScatterTextSharedMemory | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const animationTimerRef = useRef<number | null>(null)

  // Initialize WASM
  useEffect(() => {
    let mounted = true

    const initWASM = async () => {
      try {
        const module = await loadWASM()
        if (!mounted) return

        setWasmModule(module)
        
        // Initialize scatter text with max particles
        const memory = new ScatterTextSharedMemory(module, 10000)
        setSharedMemory(memory)
        
        // Generate text pixels
        const { pixelData, width, height } = memory.generateTextPixels(
          text,
          fontSize,
          fontFamily,
          color
        )
        
        // Set pixels in WASM
        const particleCount = module.set_text_pixels(
          pixelData,
          width,
          height,
          size.width,
          size.height,
          skip
        )
        
        console.log(`Created ${particleCount} particles for text: ${text}`)
        
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize ScatterText WASM:', error)
      }
    }

    initWASM()

    return () => {
      mounted = false
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
      }
    }
  }, [text, fontSize, fontFamily, color, skip, size.width, size.height])

  // Create geometry and material
  const { geometry, material } = useMemo(() => {
    if (!sharedMemory) {
      return { geometry: null, material: null }
    }

    const geometry = new THREE.BufferGeometry()
    
    // Set up attributes pointing to shared memory
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array(sharedMemory.positions_x.length * 3),
        3
      )
    )
    
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(
        new Float32Array(sharedMemory.colors_r.length * 3),
        3
      )
    )
    
    geometry.setAttribute(
      'opacity',
      new THREE.BufferAttribute(sharedMemory.opacity, 1)
    )

    // Create shader material
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    return { geometry, material }
  }, [sharedMemory])

  // Auto-animation effect
  useEffect(() => {
    if (!autoAnimate || !wasmModule || !isInitialized) return

    // Initial form
    wasmModule.start_forming()

    // Set up animation cycle
    animationTimerRef.current = window.setInterval(() => {
      if (wasmModule.is_forming()) {
        wasmModule.start_scattering()
      } else {
        wasmModule.start_forming()
      }
    }, animationDelay)

    return () => {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
      }
    }
  }, [autoAnimate, animationDelay, wasmModule, isInitialized])

  // Update particles and geometry
  useFrame((_, delta) => {
    if (!wasmModule || !sharedMemory || !geometry || !material || !isInitialized) return

    // Update particles in WASM
    sharedMemory.updateFrame(wasmModule, delta)

    // Update Three.js geometry from shared memory
    const positionAttribute = geometry.attributes.position as THREE.BufferAttribute
    const colorAttribute = geometry.attributes.color as THREE.BufferAttribute
    const opacityAttribute = geometry.attributes.opacity as THREE.BufferAttribute

    // Combine x, y into position vec3 (z = 0)
    const positions = positionAttribute.array as Float32Array
    const colors = colorAttribute.array as Float32Array
    
    const particleCount = wasmModule.get_particle_count()
    
    for (let i = 0; i < particleCount; i++) {
      // Position
      positions[i * 3] = sharedMemory.positions_x[i] - size.width / 2
      positions[i * 3 + 1] = -sharedMemory.positions_y[i] + size.height / 2
      positions[i * 3 + 2] = 0
      
      // Color
      colors[i * 3] = sharedMemory.colors_r[i]
      colors[i * 3 + 1] = sharedMemory.colors_g[i]
      colors[i * 3 + 2] = sharedMemory.colors_b[i]
    }

    // Mark attributes as needing update
    positionAttribute.needsUpdate = true
    colorAttribute.needsUpdate = true
    opacityAttribute.needsUpdate = true

    // Update draw range
    geometry.setDrawRange(0, particleCount)
  })

  // Store refs
  useEffect(() => {
    if (geometry) geometryRef.current = geometry
    if (material) materialRef.current = material
  }, [geometry, material])

  if (!geometry || !material) return null

  return (
    <points ref={meshRef} geometry={geometry} material={material} />
  )
}