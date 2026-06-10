declare module 'virtual:content' {
  import type { Experience } from '~/content/experiences'
  import type { Project } from '~/content/projects'

  export const projects: Project[]
  export const experiences: Experience[]
}
