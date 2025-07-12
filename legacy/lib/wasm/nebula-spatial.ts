import { getOptimizedFunctions, type SpatialGrid } from '@/lib/wasm'
import { DebugConfigManager } from '@/legacy/lib/performance/debug-config'

interface NebulaOverlap {
  id1: number
  id2: number
  distance: number
  overlapStrength: number
  midX: number
  midY: number
}

export class NebulaSpatialIndexing {
  private spatialGrid: SpatialGrid | null = null
  private isInitialized = false
  private cellSize: number = 150 // Optimal cell size for typical nebula cloud radius
  private canvasWidth: number = 0
  private canvasHeight: number = 0

  async initialize(canvasWidth: number, canvasHeight: number) {
    // Check if already initialized with same dimensions
    if (
      this.isInitialized &&
      this.canvasWidth === canvasWidth &&
      this.canvasHeight === canvasHeight
    ) {
      const debugConfig = DebugConfigManager.getInstance()
      if (debugConfig.isEnabled('enableConsoleLogs')) {
        console.log('Nebula spatial indexing already initialized with same dimensions, skipping...')
      }
      return
    }

    // If dimensions changed, we need to reinitialize
    if (
      this.isInitialized &&
      (this.canvasWidth !== canvasWidth || this.canvasHeight !== canvasHeight)
    ) {
      const debugConfig = DebugConfigManager.getInstance()
      if (debugConfig.isEnabled('enableConsoleLogs')) {
        console.log('Canvas dimensions changed, reinitializing spatial grid...')
      }
      this.dispose()
    }

    try {
      const wasm = await getOptimizedFunctions()

      if (wasm.SpatialGrid) {
        this.spatialGrid = new wasm.SpatialGrid(this.cellSize, canvasWidth, canvasHeight)
        this.isInitialized = true
        this.canvasWidth = canvasWidth
        this.canvasHeight = canvasHeight

        const debugConfig = DebugConfigManager.getInstance()
        if (debugConfig.isEnabled('enableConsoleLogs')) {
          console.log('Nebula spatial indexing initialized with WASM')
        }
      } else {
        // Fallback notification
        this.isInitialized = true // Mark as initialized even for fallback
        this.canvasWidth = canvasWidth
        this.canvasHeight = canvasHeight
        const debugConfig = DebugConfigManager.getInstance()
        if (debugConfig.isEnabled('enableConsoleLogs')) {
          console.log('Nebula spatial indexing using JS fallback')
        }
      }
    } catch (error) {
      console.error('Failed to initialize nebula spatial indexing:', error)
    }
  }

  updateCloudPositions(
    clouds: Array<{
      id: number
      x: number
      y: number
      radius: number
      isVisible: boolean
    }>
  ) {
    if (!this.spatialGrid || !this.isInitialized) {
      return
    }

    // Prepare batch data
    const count = clouds.length
    const positions = new Float32Array(count * 2)
    const radii = new Float32Array(count)
    const visibilities = new Uint8Array(count)

    clouds.forEach((cloud, i) => {
      positions[i * 2] = cloud.x
      positions[i * 2 + 1] = cloud.y
      radii[i] = cloud.radius
      visibilities[i] = cloud.isVisible ? 1 : 0
    })

    // Batch update all positions
    this.spatialGrid.update_positions(positions, radii, visibilities)
  }

  findOverlaps(overlapFactor: number = 0.8): NebulaOverlap[] {
    if (!this.spatialGrid || !this.isInitialized) {
      return []
    }

    // Get overlaps as flat array [id1, id2, distance, overlap_strength, mid_x, mid_y, ...]
    const overlapsFlat = this.spatialGrid.find_overlaps(overlapFactor)
    const overlaps: NebulaOverlap[] = []

    // Parse flat array into structured data
    for (let i = 0; i < overlapsFlat.length; i += 6) {
      overlaps.push({
        id1: overlapsFlat[i],
        id2: overlapsFlat[i + 1],
        distance: overlapsFlat[i + 2],
        overlapStrength: overlapsFlat[i + 3],
        midX: overlapsFlat[i + 4],
        midY: overlapsFlat[i + 5],
      })
    }

    return overlaps
  }

  getStats() {
    if (!this.spatialGrid || !this.isInitialized) {
      return null
    }

    const stats = this.spatialGrid.get_stats()
    return {
      totalObjects: stats[0],
      visibleObjects: stats[1],
      totalCells: stats[2],
      maxObjectsPerCell: stats[3],
    }
  }

  // Fallback implementation for when WASM is not available
  findOverlapsFallback(
    clouds: Array<{
      id: number
      x: number
      y: number
      radius: number
      isVisible: boolean
    }>,
    overlapFactor: number = 0.8
  ): NebulaOverlap[] {
    const overlaps: NebulaOverlap[] = []
    const visibleClouds = clouds.filter((c) => c.isVisible)

    // O(n²) fallback - same as original implementation
    for (let i = 0; i < visibleClouds.length; i++) {
      for (let j = i + 1; j < visibleClouds.length; j++) {
        const cloud1 = visibleClouds[i]
        const cloud2 = visibleClouds[j]

        const dx = cloud1.x - cloud2.x
        const dy = cloud1.y - cloud2.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const combinedRadius = (cloud1.radius + cloud2.radius) * overlapFactor

        if (distance < combinedRadius) {
          const overlapStrength = 1 - distance / combinedRadius
          overlaps.push({
            id1: cloud1.id,
            id2: cloud2.id,
            distance,
            overlapStrength,
            midX: (cloud1.x + cloud2.x) / 2,
            midY: (cloud1.y + cloud2.y) / 2,
          })
        }
      }
    }

    return overlaps
  }

  dispose() {
    if (
      this.spatialGrid &&
      'free' in this.spatialGrid &&
      typeof this.spatialGrid.free === 'function'
    ) {
      this.spatialGrid.free()
    }
    this.spatialGrid = null
    this.isInitialized = false
  }
}

// Singleton instance for easy access
let instance: NebulaSpatialIndexing | null = null

export function getNebulaSpatialIndexing(): NebulaSpatialIndexing {
  if (!instance) {
    instance = new NebulaSpatialIndexing()
  }
  return instance
}
