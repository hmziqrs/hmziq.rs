import { SiApple, SiGithub, SiGoogleplay, SiNpm } from '@icons-pack/react-simple-icons'
import { Link } from '@tanstack/react-router'
import { ArrowRight, ExternalLink, Globe, Star } from 'lucide-react'

import { findExperienceBySlug } from '~/content/experiences'
import { findInitiativeBySlug } from '~/content/initiatives'
import type { Project, ProjectLink as ProjectLinks } from '~/content/projects'
import { periodToDatetime } from '~/lib/dateUtils'

import { BackLink } from '../ui/BackLink'
import { Card } from '../ui/Card'
import { MarkdownRenderer } from '../ui/MarkdownRenderer'
import { Tag } from '../ui/Tag'
import { TechIcon } from '../ui/TechIcon'
import { ProjectLink } from './ProjectLink'

const projectLinkTypes = [
  { key: 'github', label: 'GitHub', icon: <SiGithub size={14} aria-hidden="true" /> },
  { key: 'web', label: 'Website', icon: <Globe size={14} aria-hidden="true" /> },
  {
    key: 'playStore',
    label: 'Play Store',
    icon: <SiGoogleplay size={14} aria-hidden="true" />,
  },
  { key: 'appStore', label: 'App Store', icon: <SiApple size={14} aria-hidden="true" /> },
  { key: 'npm', label: 'npm', icon: <SiNpm size={14} color="#CB3837" aria-hidden="true" /> },
  { key: 'crates', label: 'crates.io', icon: <ExternalLink size={14} aria-hidden="true" /> },
] satisfies { key: keyof ProjectLinks; label: string; icon: React.ReactNode }[]

export function ProjectDetail({ project }: { project: Project }) {
  const linkedExperience = project.experienceSlug
    ? findExperienceBySlug(project.experienceSlug)
    : undefined
  const links = projectLinkTypes.flatMap(({ key, ...link }) => {
    const href = project.links?.[key]
    return href ? [{ ...link, href }] : []
  })

  return (
    <div>
      <div className="mb-8">
        <BackLink to="/projects">All projects</BackLink>
      </div>

      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-fg-primary font-mono text-2xl font-bold tracking-wide md:text-3xl">
              {project.title}
            </h1>
            <p className="text-fg-link mt-2 text-sm leading-relaxed">{project.description}</p>
          </div>
          {(project.stars ?? 0) > 0 && (
            <span
              className="bg-surface-button text-fg-meta flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm"
              aria-label={`${project.stars} GitHub stars`}
            >
              <Star
                size={14}
                fill="currentColor"
                className="text-yellow-500/80"
                aria-hidden="true"
              />
              {project.stars}
            </span>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Tag size="md">{project.type}</Tag>
        {project.context && <Tag size="md">{project.context}</Tag>}
        {project.period && (
          <Tag as="time" size="md" dateTime={periodToDatetime(project.period) ?? project.period}>
            {project.period}
          </Tag>
        )}
        {project.initiative && (
          <Link
            to="/initiatives/$slug"
            params={{ slug: project.initiative }}
            className="border-accent-success/20 bg-accent-success/5 text-accent-success focus-ring inline-flex items-center rounded-full border px-3 py-1 font-mono text-xs transition-opacity hover:opacity-80"
          >
            {findInitiativeBySlug(project.initiative)?.name ?? project.initiative}
          </Link>
        )}
      </div>

      {linkedExperience && (
        <div className="mb-6">
          <Card variant="glass" interactive>
            <Link to="/" hash="experience" className="group flex items-center gap-4 px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-fg-secondary font-mono text-xs">Work Experience</span>
                <span className="text-fg-secondary group-hover:text-fg-primary group-focus-visible:text-fg-primary font-mono text-sm transition-colors">
                  {linkedExperience.role}
                  {linkedExperience.company ? ` at ${linkedExperience.company}` : ''}
                </span>
              </div>
              <span className="text-fg-secondary ml-auto font-mono text-xs">
                {linkedExperience.period}
              </span>
              <ArrowRight
                size={14}
                className="text-fg-faint group-hover:text-fg-muted group-focus-visible:text-fg-muted shrink-0 transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </Card>
        </div>
      )}

      <ul className="mb-8 flex list-none flex-wrap gap-2">
        {project.tech.map((tech) => (
          <li
            key={tech}
            className="border-border-default bg-surface-overlay text-fg-link flex items-center gap-1.5 rounded-lg border px-3 py-1 font-mono text-xs"
          >
            <TechIcon tech={tech} size={12} />
            {tech}
          </li>
        ))}
      </ul>

      {links.length > 0 && (
        <ul className="mb-10 flex list-none flex-wrap gap-3">
          {links.map((link) => (
            <li key={link.label}>
              <ProjectLink {...link} />
            </li>
          ))}
        </ul>
      )}

      {project.readme && (
        <>
          <hr className="border-border-default mb-10" />
          <article className="prose-project">
            <MarkdownRenderer content={project.readme} headingOffset={1} />
          </article>
        </>
      )}
    </div>
  )
}
