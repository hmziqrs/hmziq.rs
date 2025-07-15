import { getOptimizedFunctions } from './index'

// Skill system memory pointers interface
export interface SkillSystemPointers {
  positions_x_ptr: number
  positions_y_ptr: number
  positions_z_ptr: number
  
  orbit_radius_ptr: number
  orbit_speed_ptr: number
  orbit_phase_ptr: number
  category_center_x_ptr: number
  category_center_y_ptr: number
  category_center_z_ptr: number
  
  glow_intensity_ptr: number
  scale_ptr: number
  base_scale_ptr: number
  proficiency_ptr: number
  
  particle_positions_x_ptr: number
  particle_positions_y_ptr: number
  particle_positions_z_ptr: number
  particle_velocities_x_ptr: number
  particle_velocities_y_ptr: number
  particle_velocities_z_ptr: number
  particle_life_ptr: number
  
  connection_indices_ptr: number
  connection_strength_ptr: number
  
  count: number
  particle_count: number
  connection_count: number
  
  // Array lengths for bounds checking
  positions_x_length: number
  positions_y_length: number
  positions_z_length: number
  glow_intensity_length: number
  scale_length: number
  particle_positions_x_length: number
  particle_positions_y_length: number
  particle_positions_z_length: number
}

// Update result interface
export interface SkillSystemUpdateResult {
  positions_dirty: boolean
  effects_dirty: boolean
  particles_dirty: boolean
  connections_dirty: boolean
}

// Skill system shared memory wrapper
export class SkillSystemSharedMemory {
  private wasmModule: any
  private pointers: SkillSystemPointers
  private memory: WebAssembly.Memory
  
  // Memory views for direct access
  private positionsXView: Float32Array | null = null
  private positionsYView: Float32Array | null = null
  private positionsZView: Float32Array | null = null
  private glowIntensityView: Float32Array | null = null
  private scaleView: Float32Array | null = null
  private proficiencyView: Float32Array | null = null
  
  // Particle system views
  private particlePositionsXView: Float32Array | null = null
  private particlePositionsYView: Float32Array | null = null
  private particlePositionsZView: Float32Array | null = null
  private particleVelocitiesXView: Float32Array | null = null
  private particleVelocitiesYView: Float32Array | null = null
  private particleVelocitiesZView: Float32Array | null = null
  private particleLifeView: Float32Array | null = null
  
  // Connection system views
  private connectionIndicesView: Uint32Array | null = null
  private connectionStrengthView: Float32Array | null = null
  
  constructor(skillCount: number = 12, particleCount: number = 200, connectionCount: number = 10) {
    this.wasmModule = null
    this.memory = null as any
    this.pointers = null as any
    
    // Initialize will be called later
    this.initializeAsync(skillCount, particleCount, connectionCount).catch(err => {
      console.error('WASM skill system initialization failed:', err)
    })
  }
  
  private async initializeAsync(skillCount: number, particleCount: number, connectionCount: number) {
    try {
      console.log('Initializing WASM skill system...')
      const wasmFunctions = await getOptimizedFunctions()
      this.wasmModule = wasmFunctions
      this.memory = wasmFunctions.memory
      
      console.log('WASM functions loaded, initializing skill system...')
      // Initialize skill system memory pool
      this.pointers = this.wasmModule.initialize_skill_system(skillCount, particleCount, connectionCount)
      console.log('Skill system pointers:', this.pointers)
      
      // Create memory views
      this.createMemoryViews()
      console.log('WASM skill system initialized successfully')
    } catch (error) {
      console.error('Failed to initialize WASM skill system:', error)
      throw error
    }
  }
  
