import { Link } from '@tanstack/react-router'

import { Section } from '~/components/Section'
import { experience } from '~/lib/content/Experience'
import { projects } from '~/lib/content/Projects'
import { periodToDatetime } from '~/lib/dateUtils'

export default function Experience() {
  const entries = experience.all

  return (
    <Section
      id="experience"
      heading="Experience"
      className="relative flex min-h-screen items-center justify-center px-6 py-20"
    >
      <ul className="relative ml-4 list-none border-l border-white/10 pl-8">
        {entries.map((exp) => {
          const linkedProjects = experience.getProjectsFor(exp, projects.all)

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
                  {exp.bullets.map((bullet, i) => (
                    <li
                      key={i}
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
