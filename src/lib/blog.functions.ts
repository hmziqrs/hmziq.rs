import { createServerFn } from '@tanstack/react-start'

import { fetchBlogPosts } from './blog-api'

export const getBlogPosts = createServerFn({ method: 'GET' }).handler(async () => {
  return fetchBlogPosts()
})
