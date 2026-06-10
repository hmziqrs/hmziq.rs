declare module 'virtual:content' {
  import type { Experience } from '~/lib/content/Experience'
  import type { Project } from '~/lib/content/Projects'

  export const projects: Project[]
  export const experiences: Experience[]
}
