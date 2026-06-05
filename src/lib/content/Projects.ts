import projectsData from '~/content/data/projects.json'

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
  links?: ProjectLink
  context?: string
}

class ProjectsManager {
  private readonly projects: Project[] = projectsData as Project[]

  get all(): Project[] {
    return this.projects
  }

  topByStars(n: number): Project[] {
    return [...this.projects]
      .filter((p) => p.stars && p.stars > 0)
      .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
      .slice(0, n)
  }

  filterBySkill(skill: string): Project[] {
    const lower = skill.toLowerCase()
    return this.projects.filter((p) => p.tech.some((t) => t.toLowerCase() === lower))
  }

  filterByType(type: Project['type']): Project[] {
    return this.projects.filter((p) => p.type === type)
  }

  filter(tech?: string[], type?: Project['type']): Project[] {
    let result = this.projects
    if (tech && tech.length > 0) {
      const lowerTech = tech.map((t) => t.toLowerCase())
      result = result.filter((p) => p.tech.some((t) => lowerTech.includes(t.toLowerCase())))
    }
    if (type) {
      result = result.filter((p) => p.type === type)
    }
    return result
  }

  get skills(): string[] {
    const set = new Set<string>()
    for (const p of this.projects) {
      for (const t of p.tech) {
        set.add(t)
      }
    }
    return [...set].sort()
  }

  get types(): Project['type'][] {
    return [...new Set(this.projects.map((p) => p.type))]
  }

  primaryLink(project: Project): string | undefined {
    if (!project.links) return undefined
    return (
      project.links.github ??
      project.links.web ??
      project.links.playStore ??
      project.links.appStore ??
      project.links.npm ??
      project.links.crates
    )
  }
}

export const projects = new ProjectsManager()
