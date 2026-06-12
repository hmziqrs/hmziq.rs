import { Link } from '@tanstack/react-router'

import { Section } from '~/components/layout/Section'
import { experiences, getExperienceProjects } from '~/content/experiences'
import { projects } from '~/content/projects'
import { periodToDatetime } from '~/lib/dateUtils'

function parsePeriodStart(period: string): number {
  const match = period.match(/^(\w{3})\s(\d{4})/)
  if (!match) return 0
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  }
  return new Date(+match[2], months[match[1]] ?? 0).getTime()
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
      <ul className="relative ml-4 list-none border-l border-white/10 pl-8">
        {sorted.map((exp) => {
          const linkedProjects = getExperienceProjects(exp, projects)

          return (
            <li
              key={exp.slug}
              className="group relative mb-8 rounded-lg border border-white/2 bg-white/3 p-6 backdrop-blur-sm transition-all duration-300 last:mb-0 focus-within:border-white/10 focus-within:bg-white/1 hover:border-white/10 hover:bg-white/1"
            >
              <article>
                {/* Timeline dot */}
                <div
                  className="absolute top-7 -left-[41px] h-3 w-3 rounded-full border-2 border-white/30 bg-black"
                  aria-hidden="true"
                />

                {/* Header */}
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-mono text-base font-semibold text-white/80">
                      {exp.company ?? exp.role}
                    </h3>
                    {exp.company && <p className="text-sm text-white/65">{exp.role}</p>}
                  </div>
                  <time
                    className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-white/65"
                    dateTime={periodToDatetime(exp.period) ?? exp.period}
                  >
                    {exp.period}
                  </time>
                </div>

                {/* Description */}
                <p className="mb-3 text-sm leading-relaxed text-white/65">{exp.description}</p>

                {/* Bullets */}
                <ul className="mb-4 space-y-1.5">
                  {exp.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="pl-4 text-xs leading-relaxed text-white/65 before:mr-2 before:-ml-4 before:text-white/55 before:content-['-']"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>

                {/* Linked project chips */}
                {linkedProjects.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {linkedProjects.map((project) => (
                      <Link
                        key={project.slug}
                        to="/projects/$slug"
                        params={{ slug: project.slug }}
                        aria-label={`View ${project.title} project`}
                        className="inline-flex items-center rounded-full border border-white/5 bg-white/5 px-4 py-2 font-mono text-[11px] text-white/55 transition-all duration-200 hover:border-white/15 hover:text-white/75 focus-visible:border-white/15 focus-visible:text-white/75"
                      >
                        {project.title}
                      </Link>
                    ))}
                  </div>
                )}
              </article>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
