#!/usr/bin/env bun
/**
 * Fetches latest GitHub stats for all projects with a GitHub link.
 * Updates src/content/data/projects.json in place.
 *
 * Usage: bun run scripts/fetch-github-stats.ts
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const PROJECTS_PATH = resolve(import.meta.dir, '../src/content/data/projects.json')

interface GitHubStats {
  stargazerCount: number
  forkCount: number
  issues: { totalCount: number }
  primaryLanguage: { name: string } | null
  pushedAt: string
  updatedAt: string
}

interface ProjectData {
  title: string
  slug: string
  description: string
  type: string
  tech: string[]
  stars?: number
  forks?: number
  language?: string
  lastPushed?: string
  links?: {
    github?: string
    web?: string
    playStore?: string
    appStore?: string
    npm?: string
    crates?: string
  }
  context?: string
  period?: string
  readme?: string
}

function extractRepoPath(githubUrl: string): string | null {
  const match = githubUrl.match(/github\.com\/([^/]+\/[^/]+)/)
  return match?.[1] ?? null
}

function fetchStats(repo: string): GitHubStats | null {
  try {
    const raw = execSync(
      `gh repo view "${repo}" --json stargazerCount,forkCount,issues,primaryLanguage,pushedAt,updatedAt`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    )
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function main() {
  const data: ProjectData[] = JSON.parse(readFileSync(PROJECTS_PATH, 'utf-8'))
  const withGithub = data.filter((p) => p.links?.github)

  console.log(`Found ${withGithub.length} projects with GitHub links\n`)

  let updated = 0
  let failed = 0

  for (const project of withGithub) {
    const repo = extractRepoPath(project.links!.github!)
    if (!repo) {
      console.log(`  ✗ ${project.slug} — invalid GitHub URL`)
      failed++
      continue
    }

    const stats = fetchStats(repo)
    if (!stats) {
      console.log(`  ✗ ${project.slug} — repo not found or private`)
      failed++
      continue
    }

    project.stars = stats.stargazerCount
    project.forks = stats.forkCount
    project.language = stats.primaryLanguage?.name
    project.lastPushed = stats.pushedAt

    console.log(
      `  ✓ ${project.slug.padEnd(30)} ★ ${String(stats.stargazerCount).padStart(4)}  ⑂ ${String(stats.forkCount).padStart(3)}  ${stats.primaryLanguage?.name ?? '—'}`
    )
    updated++
  }

  // Sort by stars descending for consistent output
  data.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))

  writeFileSync(PROJECTS_PATH, JSON.stringify(data, null, 2) + '\n')

  console.log(`\nDone: ${updated} updated, ${failed} failed`)
}

main()
