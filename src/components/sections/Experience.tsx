import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { Section } from '~/components/layout/Section'
import { Button } from '~/components/ui/Button'
import { Card } from '~/components/ui/Card'
import { Tag } from '~/components/ui/Tag'
import { experiences, type Experience, getExperienceProjects } from '~/content/experiences'
import { projects } from '~/content/projects'
import { periodToDatetime } from '~/lib/dateUtils'

function parsePeriodStart(period: string): number {
  const match = period.match(/^(\w{3})\s(\d{4})/)
  if (!match) return 0
  const months: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  }
  return new Date(+match[2], months[match[1]] ?? 0).getTime()
}

function ExperienceCard({ exp }: { exp: Experience }) {
  const [expanded, setExpanded] = useState(false)
  const linkedProjects = getExperienceProjects(exp, projects)

  return (
    <li className="group relative mb-8 last:mb-0">
      <Card
        variant="glass"
        padding="lg"
        className="focus-within:bg-surface-raised hover:bg-surface-raised transition-colors duration-300"
      >
        <article>
          {/* Timeline dot */}
          <div
            className="border-border-subtle absolute top-7 -left-10.25 h-3 w-3 rounded-full border-2 bg-black"
            aria-hidden="true"
          />

          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-fg-heading font-mono text-base font-semibold">
                {exp.company ?? exp.role}
              </h3>
              {exp.company && <p className="text-fg-body text-sm">{exp.role}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Tag as="time" size="sm" dateTime={periodToDatetime(exp.period) ?? exp.period}>
                {exp.period}
              </Tag>
              <Button
                variant="solid"
                size="sm"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-label={`${expanded ? 'Collapse' : 'Expand'} details for ${exp.company ?? exp.role}`}
                className="h-7 w-7 rounded-md"
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </Button>
            </div>
          </div>

          {/* Description */}
          <p className="text-fg-body mt-3 mb-3 text-sm leading-relaxed">{exp.description}</p>

          {/* Collapsible details */}
          <div
            className={`grid transition-all duration-200 ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
          >
            <div className="overflow-hidden">
              {/* Bullets */}
              <ul className="mt-3 mb-4 space-y-1.5">
                {exp.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="text-fg-body before:text-fg-secondary pl-4 text-xs leading-relaxed before:mr-2 before:-ml-4 before:content-['-']"
                  >
                    {bullet}
                  </li>
                ))}
              </ul>

              {/* Linked project chips */}
              {linkedProjects.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {linkedProjects.map((project) => (
                    <Button
                      key={project.slug}
                      variant="ghost"
                      size="sm"
                      to="/projects/$slug"
                      params={{ slug: project.slug }}
                      aria-label={`View ${project.title} project`}
                      className="text-caption text-fg-secondary rounded-full px-4 py-2"
                    >
                      {project.title}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>
      </Card>
    </li>
  )
}

export default function Experience() {
  const sorted = [...experiences].sort(
    (a, b) => parsePeriodStart(b.period) - parsePeriodStart(a.period)
  )

  return (
    <Section
      id="experience"
      heading="Experience"
      className="relative flex min-h-screen items-center justify-center px-6 py-20"
    >
      <ul className="border-border-default relative ml-4 list-none border-l pl-8">
        {sorted.map((exp) => (
          <ExperienceCard key={exp.slug} exp={exp} />
        ))}
      </ul>
    </Section>
  )
}
