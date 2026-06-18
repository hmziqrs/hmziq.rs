import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'

import { PageContainer } from '~/components/layout/PageContainer'
import { ProjectsListing } from '~/components/projects/ProjectsListing'
import { ErrorBoundary } from '~/components/ui/ErrorBoundary'
import { pageHead } from '~/lib/seo'

export const Route = createFileRoute('/projects')({
  component: ProjectsPage,
  head: ({ matches, match }) => {
    // `/projects` is both the listing page and a layout (Outlet) for
    // `/projects/$slug`. Only emit head when we are the deepest (leaf) match —
    // i.e. the listing is actually rendering. As a layout we stay silent: the
    // child route emits its own canonical/og:url, and <link> tags dedupe by
    // full-object equality (not by rel), so a parent canonical here would render
    // a second <link rel="canonical"> on every detail page.
    if (matches[matches.length - 1]?.id !== match.id) return {}
    return pageHead({
      path: '/projects',
      title: 'Projects - hmziq.rs',
      description:
        'Open-source projects and experiments by hmziqrs — Rust, TypeScript, Go, and more.',
    })
  },
})

function ProjectsPage() {
  if (useLocation().pathname === '/projects') return <ProjectsListing />

  return (
    <ErrorBoundary
      fallback={
        <PageContainer contentClassName="flex min-h-screen items-center justify-center">
          <div className="text-fg-primary" role="alert">
            Something went wrong
          </div>
        </PageContainer>
      }
    >
      <Outlet />
    </ErrorBoundary>
  )
}
