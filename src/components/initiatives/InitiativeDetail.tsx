import { ExternalLink, Package, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

import { ProjectCard } from '~/components/projects/ProjectCard'
import { BackLink } from '~/components/ui/BackLink'
import { MarkdownRenderer } from '~/components/ui/MarkdownRenderer'
import { statusConfig, type Initiative, type InitiativeIconName } from '~/content/initiatives'
import { getProjectsByInitiative } from '~/content/projects'

const icons: Record<InitiativeIconName, ReactNode> = {
  package: <Package size={24} className="text-white/70" />,
  sparkles: <Sparkles size={24} className="text-white/70" />,
}

export function InitiativeDetail({ initiative }: { initiative: Initiative }) {
  const badge = statusConfig[initiative.status]
  const linkedProjects = getProjectsByInitiative(initiative.slug)

  return (
    <div>
      <div className="mb-8">
        <BackLink to="/initiatives">All initiatives</BackLink>
      </div>

      <div className="mb-8">
        <div className="flex items-start gap-4">
          <span className="mt-1 text-white/60" aria-hidden="true">
            {icons[initiative.iconName]}
          </span>
          <div>
            <h1 className="font-mono text-2xl font-bold tracking-wide text-white md:text-3xl">
              {initiative.name}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/60">{initiative.description}</p>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full border px-3 py-1 font-mono text-xs font-medium ${badge.className}`}
          aria-label={`Status: ${badge.label}`}
        >
          {badge.label}
        </span>
        {initiative.href && (
          <a
            href={initiative.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/6 px-4 py-2 font-mono text-xs text-white/60 transition-all duration-300 hover:bg-white/10 hover:text-white/80"
          >
            Visit website
            <ExternalLink size={12} aria-hidden="true" />
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        )}
      </div>

      {initiative.content && (
        <>
          <hr className="mb-10 border-white/10" />
          <article>
            <MarkdownRenderer content={initiative.content} headingOffset={1} />
          </article>
        </>
      )}

      {linkedProjects.length > 0 && (
        <>
          <hr className="my-10 border-white/10" />
          <section aria-label="Projects">
            <h2 className="mb-6 font-mono text-lg font-semibold text-white/80">Projects</h2>
            <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {linkedProjects.map((project) => (
                <li key={project.slug}>
                  <ProjectCard project={project} headingLevel="h3" />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
