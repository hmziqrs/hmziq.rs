import { useEffect, useRef, useState } from 'react'

export function useInView() {
  const ref = useRef<HTMLElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.unobserve(el)
        }
      },
      { rootMargin: '-100px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, isInView }
}
