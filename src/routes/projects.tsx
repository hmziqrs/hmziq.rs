import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'

import { PageContainer } from '~/components/layout/PageContainer'
import { ProjectsListing } from '~/components/projects/ProjectsListing'
import { ErrorBoundary } from '~/components/ui/ErrorBoundary'

export const Route = createFileRoute('/projects')({
  component: ProjectsPage,
  head: () => ({ meta: [{ title: 'Projects - hmziq.rs' }] }),
})

function ProjectsPage() {
  if (useLocation().pathname === '/projects') return <ProjectsListing />

  return (
    <ErrorBoundary
      fallback={
        <PageContainer contentClassName="flex min-h-screen items-center justify-center">
          <div className="text-white" role="alert">
            Something went wrong
          </div>
        </PageContainer>
      }
    >
      <Outlet />
    </ErrorBoundary>
  )
}
