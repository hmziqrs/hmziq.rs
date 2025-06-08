'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

// Simplex noise implementation for organic shapes
class SimplexNoise {
  private perm: number[] = []
  private perm12: number[] = []
  
  constructor(seed = Math.random()) {
    const p = []
    for (let i = 0; i < 256; i++) {
      p[i] = i
    }
    
    // Shuffle with seed
    let n = seed * 256
    for (let i = 255; i > 0; i--) {
      n = (n + 31) % 256
      const j = Math.floor((n / 256) * (i + 1))
      ;[p[i], p[j]] = [p[j], p[i]]
    }
    
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255]
      this.perm12[i] = this.perm[i] % 12
    }
  }
  
  noise2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1)
    const G2 = (3 - Math.sqrt(3)) / 6
    
    const s = (x + y) * F2
    const i = Math.floor(x + s)
    const j = Math.floor(y + s)
    
    const t = (i + j) * G2
    const X0 = i - t
    const Y0 = j - t
    const x0 = x - X0
    const y0 = y - Y0
    
    const i1 = x0 > y0 ? 1 : 0
    const j1 = x0 > y0 ? 0 : 1
    
    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2
    
    const ii = i & 255
    const jj = j & 255
    
    const grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ]
    
    const dot = (g: number[], x: number, y: number) => g[0] * x + g[1] * y
    
    const gi0 = this.perm12[ii + this.perm[jj]]
    const gi1 = this.perm12[ii + i1 + this.perm[jj + j1]]
    const gi2 = this.perm12[ii + 1 + this.perm[jj + 1]]
    
    let n0 = 0, n1 = 0, n2 = 0
    
    const t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 >= 0) {
      const t0sq = t0 * t0
      n0 = t0sq * t0sq * dot(grad3[gi0], x0, y0)
    }
    
    const t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 >= 0) {
      const t1sq = t1 * t1
      n1 = t1sq * t1sq * dot(grad3[gi1], x1, y1)
    }
    
    const t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 >= 0) {
      const t2sq = t2 * t2
      n2 = t2sq * t2sq * dot(grad3[gi2], x2, y2)
    }
    
    return 70 * (n0 + n1 + n2)
  }
  
  // Fractal Brownian Motion for more complex patterns
  fbm(x: number, y: number, octaves: number, persistence: number, lacunarity: number): number {
    let value = 0
    let amplitude = 1
    let frequency = 1
    let maxValue = 0
    
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency)
      maxValue += amplitude
      amplitude *= persistence
      frequency *= lacunarity
    }
    
    return value / maxValue
  }
}

interface NebulaLayer {
  offsetX: number
  offsetY: number
  scale: number
  rotation: number
  opacity: number
  colorMix: number
}

