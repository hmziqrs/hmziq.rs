import { Analytics } from 'firebase/analytics'
import { useEffect, useState } from 'react'

import { initFirebase } from '~/lib/firebase'

export const useFirebase = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let cancelled = false
      initFirebase().then(({ analytics }) => {
        if (cancelled) return
        if (analytics) {
          setAnalytics(analytics)
        }
      })
      return () => {
        cancelled = true
      }
    }
  }, [])

  return { analytics }
}
