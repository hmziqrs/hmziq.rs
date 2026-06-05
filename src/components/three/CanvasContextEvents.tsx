import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

interface CanvasContextEventsProps {
  onContextLost?: () => void
  onContextRestored?: () => void
}

export function CanvasContextEvents({
  onContextLost,
  onContextRestored,
}: CanvasContextEventsProps) {
  const gl = useThree((state) => state.gl)

  useEffect(() => {
    const canvas = gl.domElement

    const handleContextLost = (event: Event) => {
      event.preventDefault()
      onContextLost?.()
    }

    const handleContextRestored = () => {
      onContextRestored?.()
    }

    canvas.addEventListener('webglcontextlost', handleContextLost, false)
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false)

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost, false)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored, false)
    }
  }, [gl, onContextLost, onContextRestored])

  return null
}
