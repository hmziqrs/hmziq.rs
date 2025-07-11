export interface ViewConfig {
  headerPtr: number
  meteorPtr: number
  particlePtr: number
  maxMeteors: number
  maxParticles: number
}

export class TypedArrayManager {
  private views: Map<string, ArrayBufferView> = new Map()
  private memory: WebAssembly.Memory | null = null

  allocateViews(memory: WebAssembly.Memory, config: ViewConfig) {
    this.memory = memory

    // Pre-allocate all views once
    this.views.set('header', new Uint32Array(memory.buffer, config.headerPtr, 16))
    this.views.set(
      'meteors',
      new Float32Array(memory.buffer, config.meteorPtr, config.maxMeteors * 8)
    )
    this.views.set(
      'particles',
      new Float32Array(memory.buffer, config.particlePtr, config.maxParticles * 6)
    )

    // Monitor for memory growth and update views
    this.monitorMemoryGrowth()
  }

  private monitorMemoryGrowth() {
    if (!this.memory) return

    let lastByteLength = this.memory.buffer.byteLength

    // Check periodically for memory growth
    const checkInterval = setInterval(() => {
      if (!this.memory) {
        clearInterval(checkInterval)
        return
      }

      const currentByteLength = this.memory.buffer.byteLength
      if (currentByteLength !== lastByteLength) {
        // Memory growth is normal for WASM - silently update views
        this.updateViews()
        lastByteLength = currentByteLength
      }
    }, 1000)
  }

  private updateViews() {
    if (!this.memory) return

    // Recreate views with same offsets but new buffer
    for (const [name, view] of this.views) {
      const offset = view.byteOffset
      const length = view.length

      if (view instanceof Uint32Array) {
        this.views.set(name, new Uint32Array(this.memory.buffer, offset, length))
      } else if (view instanceof Float32Array) {
        this.views.set(name, new Float32Array(this.memory.buffer, offset, length))
      }
    }
  }

  getView<T extends ArrayBufferView>(name: string): T {
    const view = this.views.get(name)
    if (!view) {
      throw new Error(`View ${name} not found`)
    }
    return view as T
  }

  destroy() {
    this.views.clear()
    this.memory = null
  }
}
