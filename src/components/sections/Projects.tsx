import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

import { ProjectCard } from '~/components/ProjectCard'
import { useSectionVariants } from '~/hooks/useSectionVariants'
import { projects } from '~/lib/content/Projects'

export default function Projects() {
  const { containerVariants, itemVariants } = useSectionVariants({
    containerDuration: 0.8,
    staggerChildren: 0.1,
    itemDuration: 0.4,
    itemY: 20,
    ease: [0.25, 0.1, 0.25, 1.0],
  })

  const topProjects = projects.topByStars(6)

  return (
    <section
      id="projects"
      className="relative flex min-h-screen items-center justify-center px-6 py-20"
      aria-label="Featured Projects"
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
          Featured Projects
        </motion.h2>

        <ul role="list" className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topProjects.map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} variants={itemVariants} headingLevel="h3" />
            </li>
          ))}
        </ul>

        <motion.div variants={itemVariants} className="mt-10 text-center">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-6 py-3 font-mono text-sm text-white/70 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.1] hover:text-white focus-visible:bg-white/[0.1] focus-visible:text-white"
          >
            View all projects
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  )
}
