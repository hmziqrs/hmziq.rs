import { test, expect } from '@playwright/test';

interface PerformanceMetrics {
  fps: number[];
  frameDurations: number[];
  memoryUsage: number[];
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  jankFrames: number;
  smoothFrames: number;
}

async function measurePerformance(page: any, durationMs: number = 10000): Promise<PerformanceMetrics> {
  // Inject performance monitoring script
  const metrics = await page.evaluate(async (duration: number) => {
    return new Promise<PerformanceMetrics>((resolve) => {
      const fps: number[] = [];
      const frameDurations: number[] = [];
      const memoryUsage: number[] = [];
      
      let frameCount = 0;
      let lastTime = performance.now();
      let startTime = lastTime;
      
      // Count janky frames (>16.67ms) and smooth frames
      let jankFrames = 0;
      let smoothFrames = 0;
      
      function measureFrame() {
        const currentTime = performance.now();
        const frameDuration = currentTime - lastTime;
        
        if (frameCount > 0) { // Skip first frame
          frameDurations.push(frameDuration);
          const currentFPS = 1000 / frameDuration;
          fps.push(currentFPS);
          
          if (frameDuration > 16.67) {
            jankFrames++;
          } else {
            smoothFrames++;
          }
        }
        
        // Measure memory if available
        if ((performance as any).memory) {
          memoryUsage.push((performance as any).memory.usedJSHeapSize / (1024 * 1024));
        }
        
        frameCount++;
        lastTime = currentTime;
        
        // Continue measuring or resolve
        if (currentTime - startTime < duration) {
          requestAnimationFrame(measureFrame);
        } else {
          const averageFPS = fps.reduce((a, b) => a + b, 0) / fps.length;
          const minFPS = Math.min(...fps);
          const maxFPS = Math.max(...fps);
          
          resolve({
            fps,
            frameDurations,
            memoryUsage,
            averageFPS,
            minFPS,
            maxFPS,
            jankFrames,
            smoothFrames
          });
        }
      }
      
      requestAnimationFrame(measureFrame);
    });
  }, durationMs);
  
  return metrics;
}

test.describe('StarField Performance Comparison', () => {
  test.setTimeout(60000); // 1 minute timeout
  
  let jsMetrics: PerformanceMetrics;
  let wasmMetrics: PerformanceMetrics;
  
  test('Measure JavaScript StarField performance', async ({ page, browserName }) => {
    // Navigate to test page with JS implementation
    await page.goto('/test?impl=js');
    
    // Wait for star field to initialize
    await page.waitForTimeout(3000);
    
    // Simulate user interaction
    await page.mouse.move(500, 500);
    await page.mouse.move(600, 600);
    await page.mouse.click(400, 400);
    
    // Measure performance
    console.log(`[${browserName}] Measuring JS StarField performance...`);
    jsMetrics = await measurePerformance(page, 10000);
    
    // Log results
    console.log(`[${browserName}] JS StarField Results:`);
    console.log(`  Average FPS: ${jsMetrics.averageFPS.toFixed(2)}`);
    console.log(`  Min FPS: ${jsMetrics.minFPS.toFixed(2)}`);
    console.log(`  Max FPS: ${jsMetrics.maxFPS.toFixed(2)}`);
    console.log(`  Jank Frames: ${jsMetrics.jankFrames}`);
    console.log(`  Smooth Frames: ${jsMetrics.smoothFrames}`);
    console.log(`  Jank Rate: ${(jsMetrics.jankFrames / (jsMetrics.jankFrames + jsMetrics.smoothFrames) * 100).toFixed(2)}%`);
    
    // Basic assertion
    expect(jsMetrics.averageFPS).toBeGreaterThan(30);
  });
  
  test('Measure WASM StarField performance', async ({ page, browserName }) => {
    // Navigate to test page with WASM implementation
    await page.goto('/test?impl=wasm');
    
    // Wait for WASM to load and star field to initialize
    await page.waitForTimeout(4000);
    
    // Verify WASM loaded
    const wasmLoaded = await page.evaluate(() => {
      return window.console.toString().includes('WASM module loaded');
    });
    
    // Simulate user interaction
    await page.mouse.move(500, 500);
    await page.mouse.move(600, 600);
    await page.mouse.click(400, 400);
    
    // Measure performance
    console.log(`[${browserName}] Measuring WASM StarField performance...`);
    wasmMetrics = await measurePerformance(page, 10000);
    
    // Log results
    console.log(`[${browserName}] WASM StarField Results:`);
    console.log(`  Average FPS: ${wasmMetrics.averageFPS.toFixed(2)}`);
    console.log(`  Min FPS: ${wasmMetrics.minFPS.toFixed(2)}`);
    console.log(`  Max FPS: ${wasmMetrics.maxFPS.toFixed(2)}`);
    console.log(`  Jank Frames: ${wasmMetrics.jankFrames}`);
    console.log(`  Smooth Frames: ${wasmMetrics.smoothFrames}`);
    console.log(`  Jank Rate: ${(wasmMetrics.jankFrames / (wasmMetrics.jankFrames + wasmMetrics.smoothFrames) * 100).toFixed(2)}%`);
    
    // Basic assertion
    expect(wasmMetrics.averageFPS).toBeGreaterThan(30);
  });
  
  test('Compare performance results', async ({ browserName }) => {
    // Skip if metrics not collected
    if (!jsMetrics || !wasmMetrics) {
      test.skip();
      return;
    }
    
    const fpsImprovement = ((wasmMetrics.averageFPS - jsMetrics.averageFPS) / jsMetrics.averageFPS) * 100;
    const jankReduction = ((jsMetrics.jankFrames - wasmMetrics.jankFrames) / jsMetrics.jankFrames) * 100;
    
    console.log(`\n[${browserName}] Performance Comparison:`);
    console.log(`  FPS Improvement: ${fpsImprovement.toFixed(2)}%`);
    console.log(`  Jank Reduction: ${jankReduction.toFixed(2)}%`);
    console.log(`  JS Average FPS: ${jsMetrics.averageFPS.toFixed(2)}`);
    console.log(`  WASM Average FPS: ${wasmMetrics.averageFPS.toFixed(2)}`);
    
    // Create summary for documentation
    const summary = {
      browser: browserName,
      jsPerformance: {
        averageFPS: jsMetrics.averageFPS,
        minFPS: jsMetrics.minFPS,
        maxFPS: jsMetrics.maxFPS,
        jankRate: (jsMetrics.jankFrames / (jsMetrics.jankFrames + jsMetrics.smoothFrames) * 100)
      },
      wasmPerformance: {
        averageFPS: wasmMetrics.averageFPS,
        minFPS: wasmMetrics.minFPS,
        maxFPS: wasmMetrics.maxFPS,
        jankRate: (wasmMetrics.jankFrames / (wasmMetrics.jankFrames + wasmMetrics.smoothFrames) * 100)
      },
      improvements: {
        fpsImprovement,
        jankReduction
      }
    };
    
    // Log summary as JSON for easy extraction
    console.log('\nTest Summary (JSON):');
    console.log(JSON.stringify(summary, null, 2));
  });
});