export interface ScatterTextProps {
  text: string
  fontFamily?: string
  color?: string
  skip?: number
  autoAnimate?: boolean
  height?: string
}

export interface PixelData {
  pixelData: Uint8Array
  width: number
  height: number
  particleCount: number
}

export interface PixelGeneratorProps {
  text: string
  width: number
  height: number
  onPixelsGenerated: (data: PixelData) => void
}

export interface ScatterRendererProps {
  pixelData: PixelData
}
