/**
 * WebAssembly SIMD feature detection utilities
 */

export interface SIMDSupport {
  wasmSIMD: boolean
  compiledWithSIMD: boolean
  message: string
}

/**
 * Detect if the browser supports WebAssembly SIMD
 */
export async function detectWasmSIMDSupport(): Promise<boolean> {
  try {
    // Check if WebAssembly is available
    if (typeof WebAssembly === 'undefined') {
      return false
    }

    // Simple SIMD test module (v128.const + i32x4.splat)
    const simdTestModule = new Uint8Array([
      0x00,
      0x61,
      0x73,
      0x6d, // magic
      0x01,
      0x00,
      0x00,
      0x00, // version
      0x01,
      0x05,
      0x01,
      0x60, // type section
      0x00,
      0x01,
      0x7b, // function type: () -> v128
      0x03,
      0x02,
      0x01,
      0x00, // function section
      0x0a,
      0x0a,
      0x01,
      0x08, // code section
      0x00,
      0xfd,
      0x0c,
      0x00, // v128.const i32x4 0 0 0 0
      0x00,
      0x00,
      0x00,
      0x0b, // end
    ])

    await WebAssembly.instantiate(simdTestModule)
    return true
  } catch (error) {
    console.error('Error instantiating SIMD test module:', error)
    return false
  }
}

/**
 * Get comprehensive SIMD support information
 */
export async function getSIMDSupport(
  isSimdEnabled?: () => boolean,
  getSimdInfo?: () => string
): Promise<SIMDSupport> {
  const wasmSIMD = await detectWasmSIMDSupport()
  const compiledWithSIMD = isSimdEnabled ? isSimdEnabled() : false

  let message: string

  if (wasmSIMD && compiledWithSIMD) {
    message = `✅ Full SIMD support: Browser supports WASM SIMD and module compiled with SIMD`
  } else if (wasmSIMD && !compiledWithSIMD) {
    message = `⚠️ Partial SIMD support: Browser supports WASM SIMD but module not compiled with SIMD`
  } else if (!wasmSIMD && compiledWithSIMD) {
    message = `⚠️ Limited SIMD support: Module compiled with SIMD but browser doesn't support WASM SIMD`
  } else {
    message = `❌ No SIMD support: Browser doesn't support WASM SIMD and module not compiled with SIMD`
  }

  if (getSimdInfo) {
    message += `\n${getSimdInfo()}`
  }

  return {
    wasmSIMD,
    compiledWithSIMD,
    message,
  }
}

/**
 * Log SIMD support information to console
 */
export async function logSIMDSupport(
  isSimdEnabled?: () => boolean,
  getSimdInfo?: () => string
): Promise<SIMDSupport> {
  const support = await getSIMDSupport(isSimdEnabled, getSimdInfo)

  console.group('🚀 WebAssembly SIMD Support Detection')
  console.log('Browser WASM SIMD Support:', support.wasmSIMD ? '✅ Yes' : '❌ No')
  console.log('Module Compiled with SIMD:', support.compiledWithSIMD ? '✅ Yes' : '❌ No')
  console.log('Status:', support.message)
  console.groupEnd()

  return support
}

/**
 * Performance comparison utility
 */
export interface PerformanceResult {
  simdTime?: number
  scalarTime?: number
  speedup?: number
  winner: 'simd' | 'scalar' | 'unknown'
}

/**
 * Simple performance comparison between SIMD and scalar operations
 */
export function createPerformanceTest(
  simdFn: () => void,
  scalarFn: () => void,
  iterations: number = 1000
): PerformanceResult {
  if (!simdFn || !scalarFn) {
    return { winner: 'unknown' }
  }

  // Warm up
  for (let i = 0; i < 10; i++) {
    simdFn()
    scalarFn()
  }

  // Test SIMD
  const simdStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    simdFn()
  }
  const simdTime = performance.now() - simdStart

  // Test scalar
  const scalarStart = performance.now()
  for (let i = 0; i < iterations; i++) {
    scalarFn()
  }
  const scalarTime = performance.now() - scalarStart

  const speedup = scalarTime / simdTime
  const winner = speedup > 1.1 ? 'simd' : speedup < 0.9 ? 'scalar' : 'unknown'

  return {
    simdTime,
    scalarTime,
    speedup,
    winner,
  }
}
