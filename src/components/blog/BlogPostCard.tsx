import { ExternalLink } from 'lucide-react'

import { GlassCard } from '~/components/ui/GlassCard'
import { formatBlogDate, getBlogPostUrl } from '~/lib/blog-api'
import type { BlogPostSummary } from '~/types/blog'

export function BlogPostCard({ post }: { post: BlogPostSummary }) {
  const postUrl = getBlogPostUrl(post.id)

  return (
    <li className="h-full">
      <a
        href={postUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${post.title} — ${post.description}`}
        className="block h-full"
      >
        <article aria-label={post.title}>
          <GlassCard className="flex h-full flex-col px-0 py-0">
            {post.cover && (
              <div className="overflow-hidden">
                <img
                  src={post.cover.src}
                  alt={post.cover_alt ?? ''}
                  loading="lazy"
                  width={post.cover.width}
                  height={post.cover.height}
                  className="aspect-video w-full object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
                />
              </div>
            )}

            <div className="flex flex-1 flex-col gap-3 px-6 py-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-mono text-sm font-semibold tracking-wide text-white">
                  {post.title}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <time className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] text-white/55">
                  {formatBlogDate(post.date)}
                </time>
                <span className="rounded-full border border-white/5 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] text-white/50">
                  {post.category}
                </span>
              </div>

              <p className="line-clamp-2 text-xs leading-relaxed text-white/60">
                {post.description}
              </p>

              <div className="mt-auto flex items-center gap-1 pt-1">
                <span className="font-mono text-[11px] text-white/50 transition-colors group-hover:text-white/60 group-focus-within:text-white/60">
                  Read post
                </span>
                <ExternalLink size={10} className="text-white/40" aria-hidden="true" />
              </div>
            </div>
          </GlassCard>
        </article>
        <span className="sr-only">(opens in new tab)</span>
      </a>
    </li>
  )
}
