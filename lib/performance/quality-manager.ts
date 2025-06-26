/**
 * Quality Manager for adaptive performance optimization
 * Manages quality tiers and performance monitoring across canvas components
 */

export type QualityTier = 'performance' | 'balanced' | 'ultra'

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  frameCount: number
  lastTime: number
  samples: number[]
}

export interface QualitySettings {
  // Star field settings
  starCount: number
  starSparkleFrequency: number
  starGlowLayers: number
  starLODEnabled: boolean
  
  // Meteor shower settings
  meteorCount: number
  meteorTrailQuality: 'simple' | 'smooth' | 'tapered'
  meteorParticleLimit: number
  meteorGradientCaching: boolean
  
  // Nebula settings
  nebulaCloudCount: number
  nebulaComplexity: 'simple' | 'medium' | 'complex'
  nebulaUpdateFrequency: number
  nebulaGradientCaching: boolean
  nebulaOverlapChecks: boolean
}

export class QualityManager {
  private static instance: QualityManager
  private currentTier: QualityTier
  private metrics: PerformanceMetrics
  private settings: QualitySettings
  private userPreference: QualityTier | null = null

  private constructor() {
    this.currentTier = this.detectOptimalTier()
    this.metrics = {
      fps: 60,
      frameTime: 0,
      frameCount: 0,
      lastTime: performance.now(),
      samples: []
    }
    this.settings = this.getSettingsForTier(this.currentTier)
  }

  static getInstance(): QualityManager {
    if (!QualityManager.instance) {
      QualityManager.instance = new QualityManager()
    }
    return QualityManager.instance
  }

  private detectOptimalTier(): QualityTier {
    // Skip detection if user has set preference
    if (this.userPreference) return this.userPreference

    // Check for mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    // Check hardware capabilities
    const cores = navigator.hardwareConcurrency || 4
    const memory = (navigator as any).deviceMemory || 4
    
    // Check connection for battery-powered devices
    const connection = (navigator as any).connection
    const isSlowConnection = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g'
    
    // Simple GPU detection (can be enhanced)
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info')
    const renderer = debugInfo ? gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null
    const hasDiscreteGPU = renderer ? !renderer.toLowerCase().includes('intel') : false
    
    // Calculate tier
    if (isMobile || cores <= 2 || memory <= 2 || isSlowConnection) {
      return 'performance'
    } else if (cores >= 8 && memory >= 8 && hasDiscreteGPU) {
      return 'ultra'
    }
    return 'balanced'
  }

  private getSettingsForTier(tier: QualityTier): QualitySettings {
    switch (tier) {
      case 'performance':
        return {
          starCount: 200,
          starSparkleFrequency: 0.1,
          starGlowLayers: 1,
          starLODEnabled: true,
          meteorCount: 8,
          meteorTrailQuality: 'simple',
          meteorParticleLimit: 4,
          meteorGradientCaching: true,
          nebulaCloudCount: 4,
          nebulaComplexity: 'simple',
          nebulaUpdateFrequency: 30,
          nebulaGradientCaching: true,
          nebulaOverlapChecks: false
        }
      
      case 'balanced':
        return {
          starCount: 400,
          starSparkleFrequency: 0.3,
          starGlowLayers: 2,
          starLODEnabled: true,
          meteorCount: 15,
          meteorTrailQuality: 'smooth',
          meteorParticleLimit: 6,
          meteorGradientCaching: true,
          nebulaCloudCount: 5,
          nebulaComplexity: 'medium',
          nebulaUpdateFrequency: 60,
          nebulaGradientCaching: true,
          nebulaOverlapChecks: true
        }
      
      case 'ultra':
        return {
          starCount: 600,
          starSparkleFrequency: 0.5,
          starGlowLayers: 3,
          starLODEnabled: false,
          meteorCount: 25,
          meteorTrailQuality: 'tapered',
          meteorParticleLimit: 8,
          meteorGradientCaching: true,
          nebulaCloudCount: 6,
          nebulaComplexity: 'complex',
          nebulaUpdateFrequency: 60,
          nebulaGradientCaching: false,
          nebulaOverlapChecks: true
        }
    }
  }

  updateMetrics(deltaTime: number) {
    this.metrics.frameCount++
    this.metrics.frameTime = deltaTime
    
    // Calculate FPS every 30 frames
    if (this.metrics.frameCount % 30 === 0) {
      const currentTime = performance.now()
      const elapsed = currentTime - this.metrics.lastTime
      this.metrics.fps = 30000 / elapsed
      this.metrics.lastTime = currentTime
      
      // Store sample for stability analysis
      this.metrics.samples.push(this.metrics.fps)
      if (this.metrics.samples.length > 60) {
        this.metrics.samples.shift()
      }
      
      // Check if we need to adjust quality
      this.checkPerformanceAndAdjust()
    }
  }

  private checkPerformanceAndAdjust() {
    // Don't adjust if user has set preference
    if (this.userPreference) return
    
    // Need at least 10 samples for reliable measurement
    if (this.metrics.samples.length < 10) return
    
    const avgFPS = this.metrics.samples.reduce((a, b) => a + b) / this.metrics.samples.length
    
    // Decrease quality if struggling
    if (avgFPS < 30 && this.currentTier !== 'performance') {
      this.decreaseTier()
    }
    // Increase quality if performing well
    else if (avgFPS > 58 && this.metrics.frameTime < 14 && this.currentTier !== 'ultra') {
      // Check FPS stability before increasing
      const variance = this.calculateFPSVariance()
      if (variance < 0.1) { // Less than 10% variance
        this.increaseTier()
      }
    }
  }

  private calculateFPSVariance(): number {
    if (this.metrics.samples.length === 0) return 1
    const mean = this.metrics.samples.reduce((a, b) => a + b) / this.metrics.samples.length
    const variance = this.metrics.samples.reduce((sq, n) => 
      sq + Math.pow(n - mean, 2), 0
    ) / this.metrics.samples.length
    return Math.sqrt(variance) / mean
  }

  private decreaseTier() {
    if (this.currentTier === 'ultra') {
      this.setTier('balanced')
    } else if (this.currentTier === 'balanced') {
      this.setTier('performance')
    }
  }

  private increaseTier() {
    if (this.currentTier === 'performance') {
      this.setTier('balanced')
    } else if (this.currentTier === 'balanced') {
      this.setTier('ultra')
    }
  }

  setTier(tier: QualityTier) {
    if (this.currentTier === tier) return
    
    this.currentTier = tier
    this.settings = this.getSettingsForTier(tier)
    
    // Dispatch event for components to react
    window.dispatchEvent(new CustomEvent('qualityTierChanged', {
      detail: { tier, settings: this.settings }
    }))
  }

  setUserPreference(tier: QualityTier | null) {
    this.userPreference = tier
    if (tier) {
      this.setTier(tier)
    } else {
      // Auto-detect again
      this.setTier(this.detectOptimalTier())
    }
  }

  getTier(): QualityTier {
    return this.currentTier
  }

  getSettings(): QualitySettings {
    return { ...this.settings }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  // Calculate adaptive count based on screen size and tier
  getAdaptiveCount(baseCount: number, screenWidth: number, screenHeight: number): number {
    const screenArea = screenWidth * screenHeight
    const sizeMultiplier = Math.sqrt(screenArea / 1920000) // Normalized to 1080p
    
    const tierMultiplier = {
      performance: 0.5,
      balanced: 1.0,
      ultra: 1.5
    }[this.currentTier]
    
    return Math.floor(baseCount * sizeMultiplier * tierMultiplier)
  }
}