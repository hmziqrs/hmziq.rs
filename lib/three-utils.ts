import * as THREE from 'three'

export interface StarData {
  position: [number, number, number]
  size: number
  brightness: number
  color: string
  twinkleSpeed: number
}

// Generate star field data
export const generateStars = (count: number): StarData[] => {
  const stars: StarData[] = []
  
  for (let i = 0; i < count; i++) {
    // Create stars in a spherical distribution
    const radius = Math.random() * 500 + 50
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)
    
    // Vary star properties
    const size = Math.random() * 2 + 0.5
    const brightness = Math.random() * 0.8 + 0.2
    const twinkleSpeed = Math.random() * 0.02 + 0.01
    
    // Color variation (mostly white with slight blue/purple tints)
    const colorVariation = Math.random()
    let color = '#ffffff'
    
    if (colorVariation < 0.1) {
      color = '#e0e7ff' // Slight blue tint
    } else if (colorVariation < 0.15) {
      color = '#ede9fe' // Slight purple tint
    }
    
    stars.push({
      position: [x, y, z],
      size,
      brightness,
      color,
      twinkleSpeed,
    })
  }
  
  return stars
}

// Performance optimization for star field
export const createStarGeometry = (stars: StarData[]) => {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(stars.length * 3)
  const sizes = new Float32Array(stars.length)
  const colors = new Float32Array(stars.length * 3)
  
  stars.forEach((star, i) => {
    const i3 = i * 3
    
    // Position
    positions[i3] = star.position[0]
    positions[i3 + 1] = star.position[1]
    positions[i3 + 2] = star.position[2]
    
    // Size
    sizes[i] = star.size
    
    // Color (convert hex to RGB)
    const color = new THREE.Color(star.color)
    colors[i3] = color.r
    colors[i3 + 1] = color.g
    colors[i3 + 2] = color.b
  })
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  
  return geometry
}

// Star shader material for better performance
export const createStarMaterial = () => {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      pointTexture: { value: new THREE.TextureLoader().load('/star.png') }
    },
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec3 vColor;
      
      void main() {
        float distance = length(gl_PointCoord - vec2(0.5));
        float alpha = 1.0 - smoothstep(0.0, 0.5, distance);
        
        // Add subtle twinkling effect
        float twinkle = sin(time * 2.0 + gl_FragCoord.x * 0.01) * 0.3 + 0.7;
        
        gl_FragColor = vec4(vColor * twinkle, alpha);
      }
    `,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
}

// Camera animation utilities
export const createCameraPath = (radius: number, segments: number) => {
  const path = []
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    path.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.3,
      z: Math.sin(angle) * radius,
    })
  }
  return path
}

// Parallax scroll utilities
export const updateStarPositions = (
  geometry: THREE.BufferGeometry,
  scrollProgress: number,
  originalPositions: Float32Array
) => {
  const positions = geometry.attributes.position.array as Float32Array
  
  for (let i = 0; i < positions.length; i += 3) {
    // Apply parallax effect based on distance
    const z = originalPositions[i + 2]
    const parallaxFactor = Math.abs(z) / 500
    
    positions[i] = originalPositions[i] + scrollProgress * parallaxFactor * 20
    positions[i + 1] = originalPositions[i + 1] - scrollProgress * parallaxFactor * 10
    positions[i + 2] = originalPositions[i + 2]
  }
  
  geometry.attributes.position.needsUpdate = true
}

// Performance monitoring
export const getFrameRate = (() => {
  let lastTime = 0
  let frameCount = 0
  let fps = 60
  
  return (currentTime: number) => {
    frameCount++
    
    if (currentTime - lastTime >= 1000) {
      fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
      frameCount = 0
      lastTime = currentTime
    }
    
    return fps
  }
})()

// Adaptive quality based on performance
export const getAdaptiveStarCount = (fps: number, baseCount: number) => {
  if (fps < 30) return Math.floor(baseCount * 0.5)
  if (fps < 45) return Math.floor(baseCount * 0.75)
  return baseCount
}