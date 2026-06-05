import { useSyncExternalStore } from 'react'

const query = '(prefers-reduced-motion: reduce)'

const getSnapshot = () => window.matchMedia(query).matches
const getServerSnapshot = () => false

const subscribe = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {}
  const mediaQuery = window.matchMedia(query)
  mediaQuery.addEventListener('change', callback)
  return () => mediaQuery.removeEventListener('change', callback)
}

export const useReducedMotion = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
