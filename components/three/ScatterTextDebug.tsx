'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { loadWASM, ScatterTextSharedMemory } from '@/lib/wasm'

interface DebugInfo {
  wasmInitialized: boolean
  particleCount: number
  memorySize: number
  positionPtr: number
  lastError: string | null
  frameCount: number
  bufferSizes: {
    positions: number
    colors: number
    opacity: number
  }
}

interface ScatterTextDebugProps {
  text: string
  fontSize?: number
  fontFamily?: string
  color?: string
  skip?: number
  autoAnimate?: boolean
  animationDelay?: number
  debugMode?: boolean
  onDebugInfo?: (info: DebugInfo) => void
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
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
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

// Fixed particle count to prevent buffer resizing
const MAX_PARTICLES = 10000

export default function ScatterTextDebug({
  text,
  fontSize = 100,
  fontFamily = 'Arial',
  color = 'white',
  skip = 4,
  autoAnimate = false,
  animationDelay = 3000,
  debugMode = false,
  onDebugInfo
}: ScatterTextDebugProps) {
  const { size } = useThree()
  const meshRef = useRef<THREE.Points>(null)
  const geometryRef = useRef<THREE.BufferGeometry | null>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const [wasmModule, setWasmModule] = useState<any>(null)
  const [sharedMemory, setSharedMemory] = useState<ScatterTextSharedMemory | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const animationTimerRef = useRef<number | null>(null)
  const frameCountRef = useRef(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [particleCount, setParticleCount] = useState(0)

  // Debug logging helper
  const debugLog = useCallback((...args: any[]) => {
    if (debugMode) {
      console.log('[ScatterTextDebug]', ...args)
    }
  }, [debugMode])

  // Update debug info
  const updateDebugInfo = useCallback(() => {
    if (!onDebugInfo) return

    const info: DebugInfo = {
      wasmInitialized: !!wasmModule,
      particleCount: particleCount,
      memorySize: wasmModule?.memory?.buffer?.byteLength || 0,
      positionPtr: sharedMemory?.positions_x ? sharedMemory.positions_x.byteOffset : 0,
      lastError: lastError,
      frameCount: frameCountRef.current,
      bufferSizes: {
        positions: geometryRef.current?.attributes?.position?.array?.length || 0,
        colors: geometryRef.current?.attributes?.color?.array?.length || 0,
        opacity: geometryRef.current?.attributes?.opacity?.array?.length || 0
      }
    }

    onDebugInfo(info)
  }, [wasmModule, sharedMemory, particleCount, lastError, onDebugInfo])

  // Initialize WASM - only once
  useEffect(() => {
    let mounted = true

    const initWASM = async () => {
      debugLog('Starting WASM initialization...')
      
      try {
        const module = await loadWASM()
        if (!mounted) return

        debugLog('WASM module loaded successfully')
        setWasmModule(module)
        
        // Initialize scatter text with max particles
        debugLog('Initializing scatter text with max particles:', MAX_PARTICLES)
        const memory = new ScatterTextSharedMemory(module, MAX_PARTICLES)
        setSharedMemory(memory)
        
        debugLog('Scatter text initialized, memory pointers:', {
          positions_x: memory.positions_x.byteOffset,
          positions_y: memory.positions_y.byteOffset,
          particleCapacity: MAX_PARTICLES
        })
        
        setIsInitialized(true)
      } catch (error) {
        const errorMsg = `Failed to initialize WASM: ${error}`
        console.error(errorMsg)
        setLastError(errorMsg)
      }
    }

    if (!wasmModule) {
      initWASM()
    }

    return () => {
      mounted = false
    }
  }, [debugLog]) // Only depend on debugLog, not other props

  // Generate text pixels when text changes
  useEffect(() => {
    if (!wasmModule || !sharedMemory || !isInitialized) return

    debugLog('Generating text pixels for:', text)

    try {
      // Generate text pixels
      const { pixelData, width, height } = sharedMemory.generateTextPixels(
        text,
        fontSize,
        fontFamily,
        color
      )
      
      debugLog('Text pixels generated:', { width, height, pixelDataLength: pixelData.length })
      
      // Set pixels in WASM
      const newParticleCount = wasmModule.set_text_pixels(
        pixelData,
        width,
        height,
        size.width,
        size.height,
        skip
      )
      
      setParticleCount(newParticleCount)
      debugLog(`Created ${newParticleCount} particles for text: ${text}`)
      
    } catch (error) {
      const errorMsg = `Failed to generate text pixels: ${error}`
      console.error(errorMsg)
      setLastError(errorMsg)
    }
  }, [wasmModule, sharedMemory, isInitialized, text, fontSize, fontFamily, color, skip, size.width, size.height, debugLog])

  // Create geometry and material - only once
  useEffect(() => {
    if (!sharedMemory) return

    debugLog('Creating Three.js geometry and material')

    try {
      // Dispose old geometry if it exists
      if (geometryRef.current) {
        debugLog('Disposing old geometry')
        geometryRef.current.dispose()
      }

      const geometry = new THREE.BufferGeometry()
      
      // Create buffer attributes with fixed sizes
      const positions = new Float32Array(MAX_PARTICLES * 3)
      const colors = new Float32Array(MAX_PARTICLES * 3)
      const opacities = new Float32Array(MAX_PARTICLES)
      
      debugLog('Created buffers:', {
        positions: positions.length,
        colors: colors.length,
        opacities: opacities.length
      })
      
      // Fill with default values
      for (let i = 0; i < MAX_PARTICLES; i++) {
        positions[i * 3] = 0
        positions[i * 3 + 1] = 0
        positions[i * 3 + 2] = 0
        colors[i * 3] = 1
        colors[i * 3 + 1] = 1
        colors[i * 3 + 2] = 1
        opacities[i] = 0
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1))
      geometry.setDrawRange(0, 0) // Start with no particles visible
      
      geometryRef.current = geometry

      // Create shader material if needed
      if (!materialRef.current) {
        debugLog('Creating shader material')
        const material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
        materialRef.current = material
      }

    } catch (error) {
      const errorMsg = `Failed to create geometry: ${error}`
      console.error(errorMsg)
      setLastError(errorMsg)
    }

    // Cleanup
    return () => {
      if (geometryRef.current) {
        debugLog('Cleaning up geometry')
        geometryRef.current.dispose()
        geometryRef.current = null
      }
    }
  }, [sharedMemory, debugLog])

  // Auto-animation effect
  useEffect(() => {
    if (!autoAnimate || !wasmModule || !isInitialized || debugMode) return

    debugLog('Starting auto-animation')
    
    // Initial form
    wasmModule.start_forming()

    // Set up animation cycle
    animationTimerRef.current = window.setInterval(() => {
      if (wasmModule.is_forming()) {
        debugLog('Switching to scatter')
        wasmModule.start_scattering()
      } else {
        debugLog('Switching to form')
        wasmModule.start_forming()
      }
    }, animationDelay)

    return () => {
      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current)
      }
    }
  }, [autoAnimate, animationDelay, wasmModule, isInitialized, debugMode, debugLog])

  // Manual update function for debug mode
  const updateParticles = useCallback((delta: number = 0.016) => {
    if (!wasmModule || !sharedMemory || !geometryRef.current || !isInitialized) {
      debugLog('Cannot update: missing dependencies')
      return
    }

    try {
      frameCountRef.current++

      // Validate memory before update
      const memorySize = wasmModule.memory.buffer.byteLength
      let currentMemory = sharedMemory
      
      if (sharedMemory.positions_x.buffer.byteLength !== memorySize) {
        debugLog('WASM memory has grown, refreshing shared memory views...')
        
        // Recreate shared memory views with the new memory buffer
        currentMemory = new ScatterTextSharedMemory(wasmModule, MAX_PARTICLES)
        setSharedMemory(currentMemory)
        
        // Use the refreshed memory for this update
        currentMemory.updateFrame(wasmModule, delta)
      } else {
        // Normal update with existing memory
        currentMemory.updateFrame(wasmModule, delta)
      }

      // Get geometry attributes
      const geometry = geometryRef.current
      const positionAttribute = geometry.attributes.position as THREE.BufferAttribute
      const colorAttribute = geometry.attributes.color as THREE.BufferAttribute
      const opacityAttribute = geometry.attributes.opacity as THREE.BufferAttribute

      // Get arrays
      const positions = positionAttribute.array as Float32Array
      const colors = colorAttribute.array as Float32Array
      const opacities = opacityAttribute.array as Float32Array
      
      const currentParticleCount = Math.min(wasmModule.get_particle_count(), MAX_PARTICLES)
      
      if (debugMode && frameCountRef.current % 60 === 0) {
        debugLog('Updating particles:', {
          particleCount: currentParticleCount,
          frame: frameCountRef.current
        })
      }
      
      // Copy data from shared memory to Three.js buffers
      for (let i = 0; i < currentParticleCount; i++) {
        // Bounds check
        if (i >= currentMemory.positions_x.length) {
          console.warn(`Particle ${i} exceeds shared memory bounds`)
          break
        }
        
        // Position (convert from screen space to world space)
        positions[i * 3] = currentMemory.positions_x[i] - size.width / 2
        positions[i * 3 + 1] = -currentMemory.positions_y[i] + size.height / 2
        positions[i * 3 + 2] = 0
        
        // Color
        colors[i * 3] = currentMemory.colors_r[i]
        colors[i * 3 + 1] = currentMemory.colors_g[i]
        colors[i * 3 + 2] = currentMemory.colors_b[i]
        
        // Opacity
        opacities[i] = currentMemory.opacity[i]
      }

      // Mark attributes as needing update
      positionAttribute.needsUpdate = true
      colorAttribute.needsUpdate = true
      opacityAttribute.needsUpdate = true

      // Update draw range to only render active particles
      geometry.setDrawRange(0, currentParticleCount)

    } catch (error) {
      const errorMsg = `Update error: ${error}`
      console.error(errorMsg)
      setLastError(errorMsg)
    }
  }, [wasmModule, sharedMemory, isInitialized, size, debugMode, debugLog])

  // Update particles - only if not in debug mode
  useFrame((_, delta) => {
    if (!debugMode) {
      updateParticles(delta)
    }
  })

  // Update debug info when relevant state changes
  useEffect(() => {
    updateDebugInfo()
  }, [updateDebugInfo])

  // Public methods for debug control
  useEffect(() => {
    if (debugMode && meshRef.current) {
      // Expose debug methods
      (window as any).scatterTextDebug = {
        updateFrame: () => updateParticles(),
        startForming: () => wasmModule?.start_forming(),
        startScattering: () => wasmModule?.start_scattering(),
        getParticleCount: () => wasmModule?.get_particle_count() || 0,
        getMemoryInfo: () => ({
          wasmMemorySize: wasmModule?.memory?.buffer?.byteLength || 0,
          sharedMemoryValid: sharedMemory?.positions_x?.buffer?.byteLength === wasmModule?.memory?.buffer?.byteLength
        })
      }

      return () => {
        delete (window as any).scatterTextDebug
      }
    }
  }, [debugMode, wasmModule, sharedMemory, updateParticles])

  if (!geometryRef.current || !materialRef.current) return null

  return (
    <points 
      ref={meshRef} 
      geometry={geometryRef.current} 
      material={materialRef.current} 
    />
  )
}