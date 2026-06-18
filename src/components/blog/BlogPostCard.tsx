import { ExternalLink } from 'lucide-react'

import { Card } from '~/components/ui/Card'
import { Tag } from '~/components/ui/Tag'
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
          <Card variant="glass" interactive className="flex h-full flex-col px-0 py-0">
            {post.cover && (
              <div className="overflow-hidden">
                <img
                  src={post.cover.src}
                  alt={post.cover_alt ?? ''}
                  loading="lazy"
                  width={post.cover.width}
                  height={post.cover.height}
                  className="aspect-video w-full object-cover opacity-80 transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100"
                />
              </div>
            )}

            <div className="flex flex-1 flex-col gap-3 px-6 py-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-fg-primary font-mono text-sm font-semibold tracking-wide">
                  {post.title}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Tag as="time" size="sm" dateTime={post.date}>
                  {formatBlogDate(post.date)}
                </Tag>
                <Tag size="sm">{post.category}</Tag>
              </div>

              <p className="text-fg-link line-clamp-2 text-xs leading-relaxed">
                {post.description}
              </p>

              <div className="mt-auto flex items-center gap-1 pt-1">
                <span className="text-caption text-fg-secondary group-focus-within:text-fg-heading group-hover:text-fg-heading font-mono transition-colors">
                  Read post
                </span>
                <ExternalLink size={10} className="text-fg-muted" aria-hidden="true" />
              </div>
            </div>
          </Card>
        </article>
        <span className="sr-only">(opens in new tab)</span>
      </a>
    </li>
  )
}
