import { useEffect, useRef } from 'react'

export function useDidMount() {
  const mounted = useRef<boolean | undefined>(undefined)
  useEffect(() => {
    if (!mounted.current) {
      // do componentDidMount logic
      mounted.current = true
    }
  }, [])
  return !!mounted.current
}
