import { Link, useNavigate } from '@tanstack/react-router'
import { Star, ArrowRight } from 'lucide-react'

import { GlassCard } from '~/components/ui/GlassCard'
import { TechIcon } from '~/components/ui/TechIcon'
import { findInitiativeBySlug } from '~/content/initiatives'
import type { Project } from '~/content/projects'

interface ProjectCardProps {
  project: Project
  headingLevel?: 'h2' | 'h3'
}

export function ProjectCard({ project, headingLevel: Heading = 'h2' }: ProjectCardProps) {
  const navigate = useNavigate()
  const initiativeSlug = project.initiative

  return (
    <article className="h-full">
      <Link
        to="/projects/$slug"
        params={{ slug: project.slug }}
        aria-label={`${project.title} — ${project.description}`}
        className="block h-full"
      >
        <GlassCard className="group flex h-full flex-col gap-3 px-6 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Heading className="truncate font-mono text-sm font-semibold tracking-wide text-white group-focus-within:text-white/90 group-hover:text-white/90">
                {project.title}
              </Heading>
              {project.context && (
                <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/65">
                  {project.context}
                </span>
              )}
              {initiativeSlug && (
                <>
                  {/* The card itself is a <Link> (renders <a>); keep this badge a
                      non-anchor element so we don't nest <a> inside <a>, which is
                      invalid HTML and triggers a hydration error. It still acts as a
                      link via role + keyboard handling. */}
                  {/* eslint-disable jsx-a11y/prefer-tag-over-role */}
                  <span
                    role="link"
                    tabIndex={0}
                    onClick={(e) => {
                      // Stop the click from also triggering the card's navigation,
                      // then route to the initiative directly.
                      e.stopPropagation()
                      e.preventDefault()
                      navigate({ to: '/initiatives/$slug', params: { slug: initiativeSlug } })
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return
                      e.preventDefault()
                      e.stopPropagation()
                      navigate({ to: '/initiatives/$slug', params: { slug: initiativeSlug } })
                    }}
                    className="shrink-0 cursor-pointer rounded border border-emerald-500/20 bg-emerald-500/5 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400/80 transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:outline-none"
                  >
                    {findInitiativeBySlug(initiativeSlug)?.name ?? initiativeSlug}
                  </span>
                  {/* eslint-enable jsx-a11y/prefer-tag-over-role */}
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {(project.stars ?? 0) > 0 && (
                <span
                  className="flex items-center gap-1 font-mono text-xs text-white/65"
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
                className="text-white/30 transition-all duration-300 group-focus-within:translate-x-0.5 group-focus-within:text-white/60 group-hover:translate-x-0.5 group-hover:text-white/60"
              />
            </div>
          </div>

          <p className="line-clamp-2 text-xs leading-relaxed text-white/60">
            {project.description}
          </p>

          <div className="mt-auto flex flex-wrap gap-1.5">
            {project.tech.slice(0, 5).map((tech) => (
              <span className="group/badge relative inline-flex" key={tech}>
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/10 transition-colors group-hover/badge:border-white/20 group-hover/badge:bg-white/15"
                  title={tech}
                >
                  <TechIcon tech={tech} />
                </span>
                <span className="pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 rounded bg-neutral-900 px-2 py-1 font-mono text-[10px] whitespace-nowrap text-white/80 opacity-0 shadow-lg transition-opacity group-hover/badge:opacity-100">
                  {tech}
                </span>
              </span>
            ))}
            {project.tech.length > 5 && (
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/10 font-mono text-[10px] text-white/55"
                aria-label={`+${project.tech.length - 5} more technologies`}
              >
                +{project.tech.length - 5}
              </span>
            )}
          </div>
        </GlassCard>
      </Link>
    </article>
  )
}
