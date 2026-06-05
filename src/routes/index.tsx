import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'

import { ErrorBoundary } from '~/components/ErrorBoundary'
import Contact from '~/components/sections/Contact'
import Hero from '~/components/sections/Hero'
import Projects from '~/components/sections/Projects'
import Skills from '~/components/sections/Skills'
import { WASMCanvas } from '~/components/WASMCanvas'

const StarField3D = lazy(() => import('~/components/three/StarField'))

const blackFallback = (
  <div className="fixed inset-0" style={{ backgroundColor: '#000000', zIndex: -10 }} />
)

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="relative min-h-screen">
      <WASMCanvas loadingFallback={blackFallback} errorFallback={blackFallback}>
        <StarField3D />
      </WASMCanvas>

      <ErrorBoundary
        fallback={
          <div className="flex min-h-screen items-center justify-center text-white">
            Something went wrong
          </div>
        }
      >
        <div className="relative" style={{ zIndex: 10 }}>
          <Hero />
          <Skills />
          <Projects />
          <Contact />
        </div>
      </ErrorBoundary>
    </main>
  )
}
