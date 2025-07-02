'use client'

import { useState, useEffect } from 'react'
import { loadWASM } from '@/lib/wasm'

interface BenchmarkResults {
  systemCreation?: string
  initMeteors?: string
  updateMeteors?: string
  particleSpawning?: string
  updateParticles?: string
  getRenderData?: string
  batchInterpolation?: string
  finalStats?: {
    activeMeteors: number
    activeParticles: number
  }
  error?: string
}

export default function MeteorWASMBenchmark() {
  const [results, setResults] = useState<BenchmarkResults>({})
  const [isRunning, setIsRunning] = useState(false)
  const [meteorsCount, setMeteorsCount] = useState(10)
  const [wasmLoaded, setWasmLoaded] = useState(false)

  useEffect(() => {
    loadWASM().then(wasm => {
      setWasmLoaded(!!wasm)
    })
  }, [])

  const runBenchmarks = async () => {
    setIsRunning(true)
    const benchmarkResults: BenchmarkResults = {}

    try {
      const wasm = await loadWASM()
      if (!wasm) {
        benchmarkResults.error = 'WASM failed to load'
        setResults(benchmarkResults)
        setIsRunning(false)
        return
      }

      // Benchmark 1: MeteorSystem creation
      const systemStart = performance.now()
      const meteorSystem = new wasm.MeteorSystem(1920, 1080)
      const systemEnd = performance.now()
      benchmarkResults.systemCreation = `${(systemEnd - systemStart).toFixed(3)}ms`

      // Benchmark 2: Initialize meteors
      const initStart = performance.now()
      for (let i = 0; i < meteorsCount; i++) {
        const startX = Math.random() * 1920
        const startY = Math.random() * 200
        const endX = Math.random() * 1920
        const endY = 900 + Math.random() * 180
        const controlX = (startX + endX) / 2 + (Math.random() - 0.5) * 200
        const controlY = (startY + endY) / 2 + (Math.random() - 0.5) * 200
        
        meteorSystem.init_meteor(
          i,
          startX, startY,
          controlX, controlY,
          endX, endY,
          0.5 + Math.random() * 0.5, // size
          1.0, // speed
          100, // max_life
          Math.floor(Math.random() * 3), // meteor_type
          255, 255, 255, // color
          100, 150, 255, // glow color
          0.8 // glow intensity
        )
      }
      const initEnd = performance.now()
      benchmarkResults.initMeteors = `${(initEnd - initStart).toFixed(3)}ms for ${meteorsCount} meteors`

      // Benchmark 3: Update meteors (100 frames)
      const updateStart = performance.now()
      let totalActiveCount = 0
      for (let frame = 0; frame < 100; frame++) {
        const activeCount = meteorSystem.update_meteors(1.0, 1)
        totalActiveCount += activeCount
      }
      const updateEnd = performance.now()
      benchmarkResults.updateMeteors = `${(updateEnd - updateStart).toFixed(3)}ms for 100 frames (avg active: ${(totalActiveCount / 100).toFixed(1)})`

      // Benchmark 4: Particle spawning
      const particleStart = performance.now()
      let particlesSpawned = 0
      for (let frame = 0; frame < 50; frame++) {
        for (let i = 0; i < meteorsCount; i++) {
          if (meteorSystem.spawn_particle(i, 0.3, 10)) {
            particlesSpawned++
          }
        }
      }
      const particleEnd = performance.now()
      benchmarkResults.particleSpawning = `${(particleEnd - particleStart).toFixed(3)}ms (spawned ${particlesSpawned} particles)`

      // Benchmark 5: Update particles
      const particleUpdateStart = performance.now()
      for (let frame = 0; frame < 100; frame++) {
        meteorSystem.update_particles(1.0)
      }
      const particleUpdateEnd = performance.now()
      benchmarkResults.updateParticles = `${(particleUpdateEnd - particleUpdateStart).toFixed(3)}ms for 100 frames`

      // Benchmark 6: Get render data
      const renderStart = performance.now()
      for (let i = 0; i < 10; i++) {
        const _positions = meteorSystem.get_meteor_positions()
        const _properties = meteorSystem.get_meteor_properties()
        const _particleData = meteorSystem.get_particle_data()
        const _particleColors = meteorSystem.get_particle_colors()
      }
      const renderEnd = performance.now()
      benchmarkResults.getRenderData = `${(renderEnd - renderStart).toFixed(3)}ms for 10 iterations`

      // Benchmark 7: Batch position interpolation
      const batchSize = 100
      const lifeValues = new Float32Array(batchSize).fill(50)
      const maxLifeValues = new Float32Array(batchSize).fill(100)
      const pathData = new Float32Array(batchSize * 122) // 61 segments * 2 coords per path
      for (let i = 0; i < pathData.length; i++) {
        pathData[i] = Math.random() * 1000
      }
      
      const batchStart = performance.now()
      for (let i = 0; i < 100; i++) {
        const _positions = wasm.batch_interpolate_meteor_positions(
          lifeValues,
          maxLifeValues,
          pathData,
          122
        )
      }
      const batchEnd = performance.now()
      benchmarkResults.batchInterpolation = `${(batchEnd - batchStart).toFixed(3)}ms for 100 iterations of ${batchSize} meteors`

      // Get final stats
      benchmarkResults.finalStats = {
        activeMeteors: meteorSystem.get_active_meteor_count(),
        activeParticles: meteorSystem.get_active_particle_count()
      }

      // Cleanup
      meteorSystem.free()

    } catch (error) {
      benchmarkResults.error = error instanceof Error ? error.message : 'Unknown error'
    }

    setResults(benchmarkResults)
    setIsRunning(false)
  }

  return (
    <div className="p-4 bg-black/50 rounded-lg">
      <h2 className="text-xl font-bold mb-4 text-white">Meteor WASM Benchmark</h2>
      
      <div className="mb-4">
        <label className="text-white mr-2">Meteors Count:</label>
        <input
          type="number"
          value={meteorsCount}
          onChange={(e) => setMeteorsCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
          className="px-2 py-1 bg-gray-800 text-white rounded"
          min="1"
          max="20"
        />
      </div>

      <button
        onClick={runBenchmarks}
        disabled={isRunning || !wasmLoaded}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-600"
      >
        {isRunning ? 'Running...' : wasmLoaded ? 'Run Benchmarks' : 'Loading WASM...'}
      </button>

      {Object.keys(results).length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-white">Results:</h3>
          {Object.entries(results).map(([key, value]) => (
            <div key={key} className="text-sm">
              <span className="font-medium text-blue-400">{key}:</span>{' '}
              <span className="text-white">
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}