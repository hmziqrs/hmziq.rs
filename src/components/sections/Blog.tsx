import { ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { BlogPostCard } from '~/components/blog/BlogPostCard'
import { Section } from '~/components/layout/Section'
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
            <a
              href="https://blog.hmziq.rs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs text-white/60 backdrop-blur-sm transition-colors duration-300 hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:border-white/20 focus-visible:bg-white/10 focus-visible:text-white"
            >
              Read more on the blog
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>
        </>
      ) : (
        <p className="text-center font-mono text-xs text-white/55">
          Stay tuned — something is on the way.
        </p>
      )}
    </Section>
  )
}
