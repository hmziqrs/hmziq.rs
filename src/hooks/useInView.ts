import { useEffect, useRef, useState } from 'react'

export function useInView(options?: IntersectionObserverInit & { once?: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          if (options?.once !== false) observer.unobserve(el)
        } else if (options?.once === false) {
          setIsInView(false)
        }
      },
      { rootMargin: options?.rootMargin, threshold: options?.threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, isInView }
}
