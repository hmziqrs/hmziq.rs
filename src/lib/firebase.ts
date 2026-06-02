import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getPerformance, type FirebasePerformance } from 'firebase/performance'

const firebaseConfig = {
  apiKey: import.meta.env.NEXT_PUBLIC_API_KEY,
  authDomain: import.meta.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: import.meta.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: import.meta.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: import.meta.env.NEXT_PUBLIC_APP_ID,
  measurementId: import.meta.env.NEXT_PUBLIC_MEASUREMENT_ID,
}

let initPromise: Promise<{
  app: FirebaseApp | null
  analytics: Analytics | null
  perf: FirebasePerformance | null
}> | null = null

export const initFirebase = async () => {
  if (initPromise) return initPromise

  initPromise = (async () => {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      return { app: null, analytics: null, perf: null }
    }

    try {
      const app = initializeApp(firebaseConfig)
      const analyticsSupported = await isSupported()

      if (analyticsSupported) {
        const perf = getPerformance(app)
        const analytics = getAnalytics(app)
        return { app, analytics, perf }
      }

      return { app, analytics: null, perf: null }
    } catch (error) {
      console.error('Firebase initialization error:', error)
      return { app: null, analytics: null, perf: null }
    }
  })()

  return initPromise
}
