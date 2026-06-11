import { useState } from 'react'

import { projectTypes, projects, type Project } from '~/content/projects'

import { PageContainer } from '../layout/PageContainer'
import { BackLink } from '../ui/BackLink'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { ProjectCard } from './ProjectCard'

export function ProjectsListing() {
  const [selectedType, setSelectedType] = useState<Project['type']>()
  const filteredProjects = projects
    .filter((project) => !selectedType || project.type === selectedType)
    .toSorted((a, b) => (b.stars ?? 0) - (a.stars ?? 0))

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
          <header className="animate-in mb-12">
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
              {filteredProjects.length} of {projects.length} projects
              {selectedType && ' (filtered)'}
            </p>
          </header>

          <div className="animate-in mb-10">
            <fieldset
              style={{ animationDelay: '0.15s' }}
              className="flex flex-wrap items-center gap-2 border-0 p-0"
            >
              <legend className="font-mono text-xs text-white/60">Type:</legend>
              {projectTypes.map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() =>
                    setSelectedType((current) => (current === type ? undefined : type))
                  }
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
            </fieldset>
          </div>

          <ul className="animate-in grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <li key={project.slug} style={{ animationDelay: '0.2s' }}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>

          {filteredProjects.length === 0 && (
            <output className="block animate-[fadeIn_0.3s_ease] py-20 text-center">
              <span className="block font-mono text-sm text-white/55">
                No projects match the selected filters.
              </span>
              <button
                type="button"
                onClick={() => setSelectedType(undefined)}
                className="mt-4 font-mono text-sm text-white/50 underline underline-offset-4 transition-colors hover:text-white/70 focus-visible:text-white/70"
              >
                Clear filter
              </button>
            </output>
          )}
        </div>
      </ErrorBoundary>
    </PageContainer>
  )
}
