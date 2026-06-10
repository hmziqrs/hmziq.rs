import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

interface CanvasContextEventsProps {
  onContextLost?: () => void
}

export function CanvasContextEvents({ onContextLost }: CanvasContextEventsProps) {
  const gl = useThree((state) => state.gl)

  useEffect(() => {
    const canvas = gl.domElement

    const handleContextLost = (event: Event) => {
      event.preventDefault()
      onContextLost?.()
    }

    canvas.addEventListener('webglcontextlost', handleContextLost, false)

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost, false)
    }
  }, [gl, onContextLost])

  return null
}
