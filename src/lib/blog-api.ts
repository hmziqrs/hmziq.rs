import type { BlogPostSummary } from '~/types/blog'

const BLOG_API_BASE = 'https://blog.hmziq.rs/api'
const BLOG_BASE_URL = 'https://blog.hmziq.rs'

interface BlogPostsResponse {
  posts: BlogPostSummary[]
}

export async function fetchBlogPosts(): Promise<BlogPostSummary[]> {
  try {
    const res = await fetch(`${BLOG_API_BASE}/index.json`)
    if (!res.ok) return []
    const data: BlogPostsResponse = await res.json()
    return data.posts
  } catch {
    return []
  }
}

export function getBlogPostUrl(slug: string): string {
  return `${BLOG_BASE_URL}/posts/${slug}/`
}

export function formatBlogDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
