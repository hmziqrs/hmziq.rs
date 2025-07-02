'use client'

import { useEffect, useState } from 'react'
import { getOptimizedFunctions } from '@/lib/wasm'

interface BenchmarkResult {
  name: string
  jsTime: number
  wasmTime: number
  speedup: number
}

export function WASMBenchmark() {
  const [results, setResults] = useState<BenchmarkResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function runBenchmarks() {
      try {
        const wasm = await getOptimizedFunctions()
        if (!wasm) {
          setError('WASM module not loaded')
          return
        }

        const benchmarkResults: BenchmarkResult[] = []
        
        // Benchmark 1: Single sin calculation
        const iterations = 1000000
        console.log(`Running benchmarks with ${iterations} iterations...`)
        
        // JS sin
        const jsStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          Math.sin(i * 0.001)
        }
        const jsTime = performance.now() - jsStart
        
        // WASM sin
        const wasmStart = performance.now()
        for (let i = 0; i < iterations; i++) {
          wasm.fast_sin(i * 0.001)
        }
        const wasmTime = performance.now() - wasmStart
        
        benchmarkResults.push({
          name: 'Single sin calculation',
          jsTime,
          wasmTime,
          speedup: jsTime / wasmTime
        })
        
        // Benchmark 2: Batch sin calculation
        const batchSize = 10000
        const values = new Float32Array(batchSize)
        for (let i = 0; i < batchSize; i++) {
          values[i] = i * 0.001
        }
        
        // JS batch
        const jsBatchStart = performance.now()
        for (let run = 0; run < 100; run++) {
          const result = new Float32Array(batchSize)
          for (let i = 0; i < batchSize; i++) {
            result[i] = Math.sin(values[i])
          }
        }
        const jsBatchTime = performance.now() - jsBatchStart
        
        // WASM batch
        const wasmBatchStart = performance.now()
        for (let run = 0; run < 100; run++) {
          wasm.fast_sin_batch(values)
        }
        const wasmBatchTime = performance.now() - wasmBatchStart
        
        benchmarkResults.push({
          name: 'Batch sin calculation (10k values)',
          jsTime: jsBatchTime,
          wasmTime: wasmBatchTime,
          speedup: jsBatchTime / wasmBatchTime
        })
        
        // Benchmark 3: Star position generation
        const starCount = 10000
        
        // JS implementation
        const jsStarStart = performance.now()
        const positions = new Float32Array(starCount * 3)
        for (let i = 0; i < starCount; i++) {
          const seed = (x: number) => {
            const val = Math.sin(x * 12.9898 + 78.233) * 43758.5453
            return val - Math.floor(val)
          }
          const radius = 20 + seed(i) * 80
          const theta = seed(i + 1000) * Math.PI * 2
          const phi = Math.acos(2 * seed(i + 2000) - 1)
          
          positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
          positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
          positions[i * 3 + 2] = radius * Math.cos(phi)
        }
        const jsStarTime = performance.now() - jsStarStart
        
        // WASM implementation
        const wasmStarStart = performance.now()
        wasm.generate_star_positions(starCount, 0, 20, 100)
        const wasmStarTime = performance.now() - wasmStarStart
        
        benchmarkResults.push({
          name: 'Star position generation (10k stars)',
          jsTime: jsStarTime,
          wasmTime: wasmStarTime,
          speedup: jsStarTime / wasmStarTime
        })
        
        // Benchmark 4: Seed random batch
        const seedBatchSize = 50000
        
        // JS seed random
        const jsSeedStart = performance.now()
        const seedResults = new Float32Array(seedBatchSize)
        for (let i = 0; i < seedBatchSize; i++) {
          const val = Math.sin(i * 12.9898 + 78.233) * 43758.5453
          seedResults[i] = val - Math.floor(val)
        }
        const jsSeedTime = performance.now() - jsSeedStart
        
        // WASM seed random
        const wasmSeedStart = performance.now()
        wasm.seed_random_batch(0, seedBatchSize)
        const wasmSeedTime = performance.now() - wasmSeedStart
        
        benchmarkResults.push({
          name: 'Seed random batch (50k values)',
          jsTime: jsSeedTime,
          wasmTime: wasmSeedTime,
          speedup: jsSeedTime / wasmSeedTime
        })
        
        setResults(benchmarkResults)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    runBenchmarks()
  }, [])

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 bg-black/90 border border-white/20 rounded p-4 text-xs font-mono text-white">
        <h3 className="text-sm font-bold mb-2">WASM Performance Benchmark</h3>
        <p className="text-gray-400">Running benchmarks...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 bg-black/90 border border-red-500/20 rounded p-4 text-xs font-mono text-white">
        <h3 className="text-sm font-bold mb-2 text-red-400">Benchmark Error</h3>
        <p className="text-red-300">{error}</p>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 border border-white/20 rounded p-4 text-xs font-mono text-white max-w-md">
      <h3 className="text-sm font-bold mb-3">WASM vs JS Performance</h3>
      <div className="space-y-2">
        {results.map((result, i) => (
          <div key={i} className="border-t border-white/10 pt-2">
            <div className="text-blue-300 mb-1">{result.name}</div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div>
                <span className="text-gray-500">JS: </span>
                <span className="text-yellow-400">{result.jsTime.toFixed(2)}ms</span>
              </div>
              <div>
                <span className="text-gray-500">WASM: </span>
                <span className="text-green-400">{result.wasmTime.toFixed(2)}ms</span>
              </div>
              <div>
                <span className="text-gray-500">Speedup: </span>
                <span className={result.speedup > 1 ? 'text-green-300' : 'text-red-300'}>
                  {result.speedup.toFixed(2)}x
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-gray-400">
        Note: Performance varies by browser and hardware
      </div>
    </div>
  )
}