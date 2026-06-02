import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import { ErrorBoundary } from '~/components/ErrorBoundary'
import Contact from '~/components/sections/Contact'
import Hero from '~/components/sections/Hero'
import Skills from '~/components/sections/Skills'
import WASMLoader from '~/components/WASMLoader'

const StarField3D = lazy(() => import('~/components/three/StarField'))

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="relative min-h-screen">
      <WASMLoader
        loadingFallback={
          <div className="fixed inset-0" style={{ backgroundColor: '#000000', zIndex: -10 }} />
        }
      >
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0" style={{ backgroundColor: '#000000', zIndex: -10 }} />
          }
        >
          <Suspense
            fallback={
              <div className="fixed inset-0" style={{ backgroundColor: '#000000', zIndex: -10 }} />
            }
          >
            <StarField3D />
          </Suspense>
        </ErrorBoundary>
      </WASMLoader>

      <div className="relative" style={{ zIndex: 10 }}>
        <Hero />
        <Skills />
        <Contact />
      </div>
    </main>
  )
}
