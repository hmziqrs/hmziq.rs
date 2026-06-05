import { createFileRoute } from '@tanstack/react-router'

import Contact from '~/components/sections/Contact'
import Hero from '~/components/sections/Hero'
import Projects from '~/components/sections/Projects'
import Skills from '~/components/sections/Skills'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="relative min-h-screen">
      <div className="relative" style={{ zIndex: 10 }}>
        <Hero />
        <Skills />
        <Projects />
        <Contact />
      </div>
    </main>
  )
}
