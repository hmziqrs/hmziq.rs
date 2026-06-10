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

export const projects = projectsData as Project[]

export const projectTypes = [...new Set(projects.map((project) => project.type))]

export function findProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug)
}

export function getTopProjectsByStars(limit: number) {
  return projects
    .filter((project) => (project.stars ?? 0) > 0)
    .toSorted((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
    .slice(0, limit)
}
