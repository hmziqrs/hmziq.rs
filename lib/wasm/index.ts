// WASM module loader with graceful fallback
let wasmModule: any = null;
let loadPromise: Promise<void> | null = null;

export interface WASMModule {
  add: (a: number, b: number) => number;
  greet: (name: string) => string;
}

export async function loadWASM(): Promise<WASMModule | null> {
  // Return cached module if already loaded
  if (wasmModule) {
    return wasmModule;
  }

  // Return existing load promise if loading is in progress
  if (loadPromise) {
    await loadPromise;
    return wasmModule;
  }

  // Start loading process
  loadPromise = (async () => {
    try {
      // Dynamic import to avoid build-time errors
      const wasmPath = '/wasm/pkg/hmziq_wasm_bg.wasm';
      const { default: init, add, greet } = await import(
        /* webpackIgnore: true */ '/wasm/pkg/hmziq_wasm.js'
      );
      
      // Initialize WASM module
      await init(wasmPath);
      
      // Store module functions
      wasmModule = {
        add,
        greet,
      };
      
      console.log('WASM module loaded successfully');
    } catch (error) {
      console.warn('Failed to load WASM module, falling back to JS:', error);
      wasmModule = null;
    }
  })();

  await loadPromise;
  return wasmModule;
}

// JavaScript fallback implementations
export const jsFallbacks = {
  add: (a: number, b: number): number => {
    console.log('Using JS fallback for add()');
    return a + b;
  },
  greet: (name: string): string => {
    console.log('Using JS fallback for greet()');
    return `Hello from JS fallback, ${name}!`;
  },
};

// Unified API that automatically uses WASM or JS fallback
export async function getOptimizedFunctions(): Promise<WASMModule> {
  const wasm = await loadWASM();
  return wasm || jsFallbacks;
}