import { projects as projectsData } from 'virtual:content'

export interface ProjectLink {
  github?: string
  web?: string
  playStore?: string
  appStore?: string
  npm?: string
  crates?: string
}

export interface Project {
  title: string
  slug: string
  description: string
  type: 'open-source' | 'product' | 'freelance' | 'contract'
  tech: string[]
  stars?: number
  forks?: number
  language?: string
  lastPushed?: string
  links?: ProjectLink
  context?: string
  period?: string
  readme?: string
  experienceSlug?: string
}

class ProjectsManager {
  private readonly projects: Project[] = projectsData as Project[]

  get all(): Project[] {
    return this.projects
  }

  findBySlug(slug: string): Project | undefined {
    return this.projects.find((p) => p.slug === slug)
  }

  topByStars(n: number): Project[] {
    return [...this.projects]
      .filter((p) => p.stars && p.stars > 0)
      .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
      .slice(0, n)
  }

  get types(): Project['type'][] {
    return [...new Set(this.projects.map((p) => p.type))]
  }
}

export const projects = new ProjectsManager()
