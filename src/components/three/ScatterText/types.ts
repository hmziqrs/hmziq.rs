import { WASMModule } from '@/lib/wasm'

export interface ScatterTextProps {
  text: string
  fontFamily?: string
  color?: string
  skip?: number
  autoAnimate?: boolean
  height?: string
}

export interface PixelData {
  pixelData: Uint8ClampedArray
  width: number
  height: number
  particleCount: number
}

export interface PixelGeneratorProps {
  text: string
  fontFamily: string
  color: string
  skip: number
  containerWidth: number
  containerHeight: number
  onPixelsGenerated: (data: PixelData, wasmModule: any) => void
}

export interface ScatterRendererProps {
  pixelData: PixelData
  autoAnimate: boolean
}
