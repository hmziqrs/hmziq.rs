import { rmSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

import { Feed } from 'feed'
import { EnumChangefreq, SitemapStream } from 'sitemap'

import { fetchBlogPosts } from '../src/lib/blog-api'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

// --- Feed metadata ---
const siteUrl = 'https://hmziq.rs'
const blogUrl = 'https://blog.hmziq.rs'
const author = { name: 'hmziqrs', email: 'hmziqrs@gmail.com', link: siteUrl }

const feed = new Feed({
  title: 'hmziq.rs',
  description: 'Site updates, changelog, and blog posts from hmziq.rs',
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

// --- Feed entries ---

// Site launch entry
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

// Blog posts from blog.hmziq.rs
try {
  const blogPosts = await fetchBlogPosts()
  for (const post of blogPosts) {
    const postUrl = `${blogUrl}/posts/${post.id}/`
    feed.addItem({
      title: post.title,
      id: postUrl,
      link: postUrl,
      description: post.description,
      date: new Date(post.date),
      category: [{ name: post.category }, ...post.tags.map((tag) => ({ name: tag }))],
    })
  }

  // Update feed timestamp to most recent post
  if (blogPosts.length > 0) {
    const latestDate = blogPosts.reduce((latest, post) => {
      const d = new Date(post.updated ?? post.date)
      return d > latest ? d : latest
    }, new Date(0))
    if (latestDate > new Date(feed.options.updated as string)) {
      feed.options.updated = latestDate
    }
  }

  console.log(`Added ${blogPosts.length} blog post(s) to feed`)
} catch (e) {
  console.warn('Failed to fetch blog posts for feed:', e)
}

// --- Write RSS 2.0 ---
writeFileSync(join(publicDir, 'rss.xml'), feed.rss2())
console.log('Generated public/rss.xml')

// --- Write Atom 1.0 ---
writeFileSync(join(publicDir, 'atom.xml'), feed.atom1())
console.log('Generated public/atom.xml')

// --- Write sitemap ---
rmSync(join(publicDir, 'sitemaps'), { recursive: true, force: true })
for (const f of ['sitemap-index.xml', 'sitemap-0.xml']) {
  try {
    rmSync(join(publicDir, f))
  } catch {}
}

const pages = [
  { url: '/', changefreq: EnumChangefreq.DAILY, priority: 1.0 },
  { url: '/projects', changefreq: EnumChangefreq.WEEKLY, priority: 0.8 },
]

const chunks: Buffer[] = []
const smStream = new SitemapStream({ hostname: siteUrl })
const collect = new Writable({
  write(chunk, _encoding, callback) {
    chunks.push(chunk)
    callback
    callback()
  },
})

const done = pipeline(smStream, collect)
for (const page of pages) {
  smStream.write({ url: page.url, changefreq: page.changefreq, priority: page.priority })
}
smStream.end()
await done

writeFileSync(join(publicDir, 'sitemap.xml'), Buffer.concat(chunks).toString())
console.log('Generated public/sitemap.xml')
