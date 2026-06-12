import { queryOptions } from '@tanstack/react-query'

import { getBlogPosts } from './blog.functions'

export const blogPostsQuery = queryOptions({
  queryKey: ['blog-posts'],
  queryFn: () => getBlogPosts(),
  staleTime: 1000 * 60 * 5,
})
