import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface DetailedMetrics {
  fps: number[];
  frameDurations: number[];
  memoryUsage: number[];
  cpuUsage: number[];
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  jankFrames: number;
  smoothFrames: number;
  averageMemory: number;
  peakMemory: number;
  averageCPU: number;
  peakCPU: number;
  timestamp: number;
}

interface RunSummary {
  implementation: string;
  runNumber: number;
  metrics: DetailedMetrics;
}

interface ComprehensiveResults {
  implementation: string;
  runs: RunSummary[];
  aggregatedMetrics: {
    averageFPS: { mean: number; std: number; min: number; max: number };
    jankRate: { mean: number; std: number; min: number; max: number };
    memoryUsage: { mean: number; std: number; min: number; max: number };
    cpuUsage: { mean: number; std: number; min: number; max: number };
  };
}

// Calculate standard deviation
function standardDeviation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

async function measureDetailedPerformance(page: any, durationMs: number = 10000): Promise<DetailedMetrics> {
  // Inject comprehensive performance monitoring
  const metrics = await page.evaluate(async (duration: number) => {
    return new Promise<DetailedMetrics>((resolve) => {
      const fps: number[] = [];
      const frameDurations: number[] = [];
      const memoryUsage: number[] = [];
      const cpuUsage: number[] = [];
      
      let frameCount = 0;
      let lastTime = performance.now();
      let startTime = lastTime;
      let jankFrames = 0;
      let smoothFrames = 0;
      let lastCPUTime = 0;
      let lastCPUIdleTime = 0;
      
      // CPU monitoring setup (using Performance Observer if available)
      let cpuObserver: PerformanceObserver | null = null;
      const cpuMeasurements: number[] = [];
      
      try {
        cpuObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure' && entry.name === 'cpu-usage') {
              cpuMeasurements.push(entry.duration);
            }
          }
        });
        cpuObserver.observe({ entryTypes: ['measure'] });
      } catch (e) {
        console.log('CPU Performance Observer not available');
      }
      
      // Helper to estimate CPU usage through performance timing
      function estimateCPU(): number {
        const now = performance.now();
        const timeDelta = now - lastCPUTime;
        
        // Create a busy loop to measure how much CPU time we can get
        const testStart = performance.now();
        let iterations = 0;
        while (performance.now() - testStart < 1) {
          iterations++;
        }
        
        // Normalize based on expected iterations for idle CPU
        const expectedIterations = 100000; // Calibrated value
        const cpuLoad = Math.max(0, 100 - (iterations / expectedIterations * 100));
        
        lastCPUTime = now;
        return Math.min(100, Math.max(0, cpuLoad));
      }
      
      function measureFrame() {
        const currentTime = performance.now();
        const frameDuration = currentTime - lastTime;
        
        if (frameCount > 0) {
          frameDurations.push(frameDuration);
          const currentFPS = 1000 / frameDuration;
          fps.push(currentFPS);
          
          if (frameDuration > 16.67) {
            jankFrames++;
          } else {
            smoothFrames++;
          }
        }
        
        // Measure memory
        if ((performance as any).memory) {
          const memoryMB = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
          memoryUsage.push(memoryMB);
        }
        
        // Measure CPU (every 10 frames to reduce overhead)
        if (frameCount % 10 === 0) {
          const cpuEstimate = estimateCPU();
          cpuUsage.push(cpuEstimate);
        }
        
        frameCount++;
        lastTime = currentTime;
        
        // Continue or resolve
        if (currentTime - startTime < duration) {
          requestAnimationFrame(measureFrame);
        } else {
          // Cleanup
          if (cpuObserver) {
            cpuObserver.disconnect();
          }
          
          // Calculate final metrics
          const averageFPS = fps.reduce((a, b) => a + b, 0) / fps.length;
          const minFPS = Math.min(...fps);
          const maxFPS = Math.max(...fps);
          const averageMemory = memoryUsage.length > 0 
            ? memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length 
            : 0;
          const peakMemory = memoryUsage.length > 0 
            ? Math.max(...memoryUsage) 
            : 0;
          const averageCPU = cpuUsage.length > 0 
            ? cpuUsage.reduce((a, b) => a + b, 0) / cpuUsage.length 
            : 0;
          const peakCPU = cpuUsage.length > 0 
            ? Math.max(...cpuUsage) 
            : 0;
          
          resolve({
            fps,
            frameDurations,
            memoryUsage,
            cpuUsage,
            averageFPS,
            minFPS,
            maxFPS,
            jankFrames,
            smoothFrames,
            averageMemory,
            peakMemory,
            averageCPU,
            peakCPU,
            timestamp: Date.now()
          });
        }
      }
      
      // Start CPU baseline
      lastCPUTime = performance.now();
      requestAnimationFrame(measureFrame);
    });
  }, durationMs);
  
  return metrics;
}

