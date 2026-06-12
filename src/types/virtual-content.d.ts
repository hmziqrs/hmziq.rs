declare module 'virtual:content' {
  import type { BlogPostSummary } from '~/types/blog'
  import type { Experience } from '~/content/experiences'
  import type { Project } from '~/content/projects'

  export const projects: Project[]
  export const experiences: Experience[]
  export const blogPosts: BlogPostSummary[]
}
