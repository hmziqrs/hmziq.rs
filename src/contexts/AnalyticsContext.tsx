import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

// Lazy-loaded Firebase modules
let firebaseAnalytics: typeof import('firebase/analytics') | null = null
let firebaseApp: typeof import('firebase/app') | null = null

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

let initPromise: Promise<{ analytics: import('firebase/analytics').Analytics | null }> | null = null

async function initFirebase() {
  if (initPromise) return initPromise

  initPromise = (async () => {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      return { analytics: null }
    }

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
