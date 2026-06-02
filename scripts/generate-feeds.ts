import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Feed } from 'feed'
import { simpleSitemapAndIndex } from 'sitemap'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

// --- Feed metadata ---
const siteUrl = 'https://hmziq.rs'
const author = { name: 'hmziqrs', email: 'hmziqrs@gmail.com', link: siteUrl }

const feed = new Feed({
  title: 'hmziq.rs',
  description: 'Site updates, changelog, and announcements from hmziq.rs',
  id: siteUrl,
  link: siteUrl,
  language: 'en',
  copyright: `All rights reserved ${new Date().getFullYear()}, hmziqrs`,
  updated: new Date('2026-06-02T00:00:00Z'),
  feedLinks: {
    rss: `${siteUrl}/rss.xml`,
    atom: `${siteUrl}/atom.xml`,
  },
  author,
})

feed.addCategory('Technology')

// --- Feed entries (manually maintained) ---
feed.addItem({
  title: 'hmziq.rs — Site Launch',
  id: `${siteUrl}/#2026-06-02-site-launch`,
  link: siteUrl,
  description:
    'Portfolio site launched with React, TanStack Start, Rust/WASM, and Tailwind CSS v4.',
  content:
    '<p>Portfolio site launched with React, TanStack Start, Rust/WebAssembly, and Tailwind CSS v4 — featuring a space-themed 3D star field and parallax animations.</p>',
  date: new Date('2026-06-02T00:00:00Z'),
  category: [{ name: 'Site Update' }],
})

// --- Write RSS 2.0 ---
writeFileSync(join(publicDir, 'rss.xml'), feed.rss2())
console.log('Generated public/rss.xml')

// --- Write Atom 1.0 ---
writeFileSync(join(publicDir, 'atom.xml'), feed.atom1())
console.log('Generated public/atom.xml')

// --- Write sitemap (index + sharded) ---
const sitemapRelDir = 'public/sitemaps'
const sitemapAbsDir = join(__dirname, '..', sitemapRelDir)
rmSync(sitemapAbsDir, { recursive: true, force: true })
mkdirSync(sitemapAbsDir, { recursive: true })

const pages = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  // Add new pages here as the site grows, e.g.:
  // { url: '/about', changefreq: 'monthly', priority: 0.8 },
  // { url: '/projects', changefreq: 'weekly', priority: 0.8 },
]

await simpleSitemapAndIndex({
  hostname: siteUrl,
  destinationDir: sitemapRelDir,
  publicBasePath: '/sitemaps/',
  limit: 5000,
  gzip: false,
  sourceData: pages,
})

console.log('Generated sitemap index + sharded sitemaps in public/sitemaps/')
