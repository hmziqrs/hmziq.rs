// WASM barrel exports
// Re-exporting from split modules for backward compatibility

// Core exports
export {
  loadWASM,
  getOptimizedFunctions,
  isWASMLoaded,
  type WASMModule
} from './core'

// StarField exports
export {
  StarFieldSharedMemory,
  type StarMemoryPointers,
  type FrameUpdateResult
} from './starfield'

// ScatterText exports
export {
  ScatterTextSharedMemory,
  type ScatterTextPointers
} from './scatter-text'
