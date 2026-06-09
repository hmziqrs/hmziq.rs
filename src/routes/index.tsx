import { createFileRoute } from '@tanstack/react-router'

import { PageContainer } from '~/components/PageContainer'
import Contact from '~/components/sections/Contact'
import Hero from '~/components/sections/Hero'
import Projects from '~/components/sections/Projects'
import Experience from '~/components/sections/Experience'
import Skills from '~/components/sections/Skills'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <PageContainer>
      <Hero />
      <Skills />
      <Projects />
      <Experience />
      <Contact />
    </PageContainer>
  )
}
