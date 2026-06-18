import { useState } from 'react'

import { projectTypes, projects, type Project } from '~/content/projects'

import { PageContainer } from '../layout/PageContainer'
import { BackLink } from '../ui/BackLink'
import { Button } from '../ui/Button'
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
          <div
            role="alert"
            className="text-fg-primary flex min-h-screen items-center justify-center"
          >
            Something went wrong
          </div>
        }
      >
        <div className="max-w-page mx-auto">
          <header className="mb-12">
            <div className="mb-6">
              <BackLink to="/">Back home</BackLink>
            </div>
            <h1 className="text-fg-primary font-mono text-2xl font-bold tracking-wider md:text-3xl">
              Projects
            </h1>
            <p aria-live="polite" className="text-fg-meta mt-2 font-mono text-sm">
              {filteredProjects.length} of {projects.length} projects
              {selectedType && ' (filtered)'}
            </p>
          </header>

          <div className="mb-10">
            <fieldset className="flex flex-wrap items-center gap-2 border-0 p-0">
              <legend className="text-fg-secondary font-mono text-xs">Type:</legend>
              {projectTypes.map((type) => (
                <Button
                  key={type}
                  variant="solid"
                  size="sm"
                  pressed={selectedType === type}
                  onClick={() =>
                    setSelectedType((current) => (current === type ? undefined : type))
                  }
                >
                  {type}
                </Button>
              ))}
            </fieldset>
          </div>

          <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <li key={project.slug}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>

          {filteredProjects.length === 0 && (
            <output className="block py-20 text-center">
              <span className="text-fg-secondary block font-mono text-sm">
                No projects match the selected filters.
              </span>
              <Button
                variant="link"
                size="sm"
                onClick={() => setSelectedType(undefined)}
                className="mt-4"
              >
                Clear filter
              </Button>
            </output>
          )}
        </div>
      </ErrorBoundary>
    </PageContainer>
  )
}
