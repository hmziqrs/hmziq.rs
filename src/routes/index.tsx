import { createFileRoute } from '@tanstack/react-router'

import Footer from '~/components/layout/Footer'
import { PageContainer } from '~/components/layout/PageContainer'
import Blog from '~/components/sections/Blog'
import Experience from '~/components/sections/Experience'
import Hero from '~/components/sections/Hero'
import Initiatives from '~/components/sections/Initiatives'
import Projects from '~/components/sections/Projects'
import Skills from '~/components/sections/Skills'
import { blogPostsQuery } from '~/lib/blog-queries'
import { homeDescription, homeTitle, pageHead } from '~/lib/seo'

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(blogPostsQuery)
  },
  head: () => pageHead({ path: '', title: homeTitle, description: homeDescription }),
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
