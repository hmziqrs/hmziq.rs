import { ArrowRight } from 'lucide-react'

import { Section } from '~/components/layout/Section'
import { ProjectCard } from '~/components/projects/ProjectCard'
import { Button } from '~/components/ui/Button'
import { getTopProjectsByStars } from '~/content/projects'

export default function Projects() {
  const topProjects = getTopProjectsByStars(6)

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
        <Button variant="ghost" size="lg" to="/projects" trailingIcon={<ArrowRight size={16} />}>
          View all projects
        </Button>
      </div>
    </Section>
  )
}
