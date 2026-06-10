import { experiences as experienceData } from 'virtual:content'

import type { Project } from './projects'

export interface Experience {
  slug: string
  company?: string
  role: string
  period: string
  description: string
  bullets: string[]
  projectSlugs: string[]
}

export const experiences = experienceData as Experience[]

export function findExperienceBySlug(slug: string) {
  return experiences.find((experience) => experience.slug === slug)
}

export function getExperienceProjects(experience: Experience, projects: Project[]) {
  const projectSlugs = new Set(experience.projectSlugs)
  return projects.filter((project) => projectSlugs.has(project.slug))
}
