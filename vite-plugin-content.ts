import fs from 'node:fs'
import path from 'node:path'

import matter from 'gray-matter'
import type { Plugin } from 'vite'

const VIRTUAL_ID = 'virtual:content'
const RESOLVED_ID = '\0' + VIRTUAL_ID

interface ContentOptions {
  projectsDir?: string
  experiencesDir?: string
}

export function contentPlugin(options: ContentOptions = {}): Plugin {
  const projectsDir = path.resolve(process.cwd(), options.projectsDir ?? 'content/projects')
  const experiencesDir = path.resolve(
    process.cwd(),
    options.experiencesDir ?? 'content/experiences'
  )

  function loadCollection(dir: string, fileName: string) {
    if (!fs.existsSync(dir)) return []

    const collection = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue

      const filePath = path.join(dir, entry.name, fileName)
      if (!fs.existsSync(filePath)) continue

      const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'))
      collection.push({ ...data, readme: content.trim() })
    }
    return collection
  }

  return {
    name: 'content-loader',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    load(id) {
      if (id !== RESOLVED_ID) return

      const projects = loadCollection(projectsDir, 'project.mdx')
      const experiences = loadCollection(experiencesDir, 'experience.mdx')

      return [
        `export const projects = ${JSON.stringify(projects)};`,
        `export const experiences = ${JSON.stringify(experiences)};`,
      ].join('\n')
    },
    // Rebuild when content files change
    handleHotUpdate({ file, server }) {
      const normalized = path.normalize(file)
      const isProject = normalized.includes(path.normalize('content/projects/'))
      const isExperience = normalized.includes(path.normalize('content/experiences/'))

      if (isProject || isExperience) {
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) {
          server.moduleGraph.invalidateModule(mod)
          return [mod]
        }
      }
    },
  }
}
