'use client'

import { useState, useEffect } from 'react'
import { QualityManager } from '@/lib/performance/quality-manager'

export default function VisualQualityTest() {
  const [isVisible, setIsVisible] = useState(false)
  const [metrics, setMetrics] = useState({
    fps: 0,
    frameTime: 0,
    tier: 'balanced' as 'performance' | 'balanced' | 'ultra',
    starCount: 0,
    meteorCount: 0,
    nebulaCount: 0,
    gradientCacheHits: 0,
    gradientCacheMisses: 0,
    gradientCacheSize: 0
  })

  useEffect(() => {
    // Toggle visibility with Ctrl+Shift+Q
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
        setIsVisible(prev => !prev)
      }
    }
    
    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [])

  useEffect(() => {
    if (!isVisible) return

    const qualityManager = QualityManager.getInstance()
    const updateInterval = setInterval(() => {
      const settings = qualityManager.getSettings()
      const perfMetrics = qualityManager.getMetrics()
      
      // Get gradient cache stats
      const cacheStats = {
        meteor: (window as any).gradientCaches?.meteors?.getStats?.() || { hits: 0, misses: 0, size: 0 },
        nebula: (window as any).gradientCaches?.nebula?.getStats?.() || { hits: 0, misses: 0, size: 0 }
      }
      
      setMetrics({
        fps: Math.round(perfMetrics.fps),
        frameTime: Math.round(perfMetrics.frameTime * 100) / 100,
        tier: qualityManager.getTier(),
        starCount: settings.starCount,
        meteorCount: settings.meteorCount,
        nebulaCount: settings.nebulaCloudCount,
        gradientCacheHits: cacheStats.meteor.hits + cacheStats.nebula.hits,
        gradientCacheMisses: cacheStats.meteor.misses + cacheStats.nebula.misses,
        gradientCacheSize: cacheStats.meteor.size + cacheStats.nebula.size
      })
    }, 100)

    return () => clearInterval(updateInterval)
  }, [isVisible])

  if (!isVisible) return null

  const cacheHitRate = metrics.gradientCacheHits + metrics.gradientCacheMisses > 0
    ? Math.round((metrics.gradientCacheHits / (metrics.gradientCacheHits + metrics.gradientCacheMisses)) * 100)
    : 0

  return (
    <div 
      className="fixed top-4 left-4 bg-black/90 text-white p-6 rounded-lg font-mono text-sm border border-white/20 backdrop-blur-sm"
      style={{ zIndex: 10000 }}
    >
      <h3 className="text-lg font-bold mb-4 text-blue-400">Visual Quality Test</h3>
      
      <div className="space-y-3">
        <div className="border-b border-white/20 pb-3">
          <h4 className="text-sm font-semibold text-green-400 mb-2">Performance</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>FPS: <span className={metrics.fps < 30 ? 'text-red-400' : metrics.fps < 50 ? 'text-yellow-400' : 'text-green-400'}>{metrics.fps}</span></div>
            <div>Frame Time: <span className={metrics.frameTime > 16.67 ? 'text-yellow-400' : 'text-green-400'}>{metrics.frameTime}ms</span></div>
            <div>Quality: <span className="text-cyan-400">{metrics.tier}</span></div>
          </div>
        </div>

        <div className="border-b border-white/20 pb-3">
          <h4 className="text-sm font-semibold text-green-400 mb-2">Element Counts</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>Stars: <span className="text-cyan-400">{metrics.starCount}</span></div>
            <div>Meteors: <span className="text-cyan-400">{metrics.meteorCount}</span></div>
            <div>Nebula Clouds: <span className="text-cyan-400">{metrics.nebulaCount}</span></div>
          </div>
        </div>

        <div className="border-b border-white/20 pb-3">
          <h4 className="text-sm font-semibold text-green-400 mb-2">Gradient Cache</h4>
          <div className="space-y-1 text-xs">
            <div>Hit Rate: <span className={cacheHitRate > 90 ? 'text-green-400' : cacheHitRate > 70 ? 'text-yellow-400' : 'text-red-400'}>{cacheHitRate}%</span></div>
            <div>Total Hits: <span className="text-cyan-400">{metrics.gradientCacheHits}</span></div>
            <div>Cache Size: <span className="text-cyan-400">{metrics.gradientCacheSize}</span></div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-green-400 mb-2">Quality Tests</h4>
          <button
            onClick={() => {
              const qm = QualityManager.getInstance()
              const tiers: Array<'performance' | 'balanced' | 'ultra'> = ['performance', 'balanced', 'ultra']
              const currentIndex = tiers.indexOf(qm.getTier())
              const nextTier = tiers[(currentIndex + 1) % 3]
              qm.setTier(nextTier)
            }}
            className="w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
          >
            Cycle Quality Tier
          </button>
          
          <button
            onClick={() => {
              // Simulate rapid mouse movement
              const event = new MouseEvent('mousemove')
              for (let i = 0; i < 100; i++) {
                setTimeout(() => window.dispatchEvent(event), i * 10)
              }
            }}
            className="w-full px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors"
          >
            Test Mouse Movement Boost
          </button>
          
          <button
            onClick={() => {
              // Simulate click boost
              window.dispatchEvent(new MouseEvent('click'))
            }}
            className="w-full px-3 py-1 bg-pink-600 hover:bg-pink-700 rounded text-xs transition-colors"
          >
            Test Click Boost
          </button>
        </div>

        <div className="text-xs text-gray-400 pt-2 border-t border-white/20">
          Press Ctrl+Shift+Q to toggle this panel
        </div>
      </div>
    </div>
  )
}