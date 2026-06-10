import { createFileRoute } from '@tanstack/react-router'

import Footer from '~/components/Footer'
import { PageContainer } from '~/components/PageContainer'
import Blog from '~/components/sections/Blog'
import Experience from '~/components/sections/Experience'
import Hero from '~/components/sections/Hero'
import Initiatives from '~/components/sections/Initiatives'
import Projects from '~/components/sections/Projects'
import Skills from '~/components/sections/Skills'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <>
      <PageContainer>
        <Hero />
        <Skills />
        <Initiatives />
        <Projects />
        <Experience />
        <Blog />
      </PageContainer>
      <Footer />
    </>
  )
}
