import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'

import { BlogPostCard } from '~/components/blog/BlogPostCard'
import { Section } from '~/components/layout/Section'
import { Button } from '~/components/ui/Button'
import { getRecentPosts } from '~/content/blog'
import { blogPostsQuery } from '~/lib/blog-queries'

export default function Blog() {
  const buildTimePosts = getRecentPosts(3)

  const { data: posts } = useQuery({
    ...blogPostsQuery,
    initialData: buildTimePosts,
    refetchOnMount: false,
  })

  const hasPosts = posts && posts.length > 0

  return (
    <Section
      id="blog"
      heading="Blog"
      className="relative flex items-center justify-center px-6 py-20"
    >
      {hasPosts ? (
        <>
          <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.slice(0, 3).map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </ul>
          <div className="mt-8 text-center">
            <Button
              variant="ghost"
              size="md"
              href="https://blog.hmziq.rs"
              external
              trailingIcon={<ExternalLink size={12} aria-hidden="true" />}
            >
              Read more on the blog
            </Button>
          </div>
        </>
      ) : (
        <p className="text-fg-secondary text-center font-mono text-xs">
          Stay tuned — something is on the way.
        </p>
      )}
    </Section>
  )
}
