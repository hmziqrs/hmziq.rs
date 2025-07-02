import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Quick Performance Analysis', () => {
  const testDuration = 10000; // 10 seconds per test
  const runCount = 5; // 5 runs each
  
  test('Quick JS vs WASM performance comparison', async ({ page }) => {
    const results = {
      js: {
        fps: [] as number[],
        jankRate: [] as number[],
        memory: [] as number[],
        cpu: [] as number[]
      },
      wasm: {
        fps: [] as number[],
        jankRate: [] as number[],
        memory: [] as number[],
        cpu: [] as number[]
      }
    };

    // JS Tests
    console.log('Running JS performance tests...');
    for (let run = 1; run <= runCount; run++) {
      console.log(`JS Run ${run}/${runCount}`);
      
      await page.goto('http://localhost:3000/test?impl=js');
      await page.waitForTimeout(2000); // Wait for stabilization
      
      const performanceData = await page.evaluate(async (duration) => {
        const startTime = performance.now();
        let frameCount = 0;
        let lastFrameTime = startTime;
        const frameTimes: number[] = [];
        let jankFrames = 0;
        
        await new Promise<void>((resolve) => {
          const measureFrame = () => {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastFrameTime;
            frameTimes.push(deltaTime);
            
            if (deltaTime > 16.67 * 1.5) { // 1.5x target frame time
              jankFrames++;
            }
            
            frameCount++;
            lastFrameTime = currentTime;
            
            if (currentTime - startTime < duration) {
              requestAnimationFrame(measureFrame);
            } else {
              resolve();
            }
          };
          requestAnimationFrame(measureFrame);
        });
        
        const totalTime = (performance.now() - startTime) / 1000; // in seconds
        const avgFPS = frameCount / totalTime;
        const jankRate = (jankFrames / frameCount) * 100;
        
        // Get memory usage
        const memory = (performance as any).memory ? 
          (performance as any).memory.usedJSHeapSize / (1024 * 1024) : 0;
        
        return {
          fps: avgFPS,
          jankRate,
          memory,
          cpu: 0 // Simplified - no CDP metrics
        };
      }, testDuration);
      
      results.js.fps.push(performanceData.fps);
      results.js.jankRate.push(performanceData.jankRate);
      results.js.memory.push(performanceData.memory);
      results.js.cpu.push(performanceData.cpu);
      
      console.log(`  FPS: ${performanceData.fps.toFixed(2)}, Jank: ${performanceData.jankRate.toFixed(2)}%, Memory: ${performanceData.memory.toFixed(2)} MB`);
    }
    
    // WASM Tests
    console.log('\nRunning WASM performance tests...');
    for (let run = 1; run <= runCount; run++) {
      console.log(`WASM Run ${run}/${runCount}`);
      
      await page.goto('http://localhost:3000/test?impl=wasm');
      await page.waitForTimeout(2000); // Wait for stabilization
      
      const performanceData = await page.evaluate(async (duration) => {
        const startTime = performance.now();
        let frameCount = 0;
        let lastFrameTime = startTime;
        const frameTimes: number[] = [];
        let jankFrames = 0;
        
        await new Promise<void>((resolve) => {
          const measureFrame = () => {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastFrameTime;
            frameTimes.push(deltaTime);
            
            if (deltaTime > 16.67 * 1.5) { // 1.5x target frame time
              jankFrames++;
            }
            
            frameCount++;
            lastFrameTime = currentTime;
            
            if (currentTime - startTime < duration) {
              requestAnimationFrame(measureFrame);
            } else {
              resolve();
            }
          };
          requestAnimationFrame(measureFrame);
        });
        
        const totalTime = (performance.now() - startTime) / 1000; // in seconds
        const avgFPS = frameCount / totalTime;
        const jankRate = (jankFrames / frameCount) * 100;
        
        // Get memory usage
        const memory = (performance as any).memory ? 
          (performance as any).memory.usedJSHeapSize / (1024 * 1024) : 0;
        
        return {
          fps: avgFPS,
          jankRate,
          memory,
          cpu: 0 // Simplified - no CDP metrics
        };
      }, testDuration);
      
      results.wasm.fps.push(performanceData.fps);
      results.wasm.jankRate.push(performanceData.jankRate);
      results.wasm.memory.push(performanceData.memory);
      results.wasm.cpu.push(performanceData.cpu);
      
      console.log(`  FPS: ${performanceData.fps.toFixed(2)}, Jank: ${performanceData.jankRate.toFixed(2)}%, Memory: ${performanceData.memory.toFixed(2)} MB`);
    }
    
    // Calculate averages
    const calculateAverage = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const calculateStdDev = (arr: number[]) => {
      const avg = calculateAverage(arr);
      const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
      return Math.sqrt(calculateAverage(squareDiffs));
    };
    
    const report = {
      timestamp: new Date().toISOString(),
      testDuration: testDuration / 1000,
      runCount,
      results: {
        js: {
          fps: {
            average: calculateAverage(results.js.fps),
            stdDev: calculateStdDev(results.js.fps),
            values: results.js.fps
          },
          jankRate: {
            average: calculateAverage(results.js.jankRate),
            stdDev: calculateStdDev(results.js.jankRate),
            values: results.js.jankRate
          },
          memory: {
            average: calculateAverage(results.js.memory),
            stdDev: calculateStdDev(results.js.memory),
            values: results.js.memory
          }
        },
        wasm: {
          fps: {
            average: calculateAverage(results.wasm.fps),
            stdDev: calculateStdDev(results.wasm.fps),
            values: results.wasm.fps
          },
          jankRate: {
            average: calculateAverage(results.wasm.jankRate),
            stdDev: calculateStdDev(results.wasm.jankRate),
            values: results.wasm.jankRate
          },
          memory: {
            average: calculateAverage(results.wasm.memory),
            stdDev: calculateStdDev(results.wasm.memory),
            values: results.wasm.memory
          }
        }
      },
      comparison: {
        fpsImprovement: ((calculateAverage(results.wasm.fps) - calculateAverage(results.js.fps)) / calculateAverage(results.js.fps)) * 100,
        jankReduction: ((calculateAverage(results.js.jankRate) - calculateAverage(results.wasm.jankRate)) / calculateAverage(results.js.jankRate)) * 100,
        memoryReduction: ((calculateAverage(results.js.memory) - calculateAverage(results.wasm.memory)) / calculateAverage(results.js.memory)) * 100
      }
    };
    
    // Save report
    const reportPath = path.join(process.cwd(), 'quick-performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n=== Performance Test Summary ===');
    console.log(`Test Duration: ${testDuration / 1000}s per run, ${runCount} runs each`);
    console.log('\nJS Results:');
    console.log(`  Average FPS: ${report.results.js.fps.average.toFixed(2)} ± ${report.results.js.fps.stdDev.toFixed(2)}`);
    console.log(`  Average Jank Rate: ${report.results.js.jankRate.average.toFixed(2)}% ± ${report.results.js.jankRate.stdDev.toFixed(2)}%`);
    console.log(`  Average Memory: ${report.results.js.memory.average.toFixed(2)} MB ± ${report.results.js.memory.stdDev.toFixed(2)} MB`);
    
    console.log('\nWASM Results:');
    console.log(`  Average FPS: ${report.results.wasm.fps.average.toFixed(2)} ± ${report.results.wasm.fps.stdDev.toFixed(2)}`);
    console.log(`  Average Jank Rate: ${report.results.wasm.jankRate.average.toFixed(2)}% ± ${report.results.wasm.jankRate.stdDev.toFixed(2)}%`);
    console.log(`  Average Memory: ${report.results.wasm.memory.average.toFixed(2)} MB ± ${report.results.wasm.memory.stdDev.toFixed(2)} MB`);
    
    console.log('\nPerformance Comparison:');
    console.log(`  FPS Improvement: ${report.comparison.fpsImprovement.toFixed(2)}%`);
    console.log(`  Jank Reduction: ${report.comparison.jankReduction.toFixed(2)}%`);
    console.log(`  Memory Reduction: ${report.comparison.memoryReduction.toFixed(2)}%`);
  });
});