  private createMemoryViews() {
    if (!this.pointers || !this.memory) return
    
    const buffer = this.memory.buffer
    
    // Position views
    this.positionsXView = new Float32Array(buffer, this.pointers.positions_x_ptr, this.pointers.positions_x_length)
    this.positionsYView = new Float32Array(buffer, this.pointers.positions_y_ptr, this.pointers.positions_y_length)
    this.positionsZView = new Float32Array(buffer, this.pointers.positions_z_ptr, this.pointers.positions_z_length)
    
    // Visual property views
    this.glowIntensityView = new Float32Array(buffer, this.pointers.glow_intensity_ptr, this.pointers.glow_intensity_length)
    this.scaleView = new Float32Array(buffer, this.pointers.scale_ptr, this.pointers.scale_length)
    this.proficiencyView = new Float32Array(buffer, this.pointers.proficiency_ptr, this.pointers.count)
    
    // Particle system views
    this.particlePositionsXView = new Float32Array(buffer, this.pointers.particle_positions_x_ptr, this.pointers.particle_positions_x_length)
    this.particlePositionsYView = new Float32Array(buffer, this.pointers.particle_positions_y_ptr, this.pointers.particle_positions_y_length)
    this.particlePositionsZView = new Float32Array(buffer, this.pointers.particle_positions_z_ptr, this.pointers.particle_positions_z_length)
    this.particleVelocitiesXView = new Float32Array(buffer, this.pointers.particle_velocities_x_ptr, this.pointers.particle_count)
    this.particleVelocitiesYView = new Float32Array(buffer, this.pointers.particle_velocities_y_ptr, this.pointers.particle_count)
    this.particleVelocitiesZView = new Float32Array(buffer, this.pointers.particle_velocities_z_ptr, this.pointers.particle_count)
    this.particleLifeView = new Float32Array(buffer, this.pointers.particle_life_ptr, this.pointers.particle_count)
    
    // Connection system views
    this.connectionIndicesView = new Uint32Array(buffer, this.pointers.connection_indices_ptr, this.pointers.connection_count * 2)
    this.connectionStrengthView = new Float32Array(buffer, this.pointers.connection_strength_ptr, this.pointers.connection_count)
  }
  
  // Update skill system (called every frame)
  updateSystem(time: number, deltaTime: number, mouseX: number = 0, mouseY: number = 0): SkillSystemUpdateResult | null {
    if (!this.wasmModule || !this.pointers) return null
    
    // Handle memory growth
    if (this.memory.buffer.byteLength !== this.memory.buffer.byteLength) {
      this.createMemoryViews()
    }
    
    return this.wasmModule.update_skill_system(time, deltaTime, mouseX, mouseY)
  }
  
  // Get skill position
  getSkillPosition(skillIndex: number): [number, number, number] | null {
    if (!this.positionsXView || !this.positionsYView || !this.positionsZView || skillIndex >= this.pointers.count) return null
    
    const x = this.positionsXView[skillIndex]
    const y = this.positionsYView[skillIndex]
    const z = this.positionsZView[skillIndex]
    
    // Check for NaN values and return null if found
    if (isNaN(x) || isNaN(y) || isNaN(z)) return null
    
    return [x, y, z]
  }
  
  // Get all skill positions
  getAllSkillPositions(): Float32Array[] {
    if (!this.positionsXView || !this.positionsYView || !this.positionsZView) return []
    
    return [
      this.positionsXView.slice(0, this.pointers.count),
      this.positionsYView.slice(0, this.pointers.count),
      this.positionsZView.slice(0, this.pointers.count)
    ]
  }
  
  // Get skill glow intensity
  getSkillGlowIntensity(skillIndex: number): number {
    if (!this.glowIntensityView || skillIndex >= this.pointers.count) return 0
    
    const intensity = this.glowIntensityView[skillIndex]
    return isNaN(intensity) ? 0 : intensity
  }
  
  // Get all glow intensities
  getAllGlowIntensities(): Float32Array {
    if (!this.glowIntensityView) return new Float32Array()
    
    return this.glowIntensityView.slice(0, this.pointers.count)
  }
  
  // Get skill scale
  getSkillScale(skillIndex: number): number {
    if (!this.scaleView || skillIndex >= this.pointers.count) return 1
    
    const scale = this.scaleView[skillIndex]
    return isNaN(scale) ? 1 : scale
  }
  
  // Get all scales
  getAllScales(): Float32Array {
    if (!this.scaleView) return new Float32Array()
    
    return this.scaleView.slice(0, this.pointers.count)
  }
  
  // Get skill proficiency
  getSkillProficiency(skillIndex: number): number {
    if (!this.proficiencyView || skillIndex >= this.pointers.count) return 0
    
    return this.proficiencyView[skillIndex]
  }
  
  // Get all particle positions
  getAllParticlePositions(): Float32Array[] {
    if (!this.particlePositionsXView || !this.particlePositionsYView || !this.particlePositionsZView) return []
    
    return [
      this.particlePositionsXView.slice(0, this.pointers.particle_count),
      this.particlePositionsYView.slice(0, this.pointers.particle_count),
      this.particlePositionsZView.slice(0, this.pointers.particle_count)
    ]
  }
  
  // Get particle life values
  getParticleLifeValues(): Float32Array {
    if (!this.particleLifeView) return new Float32Array()
    
    return this.particleLifeView.slice(0, this.pointers.particle_count)
  }
  
