import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

import Contact from '~/components/sections/Contact'
import Hero from '~/components/sections/Hero'
import Skills from '~/components/sections/Skills'
import WASMLoader from '~/components/WASMLoader'

// Lazy load Three.js component to avoid SSR issues
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
        <Suspense
          fallback={
            <div className="fixed inset-0" style={{ backgroundColor: '#000000', zIndex: -10 }} />
          }
        >
          <StarField3D />
        </Suspense>
      </WASMLoader>

      {/* Content sections */}
      <div className="relative" style={{ zIndex: 10 }}>
        <Hero />
        <Skills />
        <Contact />
      </div>
    </main>
  )
}