export default function Nebula2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const noiseRef = useRef<SimplexNoise>(new SimplexNoise(42))
  const animationIdRef = useRef<number>()
  const timeRef = useRef(0)
  const prefersReducedMotion = useReducedMotion()
  
  // Layer states
  const layersRef = useRef<NebulaLayer[]>([
    { offsetX: 0, offsetY: 0, scale: 0.002, rotation: 0, opacity: 0.15, colorMix: 0 },
    { offsetX: 100, offsetY: 100, scale: 0.004, rotation: 0, opacity: 0.1, colorMix: 0.3 },
    { offsetX: 200, offsetY: 200, scale: 0.008, rotation: 0, opacity: 0.05, colorMix: 0.7 }
  ])

  useEffect(() => {
    if (prefersReducedMotion) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      
      // Create offscreen canvas for nebula rendering
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas')
      }
      offscreenCanvasRef.current.width = Math.floor(canvas.width / 2) // Half resolution for performance
      offscreenCanvasRef.current.height = Math.floor(canvas.height / 2)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Render a single nebula layer
    const renderNebulaLayer = (
      ctx: CanvasRenderingContext2D, 
      layer: NebulaLayer, 
      time: number,
      width: number,
      height: number
    ) => {
      const noise = noiseRef.current
      const centerX = width / 2
      const centerY = height / 2
      
      // Create radial gradient for this layer
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, Math.min(width, height) * 0.7
      )
      
      // Dynamic colors based on layer and time
      const colorShift = Math.sin(time * 0.0005 + layer.colorMix * Math.PI) * 0.5 + 0.5
      
      if (layer.colorMix < 0.33) {
        // Pink/purple core
        gradient.addColorStop(0, `rgba(255, 100, 200, ${layer.opacity * 2})`)
        gradient.addColorStop(0.3, `rgba(200, 50, 255, ${layer.opacity * 1.5})`)
        gradient.addColorStop(0.6, `rgba(100, 100, 255, ${layer.opacity})`)
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      } else if (layer.colorMix < 0.66) {
        // Blue/cyan middle
        gradient.addColorStop(0, `rgba(100, 200, 255, ${layer.opacity * 2})`)
        gradient.addColorStop(0.3, `rgba(50, 150, 255, ${layer.opacity * 1.5})`)
        gradient.addColorStop(0.6, `rgba(100, 50, 200, ${layer.opacity})`)
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      } else {
        // White/yellow highlights
        gradient.addColorStop(0, `rgba(255, 255, 200, ${layer.opacity * 3})`)
        gradient.addColorStop(0.2, `rgba(255, 200, 150, ${layer.opacity * 2})`)
        gradient.addColorStop(0.5, `rgba(200, 150, 255, ${layer.opacity})`)
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      }
      
      // Apply rotation
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(layer.rotation)
      ctx.translate(-centerX, -centerY)
      
      // Create noise-based mask
      const imageData = ctx.createImageData(width, height)
      const data = imageData.data
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const nx = (x - centerX + layer.offsetX) * layer.scale
          const ny = (y - centerY + layer.offsetY) * layer.scale
          
          // Multi-octave noise for complexity
          const noise1 = noise.fbm(nx, ny, 4, 0.5, 2)
          const noise2 = noise.fbm(nx * 2 - 100, ny * 2 - 100, 2, 0.7, 3)
          
          // Combine noises for more interesting patterns
          let value = (noise1 + 0.5 * noise2) / 1.5
          
          // Add turbulence
          const turbulence = Math.abs(noise.noise2D(nx * 5, ny * 5)) * 0.2
          value += turbulence
          
          // Distance from center for radial falloff
          const dx = (x - centerX) / width
          const dy = (y - centerY) / height
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          // Radial falloff with noise modulation
          const falloff = 1 - Math.pow(distance * 1.4, 2)
          value *= Math.max(0, falloff + noise1 * 0.3)
          
          // Threshold and smooth
          value = Math.max(0, Math.min(1, value))
          value = Math.pow(value, 1.5) // Contrast adjustment
          
          const i = (y * width + x) * 4
          data[i] = 255     // R
          data[i + 1] = 255 // G
          data[i + 2] = 255 // B
          data[i + 3] = value * 255 * layer.opacity
        }
      }
      
      // Create temporary canvas for masking
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = width
      tempCanvas.height = height
      const tempCtx = tempCanvas.getContext('2d')!
      
      // Apply the noise mask
      tempCtx.putImageData(imageData, 0, 0)
      
      // Use the gradient with the mask
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = gradient
      ctx.fillRect(-width/2, -height/2, width * 2, height * 2)
      
      // Apply the mask
      ctx.globalCompositeOperation = 'destination-in'
      ctx.drawImage(tempCanvas, 0, 0)
      
      ctx.restore()
    }

    // Animation loop
    const animate = () => {
      const offscreenCanvas = offscreenCanvasRef.current
      if (!offscreenCanvas) return
      
      const offCtx = offscreenCanvas.getContext('2d', { alpha: true })
      if (!offCtx) return
      
      // Clear canvases
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      offCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)
      
      timeRef.current++
      
      // Update layer animations
      layersRef.current.forEach((layer, index) => {
        // Slow drift
        layer.offsetX += Math.sin(timeRef.current * 0.0001 + index) * 0.1
        layer.offsetY += Math.cos(timeRef.current * 0.0001 + index) * 0.1
        
        // Slow rotation
        layer.rotation += 0.00005 * (index + 1)
        
        // Opacity pulse
        const pulseFactor = Math.sin(timeRef.current * 0.0003 + index * Math.PI / 3) * 0.1
        const baseOpacity = index === 0 ? 0.15 : index === 1 ? 0.1 : 0.05
        layer.opacity = baseOpacity + pulseFactor * baseOpacity
      })
      
      // Render each layer to offscreen canvas
      layersRef.current.forEach(layer => {
        renderNebulaLayer(offCtx, layer, timeRef.current, offscreenCanvas.width, offscreenCanvas.height)
      })
      
      // Scale up to main canvas with smoothing
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.globalCompositeOperation = 'screen'
      ctx.drawImage(offscreenCanvas, 0, 0, canvas.width, canvas.height)
      
      // Add subtle overall glow
      const centerGlow = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.5
      )
      centerGlow.addColorStop(0, 'rgba(200, 150, 255, 0.05)')
      centerGlow.addColorStop(0.5, 'rgba(100, 150, 255, 0.02)')
      centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      
      ctx.globalCompositeOperation = 'screen'
      ctx.fillStyle = centerGlow
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      animationIdRef.current = requestAnimationFrame(animate)
    }

    // Start animation
    animate()

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [prefersReducedMotion])

  if (prefersReducedMotion) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 2 }} // Behind stars (3) but above background (1)
      aria-hidden="true"
    />
  )
}