import Markdown from 'react-markdown'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <Markdown
      components={{
        h1: ({ children }) => (
          <h1 className="mt-8 mb-4 font-mono text-xl font-bold text-white first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-6 mb-3 font-mono text-lg font-semibold text-white/90">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-5 mb-2 font-mono text-base font-semibold text-white/80">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="mt-4 mb-2 font-mono text-sm font-semibold text-white/70">{children}</h4>
        ),
        p: ({ children }) => (
          <p className="mb-3 text-sm leading-relaxed text-white/50">{children}</p>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 underline underline-offset-4 transition-colors hover:text-white"
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
          <ul className="mb-3 ml-4 list-disc space-y-1 text-sm text-white/50">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 ml-4 list-decimal space-y-1 text-sm text-white/50">{children}</ol>
        ),
        li: ({ children }) => <li className="pl-1">{children}</li>,
        code: ({ className, children }) => {
          const isInline = !className
          if (isInline) {
            return (
              <code className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-xs text-white/70">
                {children}
              </code>
            )
          }
          return <code className={className}>{children}</code>
        },
        pre: ({ children }) => (
          <pre className="mb-4 overflow-x-auto rounded-lg bg-white/[0.04] p-4 text-xs">
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-l-2 border-white/20 pl-4 text-sm text-white/40 italic">
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
        td: ({ children }) => <td className="px-3 py-2 text-xs text-white/50">{children}</td>,
        img: ({ src, alt }) => (
          <img src={src} alt={alt} className="mb-4 max-w-full rounded-lg" loading="lazy" />
        ),
      }}
    >
      {content}
    </Markdown>
  )
}
