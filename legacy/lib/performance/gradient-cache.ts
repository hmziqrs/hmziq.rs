/**
 * Gradient Cache for Canvas 2D performance optimization
 * Caches frequently used gradients to avoid recreating them every frame
 */

export type GradientStop = [number, string]

export class GradientCache {
  private cache: Map<string, CanvasGradient>
  private ctx: CanvasRenderingContext2D | null = null
  private maxSize: number
  private accessOrder: string[] = []
  private hits: number = 0
  private misses: number = 0

  constructor(maxSize: number = 100) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  setContext(ctx: CanvasRenderingContext2D) {
    if (this.ctx !== ctx) {
      this.ctx = ctx
      this.clear() // Clear cache when context changes
    }
  }

  getLinearGradient(
    key: string,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    stops: GradientStop[]
  ): CanvasGradient | null {
    if (!this.ctx) return null

    // Check cache first
    const cached = this.cache.get(key)
    if (cached) {
      this.hits++
      this.updateAccessOrder(key)
      return cached
    }

    // Cache miss
    this.misses++

    // Create new gradient
    try {
      const gradient = this.ctx.createLinearGradient(x0, y0, x1, y1)
      stops.forEach(([offset, color]) => {
        gradient.addColorStop(offset, color)
      })

      this.addToCache(key, gradient)
      return gradient
    } catch (error) {
      console.error('Failed to create linear gradient:', error)
      return null
    }
  }

  getRadialGradient(
    key: string,
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
    stops: GradientStop[]
  ): CanvasGradient | null {
    if (!this.ctx) return null

    // Check cache first
    const cached = this.cache.get(key)
    if (cached) {
      this.hits++
      this.updateAccessOrder(key)
      return cached
    }

    // Cache miss
    this.misses++

    // Create new gradient
    try {
      const gradient = this.ctx.createRadialGradient(x0, y0, r0, x1, y1, r1)
      stops.forEach(([offset, color]) => {
        gradient.addColorStop(offset, color)
      })

      this.addToCache(key, gradient)
      return gradient
    } catch (error) {
      console.error('Failed to create radial gradient:', error)
      return null
    }
  }

  private addToCache(key: string, gradient: CanvasGradient) {
    // Check if we need to evict old entries (LRU)
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.accessOrder[0]
      this.cache.delete(oldestKey)
      this.accessOrder.shift()
    }

    this.cache.set(key, gradient)
    this.accessOrder.push(key)
  }

  private updateAccessOrder(key: string) {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
      this.accessOrder.push(key)
    }
  }

  clear() {
    this.cache.clear()
    this.accessOrder = []
    this.hits = 0
    this.misses = 0
  }

  get size(): number {
    return this.cache.size
  }

  get hitRate(): number {
    const total = this.hits + this.misses
    return total > 0 ? this.hits / total : 0
  }

  getStats(): { hits: number; misses: number; size: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
    }
  }
}

// Global gradient cache instances for each component
export const gradientCaches = {
  stars: new GradientCache(30),
  nebula: new GradientCache(20),
}

// Make gradient caches accessible globally for debugging
if (typeof window !== 'undefined') {
  ;(window as any).gradientCaches = gradientCaches
}

// Utility function to generate consistent gradient keys
export function generateGradientKey(
  type: string,
  variant: string | number,
  quality?: string | number
): string {
  return `${type}_${variant}${quality ? `_${quality}` : ''}`
}
