import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Feed } from 'feed'

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
    rss: `${siteUrl}/feed.xml`,
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
writeFileSync(join(publicDir, 'feed.xml'), feed.rss2())
console.log('Generated public/feed.xml')

// --- Write Atom 1.0 ---
writeFileSync(join(publicDir, 'atom.xml'), feed.atom1())
console.log('Generated public/atom.xml')

// --- Write sitemap.xml ---
const today = new Date().toISOString().split('T')[0]

const pages = [
  { loc: siteUrl, priority: '1.0', changefreq: 'daily' },
  // Add new pages here as the site grows, e.g.:
  // { loc: `${siteUrl}/about`, priority: '0.8', changefreq: 'monthly' },
  // { loc: `${siteUrl}/projects`, priority: '0.8', changefreq: 'weekly' },
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`

writeFileSync(join(publicDir, 'sitemap.xml'), sitemap)
console.log('Generated public/sitemap.xml')
