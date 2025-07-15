'use client'

import { useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Canvas } from '@react-three/fiber'

const ScatterTextDebug = dynamic(
  () => import('@/components/three/ScatterTextDebug'),
  { ssr: false }
)

export default function TestScatterPage() {
  const [debugMode, setDebugMode] = useState(true)
  const [autoAnimate, setAutoAnimate] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [text, setText] = useState('hmziqrs')
  const [fontSize, setFontSize] = useState(100)
  const [skip, setSkip] = useState(4)

  const updateFrame = () => {
    if ((window as any).scatterTextDebug) {
      (window as any).scatterTextDebug.updateFrame()
    }
  }

  const startForming = () => {
    if ((window as any).scatterTextDebug) {
      (window as any).scatterTextDebug.startForming()
    }
  }

  const startScattering = () => {
    if ((window as any).scatterTextDebug) {
      (window as any).scatterTextDebug.startScattering()
    }
  }

  return (
    <div className="h-screen bg-black text-white">
      {/* Debug Controls */}
      <div className="absolute top-0 left-0 z-10 p-4 bg-gray-900/80 backdrop-blur max-w-md">
        <h2 className="text-xl font-bold mb-4">Scatter Text Debug</h2>
        
        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
            />
            Debug Mode (Manual Updates)
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoAnimate}
              onChange={(e) => setAutoAnimate(e.target.checked)}
              disabled={debugMode}
            />
            Auto Animate
          </label>
        </div>

        <div className="space-y-2 mb-4">
          <div>
            <label className="block text-sm">Text:</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-2 py-1 bg-gray-800 rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm">Font Size:</label>
            <input
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full px-2 py-1 bg-gray-800 rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm">Skip (Particle Density):</label>
            <input
              type="number"
              value={skip}
              onChange={(e) => setSkip(Number(e.target.value))}
              min="1"
              max="10"
              className="w-full px-2 py-1 bg-gray-800 rounded"
            />
          </div>
        </div>

        <div className="space-x-2 mb-4">
          <button
            onClick={updateFrame}
            disabled={!debugMode}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
          >
            Update Frame
          </button>
          <button
            onClick={startForming}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded"
          >
            Form
          </button>
          <button
            onClick={startScattering}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded"
          >
            Scatter
          </button>
        </div>

        {debugInfo && (
          <div className="text-xs space-y-1 font-mono">
            <div>WASM Initialized: {debugInfo.wasmInitialized ? 'Yes' : 'No'}</div>
            <div>Particle Count: {debugInfo.particleCount}</div>
            <div>Memory Size: {(debugInfo.memorySize / 1024 / 1024).toFixed(2)} MB</div>
            <div>Position Ptr: 0x{debugInfo.positionPtr.toString(16)}</div>
            <div>Frame Count: {debugInfo.frameCount}</div>
            <div>Buffer Sizes:</div>
            <div className="pl-2">
              <div>- Positions: {debugInfo.bufferSizes.positions}</div>
              <div>- Colors: {debugInfo.bufferSizes.colors}</div>
              <div>- Opacity: {debugInfo.bufferSizes.opacity}</div>
            </div>
            {debugInfo.lastError && (
              <div className="text-red-400 mt-2">Error: {debugInfo.lastError}</div>
            )}
          </div>
        )}
      </div>

      {/* Three.js Canvas */}
      <Canvas
        camera={{ position: [0, 0, 500], fov: 50 }}
        gl={{ antialias: false }}
      >
        <Suspense fallback={null}>
          <ScatterTextDebug
            text={text}
            fontSize={fontSize}
            skip={skip}
            autoAnimate={autoAnimate}
            debugMode={debugMode}
            onDebugInfo={setDebugInfo}
          />
        </Suspense>
      </Canvas>

      {/* Console Instructions */}
      <div className="absolute bottom-0 left-0 p-4 text-xs text-gray-400">
        <div>Console Commands (when debug mode is on):</div>
        <div className="font-mono">
          <div>scatterTextDebug.updateFrame()</div>
          <div>scatterTextDebug.startForming()</div>
          <div>scatterTextDebug.startScattering()</div>
          <div>scatterTextDebug.getParticleCount()</div>
          <div>scatterTextDebug.getMemoryInfo()</div>
        </div>
      </div>
    </div>
  )
}