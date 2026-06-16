declare module 'virtual:content' {
  import type { Experience } from '~/content/experiences'
  import type { Project } from '~/content/projects'
  import type { BlogPostSummary } from '~/types/blog'

  export const projects: Project[]
  export const experiences: Experience[]
  export const blogPosts: BlogPostSummary[]
}
