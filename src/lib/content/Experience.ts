import { experiences as experienceData } from 'virtual:content'

import type { Project } from './Projects'

export interface Experience {
  slug: string
  company?: string
  role: string
  period: string
  description: string
  bullets: string[]
  projectSlugs: string[]
}

class ExperienceManager {
  private readonly experiences: Experience[] = experienceData as Experience[]

  get all(): Experience[] {
    return this.experiences
  }

  findBySlug(slug: string): Experience | undefined {
    return this.experiences.find((e) => e.slug === slug)
  }

  getProjectsFor(experience: Experience, allProjects: Project[]): Project[] {
    return experience.projectSlugs
      .map((slug) => allProjects.find((p) => p.slug === slug))
      .filter((p): p is Project => p !== undefined)
  }
}

export const experience = new ExperienceManager()
