import { Link } from '@tanstack/react-router'
import { Star, ArrowRight } from 'lucide-react'

import { Card } from '~/components/ui/Card'
import { Tag } from '~/components/ui/Tag'
import { TechIcon } from '~/components/ui/TechIcon'
import { findInitiativeBySlug } from '~/content/initiatives'
import type { Project } from '~/content/projects'

interface ProjectCardProps {
  project: Project
  headingLevel?: 'h2' | 'h3'
}

export function ProjectCard({ project, headingLevel: Heading = 'h2' }: ProjectCardProps) {
  const initiativeSlug = project.initiative

  return (
    <article className="h-full">
      <Link
        to="/projects/$slug"
        params={{ slug: project.slug }}
        aria-label={`${project.title} — ${project.description}`}
        className="block h-full"
      >
        <Card variant="glass" interactive className="flex h-full flex-col gap-3 px-6 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Heading className="text-fg-heading group-hover:text-fg-heading-hover group-focus-within:text-fg-heading-hover truncate font-mono text-sm font-semibold tracking-wide">
                {project.title}
              </Heading>
              {project.context && (
                <Tag size="xs" className="shrink-0">
                  {project.context}
                </Tag>
              )}
              {initiativeSlug && (
                <Tag variant="status" size="xs" className="shrink-0">
                  {findInitiativeBySlug(initiativeSlug)?.name ?? initiativeSlug}
                </Tag>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {(project.stars ?? 0) > 0 && (
                <span
                  className="text-fg-secondary flex items-center gap-1 font-mono text-xs"
                  aria-label={`${project.stars} GitHub stars`}
                >
                  <Star
                    size={12}
                    fill="currentColor"
                    className="text-yellow-500/80"
                    aria-hidden="true"
                  />
                  {project.stars}
                </span>
              )}
              <ArrowRight
                size={14}
                aria-hidden="true"
                className="text-fg-faint group-hover:text-fg-secondary group-focus-within:text-fg-secondary transition-all duration-300 group-focus-within:translate-x-0.5 group-hover:translate-x-0.5"
              />
            </div>
          </div>

          <p className="text-fg-secondary line-clamp-2 text-xs leading-relaxed">
            {project.description}
          </p>

          <div className="mt-auto flex flex-wrap gap-1.5">
            {project.tech.slice(0, 5).map((tech) => (
              <span className="group/badge relative inline-flex" key={tech}>
                <span
                  className="border-border-subtle bg-surface-raised group-hover/badge:border-border-hover group-hover/badge:bg-surface-overlay flex h-7 w-7 items-center justify-center rounded-md border transition-colors"
                  title={tech}
                >
                  <TechIcon tech={tech} />
                  <span className="sr-only">{tech}</span>
                </span>
                <span className="text-fg-meta text-micro pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 rounded bg-neutral-900 px-2 py-1 font-mono whitespace-nowrap opacity-0 shadow-lg transition-opacity group-hover/badge:opacity-100">
                  {tech}
                </span>
              </span>
            ))}
            {project.tech.length > 5 && (
              <Tag
                size="xs"
                as="span"
                className="border-border-subtle bg-surface-raised flex h-7 w-7 items-center justify-center rounded-md"
                aria-label={`+${project.tech.length - 5} more technologies`}
              >
                +{project.tech.length - 5}
              </Tag>
            )}
          </div>
        </Card>
      </Link>
    </article>
  )
}
