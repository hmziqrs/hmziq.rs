import { useRouter } from "@tanstack/react-router"
import { useEffect } from "react"
import { logEvent } from "firebase/analytics"
import { Suspense } from "react"
import { useFirebase } from "~/hooks/use-firebase"

function AnalyticsTracker() {
  const { analytics } = useFirebase()
  const router = useRouter()
  const { pathname } = router.state.location

  useEffect(() => {
    if (analytics) {
      logEvent(analytics, "page_view", {
        page_path: pathname,
        page_search: window.location.search,
        page_location: window.location.href,
      })
    }
  }, [analytics, pathname])

  return null
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <AnalyticsTracker />
      </Suspense>
      {children}
    </>
  )
}
