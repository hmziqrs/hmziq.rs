import { useEffect, useRef } from 'react'

export function useDidMount() {
  // eslint-disable-next-line react-hooks-js/refs -- mount detection, ref read is intentional
  const mounted = useRef<boolean | undefined>(undefined)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
    }
  }, [])
  // eslint-disable-next-line react-hooks-js/refs -- mount detection pattern
  return !!mounted.current
}
