import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { ProjectCard } from '~/components/ProjectCard'
import { Section } from '~/components/Section'
import { projects } from '~/lib/content/Projects'

export default function Projects() {
  const topProjects = projects.topByStars(6)

  return (
    <Section
      id="projects"
      heading="Featured Projects"
      className="relative flex min-h-screen items-center justify-center px-6 py-20"
    >
      <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topProjects.map((project) => (
          <li key={project.slug}>
            <ProjectCard project={project} headingLevel="h3" />
          </li>
        ))}
      </ul>

      <div className="mt-10 text-center">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] px-6 py-3 font-mono text-sm text-white/70 backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.1] hover:text-white focus-visible:bg-white/[0.1] focus-visible:text-white"
        >
          View all projects
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </Section>
  )
}