test.describe('Comprehensive Performance Analysis', () => {
  test.setTimeout(300000); // 5 minutes for all runs
  
  const RUNS_PER_IMPLEMENTATION = 5;
  const TEST_DURATION = 10000; // 10 seconds per run
  
  let jsResults: ComprehensiveResults;
  let wasmResults: ComprehensiveResults;
  
  test('Run comprehensive JS StarField performance tests', async ({ page, browserName }) => {
    console.log(`\n[${browserName}] Starting comprehensive JS performance tests...`);
    
    const runs: RunSummary[] = [];
    
    for (let run = 1; run <= RUNS_PER_IMPLEMENTATION; run++) {
      console.log(`\n[${browserName}] JS Run ${run}/${RUNS_PER_IMPLEMENTATION}`);
      
      // Navigate to test page
      await page.goto('/test?impl=js');
      
      // Wait for initialization
      await page.waitForTimeout(3000);
      
      // Simulate realistic user interaction
      const interactions = async () => {
        await page.mouse.move(300, 300);
        await page.waitForTimeout(500);
        await page.mouse.move(700, 500);
        await page.waitForTimeout(500);
        await page.mouse.click(500, 400);
        await page.waitForTimeout(500);
        await page.mouse.move(200, 600);
      };
      
      // Start interactions in parallel with measurement
      interactions();
      
      // Measure performance
      const metrics = await measureDetailedPerformance(page, TEST_DURATION);
      
      runs.push({
        implementation: 'js',
        runNumber: run,
        metrics
      });
      
      // Log run results
      console.log(`  FPS: ${metrics.averageFPS.toFixed(2)} (min: ${metrics.minFPS.toFixed(2)}, max: ${metrics.maxFPS.toFixed(2)})`);
      console.log(`  Jank Rate: ${(metrics.jankFrames / (metrics.jankFrames + metrics.smoothFrames) * 100).toFixed(2)}%`);
      console.log(`  Memory: ${metrics.averageMemory.toFixed(2)} MB (peak: ${metrics.peakMemory.toFixed(2)} MB)`);
      console.log(`  CPU: ${metrics.averageCPU.toFixed(2)}% (peak: ${metrics.peakCPU.toFixed(2)}%)`);
      
      // Cool down between runs
      if (run < RUNS_PER_IMPLEMENTATION) {
        await page.waitForTimeout(2000);
      }
    }
    
    // Calculate aggregated metrics
    const fpsValues = runs.map(r => r.metrics.averageFPS);
    const jankRates = runs.map(r => r.metrics.jankFrames / (r.metrics.jankFrames + r.metrics.smoothFrames) * 100);
    const memoryValues = runs.map(r => r.metrics.averageMemory);
    const cpuValues = runs.map(r => r.metrics.averageCPU);
    
    jsResults = {
      implementation: 'js',
      runs,
      aggregatedMetrics: {
        averageFPS: {
          mean: fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length,
          std: standardDeviation(fpsValues),
          min: Math.min(...fpsValues),
          max: Math.max(...fpsValues)
        },
        jankRate: {
          mean: jankRates.reduce((a, b) => a + b, 0) / jankRates.length,
          std: standardDeviation(jankRates),
          min: Math.min(...jankRates),
          max: Math.max(...jankRates)
        },
        memoryUsage: {
          mean: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
          std: standardDeviation(memoryValues),
          min: Math.min(...memoryValues),
          max: Math.max(...memoryValues)
        },
        cpuUsage: {
          mean: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length,
          std: standardDeviation(cpuValues),
          min: Math.min(...cpuValues),
          max: Math.max(...cpuValues)
        }
      }
    };
    
    console.log(`\n[${browserName}] JS Aggregated Results:`);
    console.log(`  FPS: ${jsResults.aggregatedMetrics.averageFPS.mean.toFixed(2)} ± ${jsResults.aggregatedMetrics.averageFPS.std.toFixed(2)}`);
    console.log(`  Jank Rate: ${jsResults.aggregatedMetrics.jankRate.mean.toFixed(2)}% ± ${jsResults.aggregatedMetrics.jankRate.std.toFixed(2)}%`);
    console.log(`  Memory: ${jsResults.aggregatedMetrics.memoryUsage.mean.toFixed(2)} ± ${jsResults.aggregatedMetrics.memoryUsage.std.toFixed(2)} MB`);
    console.log(`  CPU: ${jsResults.aggregatedMetrics.cpuUsage.mean.toFixed(2)}% ± ${jsResults.aggregatedMetrics.cpuUsage.std.toFixed(2)}%`);
  });
  
  test('Run comprehensive WASM StarField performance tests', async ({ page, browserName }) => {
    console.log(`\n[${browserName}] Starting comprehensive WASM performance tests...`);
    
    const runs: RunSummary[] = [];
    
    for (let run = 1; run <= RUNS_PER_IMPLEMENTATION; run++) {
      console.log(`\n[${browserName}] WASM Run ${run}/${RUNS_PER_IMPLEMENTATION}`);
      
      // Navigate to test page
      await page.goto('/test?impl=wasm');
      
      // Wait for WASM initialization
      await page.waitForTimeout(4000);
      
      // Verify WASM loaded
      const wasmLoaded = await page.evaluate(() => {
        return typeof (window as any).wasmModule !== 'undefined';
      });
      
      if (!wasmLoaded) {
        console.warn('WASM module not loaded, waiting additional time...');
        await page.waitForTimeout(2000);
      }
      
      // Simulate realistic user interaction
      const interactions = async () => {
        await page.mouse.move(300, 300);
        await page.waitForTimeout(500);
        await page.mouse.move(700, 500);
        await page.waitForTimeout(500);
        await page.mouse.click(500, 400);
        await page.waitForTimeout(500);
        await page.mouse.move(200, 600);
      };
      
      // Start interactions in parallel with measurement
      interactions();
      
      // Measure performance
      const metrics = await measureDetailedPerformance(page, TEST_DURATION);
      
      runs.push({
        implementation: 'wasm',
        runNumber: run,
        metrics
      });
      
      // Log run results
      console.log(`  FPS: ${metrics.averageFPS.toFixed(2)} (min: ${metrics.minFPS.toFixed(2)}, max: ${metrics.maxFPS.toFixed(2)})`);
      console.log(`  Jank Rate: ${(metrics.jankFrames / (metrics.jankFrames + metrics.smoothFrames) * 100).toFixed(2)}%`);
      console.log(`  Memory: ${metrics.averageMemory.toFixed(2)} MB (peak: ${metrics.peakMemory.toFixed(2)} MB)`);
      console.log(`  CPU: ${metrics.averageCPU.toFixed(2)}% (peak: ${metrics.peakCPU.toFixed(2)}%)`);
      
      // Cool down between runs
      if (run < RUNS_PER_IMPLEMENTATION) {
        await page.waitForTimeout(2000);
      }
    }
    
    // Calculate aggregated metrics
    const fpsValues = runs.map(r => r.metrics.averageFPS);
    const jankRates = runs.map(r => r.metrics.jankFrames / (r.metrics.jankFrames + r.metrics.smoothFrames) * 100);
    const memoryValues = runs.map(r => r.metrics.averageMemory);
    const cpuValues = runs.map(r => r.metrics.averageCPU);
    
    wasmResults = {
      implementation: 'wasm',
      runs,
      aggregatedMetrics: {
        averageFPS: {
          mean: fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length,
          std: standardDeviation(fpsValues),
          min: Math.min(...fpsValues),
          max: Math.max(...fpsValues)
        },
        jankRate: {
          mean: jankRates.reduce((a, b) => a + b, 0) / jankRates.length,
          std: standardDeviation(jankRates),
          min: Math.min(...jankRates),
          max: Math.max(...jankRates)
        },
        memoryUsage: {
          mean: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
          std: standardDeviation(memoryValues),
          min: Math.min(...memoryValues),
          max: Math.max(...memoryValues)
        },
        cpuUsage: {
          mean: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length,
          std: standardDeviation(cpuValues),
          min: Math.min(...cpuValues),
          max: Math.max(...cpuValues)
        }
      }
    };
    
    console.log(`\n[${browserName}] WASM Aggregated Results:`);
    console.log(`  FPS: ${wasmResults.aggregatedMetrics.averageFPS.mean.toFixed(2)} ± ${wasmResults.aggregatedMetrics.averageFPS.std.toFixed(2)}`);
    console.log(`  Jank Rate: ${wasmResults.aggregatedMetrics.jankRate.mean.toFixed(2)}% ± ${wasmResults.aggregatedMetrics.jankRate.std.toFixed(2)}%`);
    console.log(`  Memory: ${wasmResults.aggregatedMetrics.memoryUsage.mean.toFixed(2)} ± ${wasmResults.aggregatedMetrics.memoryUsage.std.toFixed(2)} MB`);
    console.log(`  CPU: ${wasmResults.aggregatedMetrics.cpuUsage.mean.toFixed(2)}% ± ${wasmResults.aggregatedMetrics.cpuUsage.std.toFixed(2)}%`);
  });
  
  test('Generate comprehensive comparison report', async ({ browserName }) => {
    // Skip if results not collected
    if (!jsResults || !wasmResults) {
      test.skip();
      return;
    }
    
    // Calculate improvements
    const fpsImprovement = ((wasmResults.aggregatedMetrics.averageFPS.mean - jsResults.aggregatedMetrics.averageFPS.mean) / jsResults.aggregatedMetrics.averageFPS.mean) * 100;
    const jankReduction = ((jsResults.aggregatedMetrics.jankRate.mean - wasmResults.aggregatedMetrics.jankRate.mean) / jsResults.aggregatedMetrics.jankRate.mean) * 100;
    const memoryChange = ((wasmResults.aggregatedMetrics.memoryUsage.mean - jsResults.aggregatedMetrics.memoryUsage.mean) / jsResults.aggregatedMetrics.memoryUsage.mean) * 100;
    const cpuChange = ((wasmResults.aggregatedMetrics.cpuUsage.mean - jsResults.aggregatedMetrics.cpuUsage.mean) / jsResults.aggregatedMetrics.cpuUsage.mean) * 100;
    
    const report = {
      testConfiguration: {
        browser: browserName,
        runsPerImplementation: RUNS_PER_IMPLEMENTATION,
        testDurationMs: TEST_DURATION,
        timestamp: new Date().toISOString()
      },
      javascript: {
        fps: `${jsResults.aggregatedMetrics.averageFPS.mean.toFixed(2)} ± ${jsResults.aggregatedMetrics.averageFPS.std.toFixed(2)}`,
        jankRate: `${jsResults.aggregatedMetrics.jankRate.mean.toFixed(2)}% ± ${jsResults.aggregatedMetrics.jankRate.std.toFixed(2)}%`,
        memory: `${jsResults.aggregatedMetrics.memoryUsage.mean.toFixed(2)} ± ${jsResults.aggregatedMetrics.memoryUsage.std.toFixed(2)} MB`,
        cpu: `${jsResults.aggregatedMetrics.cpuUsage.mean.toFixed(2)}% ± ${jsResults.aggregatedMetrics.cpuUsage.std.toFixed(2)}%`
      },
      webAssembly: {
        fps: `${wasmResults.aggregatedMetrics.averageFPS.mean.toFixed(2)} ± ${wasmResults.aggregatedMetrics.averageFPS.std.toFixed(2)}`,
        jankRate: `${wasmResults.aggregatedMetrics.jankRate.mean.toFixed(2)}% ± ${wasmResults.aggregatedMetrics.jankRate.std.toFixed(2)}%`,
        memory: `${wasmResults.aggregatedMetrics.memoryUsage.mean.toFixed(2)} ± ${wasmResults.aggregatedMetrics.memoryUsage.std.toFixed(2)} MB`,
        cpu: `${wasmResults.aggregatedMetrics.cpuUsage.mean.toFixed(2)}% ± ${wasmResults.aggregatedMetrics.cpuUsage.std.toFixed(2)}%`
      },
      improvements: {
        fpsImprovement: `${fpsImprovement > 0 ? '+' : ''}${fpsImprovement.toFixed(2)}%`,
        jankReduction: `${jankReduction > 0 ? '+' : ''}${jankReduction.toFixed(2)}%`,
        memoryChange: `${memoryChange > 0 ? '+' : ''}${memoryChange.toFixed(2)}%`,
        cpuChange: `${cpuChange > 0 ? '+' : ''}${cpuChange.toFixed(2)}%`
      },
      statisticalSignificance: {
        fps: Math.abs(fpsImprovement) > (jsResults.aggregatedMetrics.averageFPS.std + wasmResults.aggregatedMetrics.averageFPS.std),
        jank: Math.abs(jankReduction) > (jsResults.aggregatedMetrics.jankRate.std + wasmResults.aggregatedMetrics.jankRate.std),
        memory: Math.abs(memoryChange) > (jsResults.aggregatedMetrics.memoryUsage.std + wasmResults.aggregatedMetrics.memoryUsage.std),
        cpu: Math.abs(cpuChange) > (jsResults.aggregatedMetrics.cpuUsage.std + wasmResults.aggregatedMetrics.cpuUsage.std)
      }
    };
    
    console.log('\n===============================================');
    console.log('COMPREHENSIVE PERFORMANCE COMPARISON REPORT');
    console.log('===============================================');
    console.log(JSON.stringify(report, null, 2));
    
    // Save detailed results to file
    const resultsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    const filename = `performance-report-${browserName}-${Date.now()}.json`;
    const filepath = path.join(resultsDir, filename);
    
    const detailedReport = {
      ...report,
      rawData: {
        javascript: jsResults,
        webAssembly: wasmResults
      }
    };
    
    fs.writeFileSync(filepath, JSON.stringify(detailedReport, null, 2));
    console.log(`\nDetailed report saved to: ${filepath}`);
    
    // Performance assertions with tolerance for variance
    expect(wasmResults.aggregatedMetrics.averageFPS.mean).toBeGreaterThan(30);
    expect(jsResults.aggregatedMetrics.averageFPS.mean).toBeGreaterThan(30);
  });
});