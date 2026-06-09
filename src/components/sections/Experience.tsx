import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'

import { useSectionVariants } from '~/hooks/useSectionVariants'
import { experience } from '~/lib/content/Experience'
import { projects } from '~/lib/content/Projects'

export default function Experience() {
  const { containerVariants, itemVariants } = useSectionVariants({
    containerDuration: 0.8,
    staggerChildren: 0.1,
    itemDuration: 0.4,
    itemY: 20,
    ease: [0.25, 0.1, 0.25, 1.0],
  })

  const entries = experience.all

  return (
    <section
      id="experience"
      className="relative flex min-h-screen items-center justify-center px-6 py-20"
      aria-label="Work Experience"
    >
      <motion.div
        className="mx-auto w-full max-w-6xl"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        <motion.h2
          variants={itemVariants}
          className="mb-10 text-center font-mono text-lg font-semibold tracking-wider text-white/80"
        >
          Experience
        </motion.h2>

        <div className="relative ml-4 border-l border-white/10 pl-8">
          {entries.map((exp) => {
            const linkedProjects = experience.getProjectsFor(exp, projects.all)

            return (
              <motion.div
                key={exp.slug}
                variants={itemVariants}
                className="group relative mb-8 last:mb-0 rounded-lg border border-white/2 bg-white/3 p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-white/1"
              >
                {/* Timeline dot */}
                <div className="absolute -left-[41px] top-7 h-3 w-3 rounded-full border-2 border-white/30 bg-black" />

                {/* Header */}
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-mono text-base font-semibold text-white/80">
                      {exp.company ?? exp.role}
                    </h3>
                    {exp.company && (
                      <p className="text-sm text-white/65">{exp.role}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-white/55">
                    {exp.period}
                  </span>
                </div>

                {/* Description */}
                <p className="mb-3 text-sm leading-relaxed text-white/65">
                  {exp.description}
                </p>

                {/* Bullets */}
                <ul className="mb-4 space-y-1.5">
                  {exp.bullets.map((bullet, i) => (
                    <li
                      key={i}
                      className="pl-4 text-xs leading-relaxed text-white/55 before:-ml-4 before:mr-2 before:text-white/40 before:content-['-']"
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
                        className="inline-flex items-center rounded-full border border-white/5 bg-white/5 px-3 py-1 font-mono text-[11px] text-white/55 transition-all duration-200 hover:border-white/15 hover:text-white/75"
                      >
                        {project.title}
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </section>
  )
}
