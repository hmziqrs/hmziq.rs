'use client'

import { useState, useEffect } from 'react'
import { throttle } from '@/lib/utils'

export const useScrollProgress = () => {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const updateScrollProgress = throttle(() => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = Math.min(scrollTop / docHeight, 1)
      
      setScrollProgress(progress)
      setScrollY(scrollTop)
    }, 16) // ~60fps

    updateScrollProgress()
    window.addEventListener('scroll', updateScrollProgress, { passive: true })

    return () => {
      window.removeEventListener('scroll', updateScrollProgress)
    }
  }, [])

  return { scrollProgress, scrollY }
}