import { SiApple, SiGithub, SiGoogleplay, SiNpm } from '@icons-pack/react-simple-icons'
import { Link } from '@tanstack/react-router'
import { ArrowRight, ExternalLink, Globe, Star } from 'lucide-react'

import { findExperienceBySlug } from '~/content/experiences'
import type { Project, ProjectLink as ProjectLinks } from '~/content/projects'
import { periodToDatetime } from '~/lib/dateUtils'

import { BackLink } from '../ui/BackLink'
import { MarkdownRenderer } from '../ui/MarkdownRenderer'
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
            <h1 className="font-mono text-2xl font-bold tracking-wide text-white md:text-3xl">
              {project.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/60">{project.description}</p>
          </div>
          {(project.stars ?? 0) > 0 && (
            <span
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 font-mono text-sm text-white/60"
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
        <span className="rounded-lg bg-white/[0.06] px-3 py-1 font-mono text-xs text-white/60">
          {project.type}
        </span>
        {project.context && (
          <span className="rounded-lg bg-white/[0.04] px-3 py-1 font-mono text-xs text-white/55">
            {project.context}
          </span>
        )}
        {project.period && (
          <time
            dateTime={periodToDatetime(project.period) ?? project.period}
            className="rounded-lg bg-white/[0.04] px-3 py-1 font-mono text-xs text-white/55"
          >
            {project.period}
          </time>
        )}
      </div>

      {linkedExperience && (
        <div className="mb-6">
          <Link
            to="/"
            hash="experience"
            className="group flex items-center gap-4 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.06] focus-visible:border-white/10 focus-visible:bg-white/[0.06]"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-xs text-white/50">Work Experience</span>
              <span className="font-mono text-sm text-white/60 transition-colors group-hover:text-white/80 group-focus-visible:text-white/80">
                {linkedExperience.role}
                {linkedExperience.company ? ` at ${linkedExperience.company}` : ''}
              </span>
            </div>
            <span className="ml-auto font-mono text-xs text-white/50">
              {linkedExperience.period}
            </span>
            <ArrowRight
              size={14}
              className="shrink-0 text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-white/40 group-focus-visible:translate-x-0.5 group-focus-visible:text-white/40"
              aria-hidden="true"
            />
          </Link>
        </div>
      )}

      <ul className="mb-8 flex list-none flex-wrap gap-2">
        {project.tech.map((tech) => (
          <li
            key={tech}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1 font-mono text-xs text-white/70"
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
          <hr className="mb-10 border-white/10" />
          <article className="prose-project">
            <MarkdownRenderer content={project.readme} />
          </article>
        </>
      )}
    </div>
  )
}
