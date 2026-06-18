import { ExternalLink, Package, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

import { ProjectCard } from '~/components/projects/ProjectCard'
import { BackLink } from '~/components/ui/BackLink'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { MarkdownRenderer } from '~/components/ui/MarkdownRenderer'
import { Tag } from '~/components/ui/Tag'
import { statusConfig, type Initiative, type InitiativeIconName } from '~/content/initiatives'
import { getProjectsByInitiative } from '~/content/projects'

const icons: Record<InitiativeIconName, ReactNode> = {
  package: <Package size={24} className="text-fg-link" />,
  sparkles: <Sparkles size={24} className="text-fg-link" />,
}

export function InitiativeDetail({ initiative }: { initiative: Initiative }) {
  const badge = statusConfig[initiative.status]
  const linkedProjects = getProjectsByInitiative(initiative.slug)

  return (
    <div>
      <div className="mb-8">
        <BackLink to="/initiatives">All initiatives</BackLink>
      </div>

      <Card variant="glass" padding="lg" className="mb-8">
        <div className="flex items-start gap-4">
          <span className="text-fg-meta mt-1" aria-hidden="true">
            {icons[initiative.iconName]}
          </span>
          <div>
            <h1 className="text-fg-primary font-mono text-2xl font-bold tracking-wide md:text-3xl">
              {initiative.name}
            </h1>
            <p className="text-fg-link mt-2 text-sm leading-relaxed">{initiative.description}</p>
          </div>
        </div>
      </Card>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Tag variant="status" status={badge.status} size="md" aria-label={`Status: ${badge.label}`}>
          {badge.label}
        </Tag>
        {initiative.href && (
          <Button
            variant="ghost"
            size="md"
            href={initiative.href}
            external
            trailingIcon={<ExternalLink size={12} aria-hidden="true" />}
          >
            Visit website
          </Button>
        )}
      </div>

      {initiative.content && (
        <>
          <hr className="border-border-default mb-10" />
          <article>
            <MarkdownRenderer content={initiative.content} headingOffset={1} />
          </article>
        </>
      )}

      {linkedProjects.length > 0 && (
        <>
          <hr className="border-border-default my-10" />
          <section aria-label="Projects">
            <h2 className="text-fg-heading mb-6 font-mono text-lg font-semibold">Projects</h2>
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
