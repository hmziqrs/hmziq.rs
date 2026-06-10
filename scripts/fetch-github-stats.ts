#!/usr/bin/env bun
/**
 * Fetches latest GitHub stats for all projects with a GitHub link.
 * Updates each project directory's project.mdx frontmatter in place.
 *
 * Usage: bun run scripts/fetch-github-stats.ts
 */

import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import matter from 'gray-matter'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = resolve(__dirname, '../content/projects')

interface GitHubStats {
  stargazerCount: number
  forkCount: number
  issues: { totalCount: number }
  primaryLanguage: { name: string } | null
  pushedAt: string
  updatedAt: string
  homepageUrl: string
}

function extractRepoPath(githubUrl: string): string | null {
  const match = githubUrl.match(/github\.com\/([^/]+\/[^/]+)/)
  return match?.[1] ?? null
}

function fetchStats(repo: string): GitHubStats | null {
  try {
    const raw = execSync(
      `gh repo view "${repo}" --json stargazerCount,forkCount,issues,primaryLanguage,pushedAt,updatedAt,homepageUrl`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    )
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function main() {
  const dirs = readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  console.log(`Found ${dirs.length} project directories\n`)

  let updated = 0
  let failed = 0
  let skipped = 0

  for (const dir of dirs) {
    const filePath = join(CONTENT_DIR, dir, 'project.mdx')
    if (!existsSync(filePath)) {
      console.log(`  ⊘ ${dir.padEnd(30)} — no project.mdx`)
      skipped++
      continue
    }

    const raw = readFileSync(filePath, 'utf-8')
    const { data: frontmatter, content } = matter(raw)
    const githubUrl = frontmatter.links?.github as string | undefined

    if (!githubUrl) {
      console.log(`  ⊘ ${dir.padEnd(30)} — no GitHub link`)
      skipped++
      continue
    }

    const repo = extractRepoPath(githubUrl)
    if (!repo) {
      console.log(`  ✗ ${dir.padEnd(30)} — invalid GitHub URL`)
      failed++
      continue
    }

    const stats = fetchStats(repo)
    if (!stats) {
      console.log(`  ✗ ${dir.padEnd(30)} — repo not found or private`)
      failed++
      continue
    }

    frontmatter.stars = stats.stargazerCount
    frontmatter.forks = stats.forkCount
    frontmatter.language = stats.primaryLanguage?.name
    frontmatter.lastPushed = stats.pushedAt

    if (stats.homepageUrl) {
      frontmatter.links = frontmatter.links ?? {}
      frontmatter.links.web = stats.homepageUrl
    }

    const output = matter.stringify(content, frontmatter)
    writeFileSync(filePath, output)

    console.log(
      `  ✓ ${dir.padEnd(30)} ★ ${String(stats.stargazerCount).padStart(4)}  ⑂ ${String(stats.forkCount).padStart(3)}  ${stats.primaryLanguage?.name ?? '—'}`
    )
    updated++
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed, ${skipped} skipped`)
}

main()
