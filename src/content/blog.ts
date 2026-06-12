import { blogPosts as blogPostsData } from 'virtual:content'

import type { BlogPostSummary } from '~/types/blog'

export const blogPosts = blogPostsData as BlogPostSummary[]

export function getRecentPosts(limit: number): BlogPostSummary[] {
  return [...blogPosts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit)
}
