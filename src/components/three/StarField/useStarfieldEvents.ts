import { useEffect, useRef } from 'react'

export function useStarfieldEvents(
  onResize: (width: number, height: number) => void,
  isMovingRef: React.RefObject<boolean>,
  shouldBoostFromClick: React.RefObject<boolean>
) {
  const mouseMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current)
      resizeTimeoutRef.current = setTimeout(() => {
        onResize(window.innerWidth, window.innerHeight)
      }, 150)
    }

    const handleMouseMove = () => {
      if (!isMovingRef.current) {
        isMovingRef.current = true
      }

      const currentTimeout = mouseMoveTimeoutRef.current
      if (currentTimeout) {
        clearTimeout(currentTimeout)
      }

      mouseMoveTimeoutRef.current = setTimeout(() => {
        isMovingRef.current = false
      }, 100)
    }

    // Decorative easter-egg interaction — mouse-only by design (no keyboard equivalent needed for non-essential visual feedback)
    const handleClick = () => {
      shouldBoostFromClick.current = true
    }

    const handleScroll = () => {
      handleMouseMove()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', handleScroll)
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current)
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [onResize, isMovingRef, shouldBoostFromClick])
}
