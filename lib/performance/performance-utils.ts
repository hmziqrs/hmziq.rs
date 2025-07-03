/**
 * Performance utilities for optimization and measurement
 */

// Frame timing utilities
export class FrameTimer {
  private lastTime: number = 0
  private deltaTime: number = 0
  
  update(currentTime: number): number {
    this.deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime
    return this.deltaTime
  }
  
  get delta(): number {
    return this.deltaTime
  }
}

// Object pooling for particles and other frequently created objects
export class ObjectPool<T> {
  private pool: T[] = []
  private createFn: () => T
  private resetFn: (obj: T) => void
  private maxSize: number
  
  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize: number = 10,
    maxSize: number = 1000
  ) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.maxSize = maxSize
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn())
    }
  }
  
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return this.createFn()
  }
  
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj)
      this.pool.push(obj)
    }
  }
  
  clear(): void {
    this.pool = []
  }
  
  get size(): number {
    return this.pool.length
  }
}

// Bezier curve pre-calculation
export interface BezierPoint {
  x: number
  y: number
}

export function calculateBezierPath(
  startX: number,
  startY: number,
  controlX: number,
  controlY: number,
  endX: number,
  endY: number,
  segments: number
): BezierPoint[] {
  const points: BezierPoint[] = []
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const oneMinusT = 1 - t
    
    // Quadratic Bezier formula
    const x = oneMinusT * oneMinusT * startX + 
              2 * oneMinusT * t * controlX + 
              t * t * endX
    
    const y = oneMinusT * oneMinusT * startY + 
              2 * oneMinusT * t * controlY + 
              t * t * endY
    
    points.push({ x, y })
  }
  
  return points
}

// Calculate Bezier path with uniform arc-length parameterization for constant speed
export function calculateBezierPathUniform(
  startX: number,
  startY: number,
  controlX: number,
  controlY: number,
  endX: number,
  endY: number,
  segments: number
): { points: BezierPoint[], totalLength: number } {
  // First generate high-resolution path to measure arc length
  const highResSegments = segments * 10
  const tempPoints: BezierPoint[] = []
  const arcLengths: number[] = [0]
  let totalLength = 0
  
  // Generate high-res points
  for (let i = 0; i <= highResSegments; i++) {
    const t = i / highResSegments
    const oneMinusT = 1 - t
    const oneMinusTSq = oneMinusT * oneMinusT
    const tSq = t * t
    
    const x = oneMinusTSq * startX + 2 * oneMinusT * t * controlX + tSq * endX
    const y = oneMinusTSq * startY + 2 * oneMinusT * t * controlY + tSq * endY
    
    tempPoints.push({ x, y })
    
    if (i > 0) {
      const dx = x - tempPoints[i - 1].x
      const dy = y - tempPoints[i - 1].y
      const segmentLength = Math.sqrt(dx * dx + dy * dy)
      totalLength += segmentLength
      arcLengths.push(totalLength)
    }
  }
  
  // Now generate final points with uniform distribution
  const points: BezierPoint[] = []
  
  for (let i = 0; i <= segments; i++) {
    const targetLength = (i / segments) * totalLength
    
    // Find segment containing this arc length
    let segmentIdx = 0
    for (let j = 1; j < arcLengths.length; j++) {
      if (arcLengths[j] >= targetLength) {
        segmentIdx = j - 1
        break
      }
    }
    
    // Interpolate within segment
    const segmentStartLength = arcLengths[segmentIdx]
    const segmentEndLength = segmentIdx + 1 < arcLengths.length ? 
      arcLengths[segmentIdx + 1] : totalLength
    
    const segmentT = segmentEndLength > segmentStartLength ?
      (targetLength - segmentStartLength) / (segmentEndLength - segmentStartLength) : 0
    
    const p1 = tempPoints[segmentIdx]
    const p2 = segmentIdx + 1 < tempPoints.length ? 
      tempPoints[segmentIdx + 1] : tempPoints[tempPoints.length - 1]
    
    points.push({
      x: p1.x + (p2.x - p1.x) * segmentT,
      y: p1.y + (p2.y - p1.y) * segmentT
    })
  }
  
  return { points, totalLength }
}

// Smooth interpolation between bezier points
export function interpolateBezierPoint(
  points: BezierPoint[],
  t: number
): BezierPoint {
  const index = Math.floor(t * (points.length - 1))
  const localT = (t * (points.length - 1)) % 1
  
  if (index >= points.length - 1) {
    return points[points.length - 1]
  }
  
  const p1 = points[index]
  const p2 = points[index + 1]
  
  return {
    x: p1.x + (p2.x - p1.x) * localT,
    y: p1.y + (p2.y - p1.y) * localT
  }
}

// Fast sin approximation for sparkle effects
const SIN_TABLE_SIZE = 1024
const SIN_TABLE: number[] = new Array(SIN_TABLE_SIZE)

// Initialize sin lookup table
for (let i = 0; i < SIN_TABLE_SIZE; i++) {
  SIN_TABLE[i] = Math.sin((i / SIN_TABLE_SIZE) * Math.PI * 2)
}

export function fastSin(x: number): number {
  const normalized = ((x % (Math.PI * 2)) / (Math.PI * 2)) * SIN_TABLE_SIZE
  const index = Math.floor(normalized) % SIN_TABLE_SIZE
  const fraction = normalized - index
  const nextIndex = (index + 1) % SIN_TABLE_SIZE
  
  return SIN_TABLE[index] * (1 - fraction) + SIN_TABLE[nextIndex] * fraction
}

// Viewport culling check
export function isInViewport(
  x: number,
  y: number,
  radius: number,
  canvasWidth: number,
  canvasHeight: number,
  margin: number = 100
): boolean {
  return x + radius >= -margin &&
         x - radius <= canvasWidth + margin &&
         y + radius >= -margin &&
         y - radius <= canvasHeight + margin
}

// Spatial grid for efficient overlap detection
export class SpatialGrid<T extends { x: number, y: number }> {
  private grid: Map<string, T[]> = new Map()
  private cellSize: number
  
  constructor(cellSize: number = 100) {
    this.cellSize = cellSize
  }
  
  private getKey(x: number, y: number): string {
    const gridX = Math.floor(x / this.cellSize)
    const gridY = Math.floor(y / this.cellSize)
    return `${gridX},${gridY}`
  }
  
  add(item: T): void {
    const key = this.getKey(item.x, item.y)
    if (!this.grid.has(key)) {
      this.grid.set(key, [])
    }
    this.grid.get(key)!.push(item)
  }
  
  getNearby(x: number, y: number, radius: number): T[] {
    const nearby: T[] = []
    const cellRadius = Math.ceil(radius / this.cellSize)
    const centerX = Math.floor(x / this.cellSize)
    const centerY = Math.floor(y / this.cellSize)
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const key = `${centerX + dx},${centerY + dy}`
        const items = this.grid.get(key)
        if (items) {
          nearby.push(...items)
        }
      }
    }
    
    return nearby
  }
  
  clear(): void {
    this.grid.clear()
  }
}