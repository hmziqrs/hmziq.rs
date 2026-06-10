import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'
import { useMemo, useState, useCallback } from 'react'

import { BackLink } from '~/components/BackLink'
import { ErrorBoundary } from '~/components/ErrorBoundary'
import { PageContainer } from '~/components/PageContainer'
import { ProjectCard } from '~/components/ProjectCard'
import { projects, type Project } from '~/lib/content/Projects'

export const Route = createFileRoute('/projects')({
  component: ProjectsPage,
  head: () => ({
    meta: [{ title: 'Projects - hmziq.rs' }],
  }),
})

function ProjectsPage() {
  const location = useLocation()
  const isIndex = location.pathname === '/projects'

  if (!isIndex) {
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

  return <ProjectsListing />
}

function ProjectsListing() {
  const [selectedType, setSelectedType] = useState<Project['type'] | undefined>()

  const allTypes = useMemo(() => projects.types, [])

  const filtered = useMemo(() => {
    let result = projects.all
    if (selectedType) {
      result = result.filter((p) => p.type === selectedType)
    }
    return [...result].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
  }, [selectedType])

  const toggleType = useCallback((type: Project['type']) => {
    setSelectedType((prev) => (prev === type ? undefined : type))
  }, [])

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
          {/* Header */}
          <div className="animate-in mb-12">
            <div style={{ animationDelay: '0s' }} className="mb-6">
              <BackLink to="/">Back home</BackLink>
            </div>

            <h1
              style={{ animationDelay: '0.05s' }}
              className="font-mono text-2xl font-bold tracking-wider text-white md:text-3xl"
            >
              Projects
            </h1>
            <p
              style={{ animationDelay: '0.1s' }}
              aria-live="polite"
              className="mt-2 font-mono text-sm text-white/55"
            >
              {filtered.length} of {projects.all.length} projects
              {selectedType && ' (filtered)'}
            </p>
          </div>

          {/* Type filter */}
          <div className="animate-in mb-10">
            <div
              style={{ animationDelay: '0.15s' }}
              role="group"
              aria-label="Filter by type"
              className="flex flex-wrap items-center gap-2"
            >
              <span className="font-mono text-xs text-white/60">Type:</span>
              {allTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  aria-pressed={selectedType === type}
                  className={`rounded-lg px-4 py-2.5 font-mono text-xs transition-all duration-200 ${
                    selectedType === type
                      ? 'bg-white/15 text-white'
                      : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.08] hover:text-white/60 focus-visible:bg-white/[0.08] focus-visible:text-white/60'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Project grid */}
          <ul
            role="list"
            className="animate-in grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((project) => (
              <li key={project.slug} style={{ animationDelay: '0.2s' }}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div role="status" className="animate-[fadeIn_0.3s_ease] py-20 text-center">
              <p className="font-mono text-sm text-white/55">
                No projects match the selected filters.
              </p>
              <button
                onClick={() => setSelectedType(undefined)}
                className="mt-4 font-mono text-sm text-white/50 underline underline-offset-4 transition-colors hover:text-white/70 focus-visible:text-white/70"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </PageContainer>
  )
}
