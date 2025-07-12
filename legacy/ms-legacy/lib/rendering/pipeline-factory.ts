import { IRenderPipeline, PipelineOptions } from './interfaces'
import { WASMRenderPipeline } from './wasm-render-pipeline'
import { JSRenderPipeline } from './js-fallback/js-render-pipeline'
import { getOptimizedFunctions } from '@/lib/wasm'

export class RenderPipelineFactory {
  static async create(
    canvas: HTMLCanvasElement,
    options: PipelineOptions = {}
  ): Promise<IRenderPipeline> {
    // Try WASM first unless forced to use JavaScript
    if (!options.forceJavaScript) {
      try {
        const wasmModule = await getOptimizedFunctions()
        if (wasmModule?.RenderPipeline) {
          console.log('🚀 Using WASM render pipeline')
          return new WASMRenderPipeline(wasmModule, canvas, options)
        }
      } catch (error) {
        console.warn('⚠️ WASM initialization failed, falling back to JS:', error)
      }
    }

    // Fallback to JavaScript implementation
    console.log('📦 Using JavaScript render pipeline')
    return new JSRenderPipeline(canvas, options)
  }

  static async createJS(
    canvas: HTMLCanvasElement,
    options: PipelineOptions = {}
  ): Promise<IRenderPipeline> {
    return new JSRenderPipeline(canvas, { ...options, forceJavaScript: true })
  }

  static async createWASM(
    canvas: HTMLCanvasElement,
    options: PipelineOptions = {}
  ): Promise<IRenderPipeline> {
    const wasmModule = await getOptimizedFunctions()
    if (!wasmModule?.RenderPipeline) {
      throw new Error('WASM RenderPipeline not available')
    }
    return new WASMRenderPipeline(wasmModule, canvas, options)
  }
}