  // Get connection data
  getConnectionData(): { indices: Uint32Array, strength: Float32Array } {
    if (!this.connectionIndicesView || !this.connectionStrengthView) {
      return { indices: new Uint32Array(), strength: new Float32Array() }
    }
    
    return {
      indices: this.connectionIndicesView.slice(0, this.pointers.connection_count * 2),
      strength: this.connectionStrengthView.slice(0, this.pointers.connection_count)
    }
  }
  
  // Set skill hover state
  setSkillHover(skillIndex: number, isHovered: boolean): void {
    if (!this.wasmModule) return
    
    this.wasmModule.set_skill_hover_state(skillIndex, isHovered)
  }
  
  // Get skill hover state
  getSkillHover(skillIndex: number): boolean {
    if (!this.wasmModule) return false
    
    return this.wasmModule.get_skill_hover_state(skillIndex)
  }
  
  // Get system info
  getSystemInfo(): {
    skillCount: number
    particleCount: number
    connectionCount: number
  } {
    if (!this.pointers) return { skillCount: 0, particleCount: 0, connectionCount: 0 }
    
    return {
      skillCount: this.pointers.count,
      particleCount: this.pointers.particle_count,
      connectionCount: this.pointers.connection_count
    }
  }
  
  // Check if system is initialized
  isInitialized(): boolean {
    return this.wasmModule !== null && this.pointers !== null
  }
}

// Skill data interface
export interface SkillData {
  name: string
  category: 'frontend' | 'backend' | 'crossPlatform'
  proficiency: number
  connections: string[]
  color: {
    r: number
    g: number
    b: number
  }
}

// Predefined skill data
export const skillsData: SkillData[] = [
  // Frontend skills
  {
    name: 'TypeScript',
    category: 'frontend',
    proficiency: 0.9,
    connections: ['React.js', 'Next.js', 'React Native'],
    color: { r: 0.23, g: 0.51, b: 0.96 }
  },
  {
    name: 'React.js',
    category: 'frontend',
    proficiency: 0.8,
    connections: ['TypeScript', 'Next.js', 'React Native'],
    color: { r: 0.23, g: 0.51, b: 0.96 }
  },
  {
    name: 'Next.js',
    category: 'frontend',
    proficiency: 0.9,
    connections: ['TypeScript', 'React.js'],
    color: { r: 0.23, g: 0.51, b: 0.96 }
  },
  {
    name: 'React Native',
    category: 'frontend',
    proficiency: 0.7,
    connections: ['TypeScript', 'React.js'],
    color: { r: 0.23, g: 0.51, b: 0.96 }
  },
  
  // Backend skills
  {
    name: 'AdonisJS',
    category: 'backend',
    proficiency: 0.8,
    connections: ['Express.js', 'Node.js'],
    color: { r: 0.55, g: 0.36, b: 0.96 }
  },
  {
    name: 'Express.js',
    category: 'backend',
    proficiency: 0.9,
    connections: ['AdonisJS', 'Node.js'],
    color: { r: 0.55, g: 0.36, b: 0.96 }
  },
  {
    name: 'Rust (Axum)',
    category: 'backend',
    proficiency: 0.85,
    connections: ['Dioxus', 'Tauri'],
    color: { r: 0.55, g: 0.36, b: 0.96 }
  },
  {
    name: 'Node.js',
    category: 'backend',
    proficiency: 0.8,
    connections: ['AdonisJS', 'Express.js'],
    color: { r: 0.55, g: 0.36, b: 0.96 }
  },
  
  // Cross-Platform skills
  {
    name: 'Flutter',
    category: 'crossPlatform',
    proficiency: 0.9,
    connections: ['Dioxus'],
    color: { r: 0.024, g: 0.71, b: 0.83 }
  },
  {
    name: 'Dioxus',
    category: 'crossPlatform',
    proficiency: 0.7,
    connections: ['Flutter', 'Rust (Axum)', 'Tauri'],
    color: { r: 0.024, g: 0.71, b: 0.83 }
  },
  {
    name: 'Electron',
    category: 'crossPlatform',
    proficiency: 0.8,
    connections: ['Tauri'],
    color: { r: 0.024, g: 0.71, b: 0.83 }
  },
  {
    name: 'Tauri',
    category: 'crossPlatform',
    proficiency: 0.85,
    connections: ['Electron', 'Rust (Axum)', 'Dioxus'],
    color: { r: 0.024, g: 0.71, b: 0.83 }
  }
]

// Export singleton instance
export const skillSystemMemory = new SkillSystemSharedMemory()