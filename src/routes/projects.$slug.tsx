import { createFileRoute } from '@tanstack/react-router'

import { PageContainer } from '~/components/layout/PageContainer'
import { ProjectDetail } from '~/components/projects/ProjectDetail'
import { BackLink } from '~/components/ui/BackLink'
import { ErrorBoundary } from '~/components/ui/ErrorBoundary'
import { findProjectBySlug } from '~/content/projects'

export const Route = createFileRoute('/projects/$slug')({
  head: ({ params }) => {
    const project = findProjectBySlug(params.slug)
    return { meta: [{ title: project ? `${project.title} - Projects` : 'Project Not Found' }] }
  },
  component: ProjectDetailPage,
})

function ProjectDetailPage() {
  const project = findProjectBySlug(Route.useParams().slug)

  if (!project) {
    return (
      <PageContainer contentClassName="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="font-mono text-2xl font-bold text-white">Project not found</h1>
          <BackLink to="/projects" className="mt-4">
            Back to projects
          </BackLink>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer contentClassName="px-6 py-20">
      <ErrorBoundary
        fallback={
          <div role="alert" className="flex min-h-screen items-center justify-center text-white">
            Something went wrong
          </div>
        }
      >
        <div className="mx-auto max-w-6xl">
          <ProjectDetail project={project} />
        </div>
      </ErrorBoundary>
    </PageContainer>
  )
}
