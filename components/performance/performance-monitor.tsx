'use client'

import { useEffect, useState } from 'react'
import { QualityManager, type QualityTier, type PerformanceMetrics } from '@/lib/performance/quality-manager'

interface PerformanceMonitorProps {
  enabled?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export default function PerformanceMonitor({ 
  enabled = false, 
  position = 'top-right' 
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [tier, setTier] = useState<QualityTier>('balanced')
  const [isVisible, setIsVisible] = useState(enabled)
  
  useEffect(() => {
    const qualityManager = QualityManager.getInstance()
    
    // Update metrics every frame
    let animationId: number
    const updateMetrics = () => {
      setMetrics(qualityManager.getMetrics())
      setTier(qualityManager.getTier())
      animationId = requestAnimationFrame(updateMetrics)
    }
    
    if (isVisible) {
      updateMetrics()
    }
    
    // Listen for tier changes
    const handleTierChange = (e: Event) => {
      const event = e as CustomEvent
      setTier(event.detail.tier)
    }
    window.addEventListener('qualityTierChanged', handleTierChange)
    
    // Keyboard shortcut (Ctrl+P)
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault()
        setIsVisible(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      window.removeEventListener('qualityTierChanged', handleTierChange)
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [isVisible])
  
  if (!isVisible || !metrics) return null
  
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }
  
  const tierColors = {
    performance: 'text-yellow-400',
    balanced: 'text-blue-400',
    ultra: 'text-purple-400'
  }
  
  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400'
    if (fps >= 30) return 'text-yellow-400'
    return 'text-red-400'
  }
  
  return (
    <div 
      className={`fixed ${positionClasses[position]} bg-black/80 backdrop-blur-sm 
                  border border-white/20 rounded-lg p-3 font-mono text-xs text-white
                  shadow-lg min-w-[200px]`}
      style={{ zIndex: 9999 }}
    >
      <div className="space-y-1">
        <div className="flex justify-between items-center border-b border-white/20 pb-1 mb-1">
          <span className="font-semibold">Performance Monitor</span>
          <button 
            onClick={() => setIsVisible(false)}
            className="text-white/50 hover:text-white ml-2"
          >
            ×
          </button>
        </div>
        
        <div className="flex justify-between">
          <span>FPS:</span>
          <span className={getFPSColor(metrics.fps)}>
            {metrics.fps.toFixed(1)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Frame Time:</span>
          <span className={metrics.frameTime > 16.67 ? 'text-yellow-400' : 'text-green-400'}>
            {metrics.frameTime.toFixed(2)}ms
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Quality Tier:</span>
          <span className={tierColors[tier]}>
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Samples:</span>
          <span className="text-white/70">{metrics.samples.length}</span>
        </div>
        
        {metrics.samples.length > 0 && (
          <div className="flex justify-between">
            <span>Avg FPS:</span>
            <span className="text-white/70">
              {(metrics.samples.reduce((a, b) => a + b) / metrics.samples.length).toFixed(1)}
            </span>
          </div>
        )}
        
        <div className="mt-2 pt-2 border-t border-white/20 text-white/50">
          <div>Press Ctrl+P to toggle</div>
          <div className="mt-1">
            <button
              onClick={() => {
                const qm = QualityManager.getInstance()
                const tiers: QualityTier[] = ['performance', 'balanced', 'ultra']
                const currentIndex = tiers.indexOf(tier)
                const nextIndex = (currentIndex + 1) % tiers.length
                qm.setUserPreference(tiers[nextIndex])
              }}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Change Tier
            </button>
            {' | '}
            <button
              onClick={() => QualityManager.getInstance().setUserPreference(null)}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Auto
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}