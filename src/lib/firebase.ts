// src/lib/firebase.ts
import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getPerformance } from 'firebase/performance'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
}

export const initFirebase = async () => {
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
}
