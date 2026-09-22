import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

// Lazy-loaded Firebase modules
let firebaseAnalytics: typeof import('firebase/analytics') | null = null
let firebaseApp: typeof import('firebase/app') | null = null

// Firebase web config is public by design (an apiKey identifies the project, it is not a secret):
// https://firebase.google.com/docs/projects/api-keys
const firebaseConfig = {
  apiKey: 'AIzaSyAGp6MvYrVOlwc5L_pLABALDBJeKNEsX68',
  authDomain: 'hmziqrs-home.firebaseapp.com',
  projectId: 'hmziqrs-home',
  storageBucket: 'hmziqrs-home.firebasestorage.app',
  messagingSenderId: '845467249508',
  appId: '1:845467249508:web:c8c2027912f86c590ee871',
  measurementId: 'G-9YRRBFWB7K',
}

let initPromise: Promise<{ analytics: import('firebase/analytics').Analytics | null }> | null = null

async function initFirebase() {
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      firebaseApp = await import('firebase/app')
      firebaseAnalytics = await import('firebase/analytics')

      const app = firebaseApp.initializeApp(firebaseConfig)
      const analyticsSupported = await firebaseAnalytics.isSupported()

      if (analyticsSupported) {
        const analytics = firebaseAnalytics.getAnalytics(app)
        return { analytics }
      }

      return { analytics: null }
    } catch (error) {
      console.error('Firebase initialization error:', error)
      return { analytics: null }
    }
  })()

  return initPromise
}

function AnalyticsTracker() {
  const router = useRouter()
  const { pathname } = router.state.location

  useEffect(() => {
    void initFirebase().then(({ analytics }) => {
      if (!analytics || !firebaseAnalytics) return
      firebaseAnalytics.logEvent(analytics, 'page_view', { page_path: pathname })
    })
  }, [pathname])

  return null
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnalyticsTracker />
      {children}
    </>
  )
}
