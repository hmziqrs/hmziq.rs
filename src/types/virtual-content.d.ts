declare module 'virtual:content' {
  import type { Project } from '~/lib/content/Projects'
  import type { Experience } from '~/lib/content/Experience'

  export const projects: Project[]
  export const experiences: Experience[]
}
