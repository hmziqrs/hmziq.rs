'use client'

import { useState, useEffect } from 'react'
import { debounce } from '@/lib/utils'

export const useViewportSize = () => {
  const [viewportSize, setViewportSize] = useState({
    width: 0,
    height: 0,
  })

  useEffect(() => {
    const updateSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    const debouncedUpdate = debounce(updateSize, 150)

    updateSize()
    window.addEventListener('resize', debouncedUpdate)

    return () => {
      window.removeEventListener('resize', debouncedUpdate)
    }
  }, [])

  return viewportSize
}