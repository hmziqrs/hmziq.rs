export const RENDER_DATA_FORMAT = {
  HEADER_SIZE: 16, // u32 values
  METEOR_STRIDE: 8, // [x, y, size, angle, glow_intensity, life_ratio, type, active]
  PARTICLE_STRIDE: 6, // [x, y, vx, vy, size, opacity]
  TRAIL_STRIDE: 3, // [x, y, opacity]
} as const

export interface PackedDataLayout {
  header: {
    meteorCount: 0,
    particleCount: 1,
    dirtyFlags: 2,
    frameNumber: 3,
    avgFrameTime: 4,
    memoryUsage: 5,
    highWaterMark: 6,
    cacheHits: 7,
    cacheMisses: 8,
    updateTime: 9,
    packTime: 10,
    // 11-15: reserved for future use
  }
}

export interface MemoryLayout {
  headerOffset: 0
  meteorDataOffset: number  // headerOffset + HEADER_SIZE * 4
  particleDataOffset: number // meteorDataOffset + maxMeteors * METEOR_STRIDE * 4
  trailDataOffset: number   // particleDataOffset + maxParticles * PARTICLE_STRIDE * 4
  totalSize: number
}

export function calculateMemoryLayout(maxMeteors: number, maxParticles: number, maxTrailPoints: number): MemoryLayout {
  const headerSize = RENDER_DATA_FORMAT.HEADER_SIZE * 4 // u32 = 4 bytes
  const meteorDataSize = maxMeteors * RENDER_DATA_FORMAT.METEOR_STRIDE * 4 // f32 = 4 bytes
  const particleDataSize = maxParticles * RENDER_DATA_FORMAT.PARTICLE_STRIDE * 4
  const trailDataSize = maxTrailPoints * RENDER_DATA_FORMAT.TRAIL_STRIDE * 4
  
  return {
    headerOffset: 0,
    meteorDataOffset: headerSize,
    particleDataOffset: headerSize + meteorDataSize,
    trailDataOffset: headerSize + meteorDataSize + particleDataSize,
    totalSize: headerSize + meteorDataSize + particleDataSize + trailDataSize
  }
}

export function unpackMeteorData(
  buffer: Float32Array,
  count: number
): { x: number; y: number; size: number; angle: number; glowIntensity: number; lifeRatio: number; type: number; active: boolean }[] {
  const meteors = []
  const stride = RENDER_DATA_FORMAT.METEOR_STRIDE
  
  for (let i = 0; i < count; i++) {
    const offset = i * stride
    meteors.push({
      x: buffer[offset],
      y: buffer[offset + 1],
      size: buffer[offset + 2],
      angle: buffer[offset + 3],
      glowIntensity: buffer[offset + 4],
      lifeRatio: buffer[offset + 5],
      type: buffer[offset + 6],
      active: buffer[offset + 7] > 0
    })
  }
  
  return meteors
}

export function unpackParticleData(
  buffer: Float32Array,
  count: number
): { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] {
  const particles = []
  const stride = RENDER_DATA_FORMAT.PARTICLE_STRIDE
  
  for (let i = 0; i < count; i++) {
    const offset = i * stride
    particles.push({
      x: buffer[offset],
      y: buffer[offset + 1],
      vx: buffer[offset + 2],
      vy: buffer[offset + 3],
      size: buffer[offset + 4],
      opacity: buffer[offset + 5]
    })
  }
  
  return particles
}