import Markdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'

interface MarkdownRendererProps {
  content: string
  /**
   * Number of levels to shift rendered heading tags down.
   * Set to `1` when rendered under a page-level <h1> so that
   * markdown headings start at <h2> and the document outline
   * stays sequential (WCAG 1.3.1).
   */
  headingOffset?: number
}

export function MarkdownRenderer({ content, headingOffset = 0 }: MarkdownRendererProps) {
  const shift = (level: number) =>
    ('h' + Math.min(6, Math.max(1, level + headingOffset))) as
      | 'h1'
      | 'h2'
      | 'h3'
      | 'h4'
      | 'h5'
      | 'h6'
  return (
    <Markdown
      rehypePlugins={[rehypeRaw]}
      components={{
        h1: ({ children }) => {
          const Tag = shift(1)
          return (
            <Tag className="mt-8 mb-4 font-mono text-xl font-bold text-white first:mt-0">
              {children}
            </Tag>
          )
        },
        h2: ({ children }) => {
          const Tag = shift(2)
          return (
            <Tag className="mt-6 mb-3 font-mono text-lg font-semibold text-white/90">
              {children}
            </Tag>
          )
        },
        h3: ({ children }) => {
          const Tag = shift(3)
          return (
            <Tag className="mt-5 mb-2 font-mono text-base font-semibold text-white/80">
              {children}
            </Tag>
          )
        },
        h4: ({ children }) => {
          const Tag = shift(4)
          return (
            <Tag className="mt-4 mb-2 font-mono text-sm font-semibold text-white/70">
              {children}
            </Tag>
          )
        },
        p: ({ children }) => (
          <p className="mb-3 text-sm leading-relaxed text-white/60">{children}</p>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 underline underline-offset-4 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {children}
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-white/80">{children}</strong>
        ),
        em: ({ children }) => <em className="text-white/60 italic">{children}</em>,
        ul: ({ children }) => (
          <ul className="mb-3 ml-4 list-disc space-y-1 text-sm text-white/60">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 ml-4 list-decimal space-y-1 text-sm text-white/60">{children}</ol>
        ),
        li: ({ children }) => <li className="pl-1">{children}</li>,
        code: ({ className, children }) => {
          const isInline = !className
          if (isInline) {
            return (
              <code className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-xs text-white/70">
                {children}
              </code>
            )
          }
          return <code className={className}>{children}</code>
        },
        pre: ({ children }) => (
          <pre className="mb-4 overflow-x-auto rounded-lg bg-white/4 p-4 text-xs">{children}</pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-l-2 border-white/20 pl-4 text-sm text-white/55 italic">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-6 border-white/10" />,
        table: ({ children }) => (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="border-b border-white/10">{children}</thead>,
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-mono text-xs font-semibold text-white/70">
            {children}
          </th>
        ),
        td: ({ children }) => <td className="px-3 py-2 text-xs text-white/60">{children}</td>,
        img: ({ src, alt, width, height }) => (
          <img
            src={src}
            alt={alt ?? ''}
            width={width}
            height={height}
            className="mb-4 max-w-full rounded-lg"
            loading="lazy"
          />
        ),
        // GitHub READMEs use <div> for inline image rows (screenshots, badges)
        // and <div align="center"> for centered content
        div: ({ children, ...props }) => {
          const align = (props as Record<string, unknown>).align as string | undefined
          return (
            <div
              className={`mb-4 flex flex-wrap items-center gap-2${align === 'center' ? ' justify-center' : ''}`}
            >
              {children}
            </div>
          )
        },
      }}
    >
      {content}
    </Markdown>
  )
}
