import { type ReactNode } from 'react'

type CTAButtonVariant = 'primary' | 'ghost'

interface CTAButtonProps {
  href: string
  children: ReactNode
  variant?: CTAButtonVariant
  /** Opens in a new tab with `noopener noreferrer` + an sr-only "opens in new tab" note. */
  external?: boolean
  prefersReducedMotion?: boolean
}

const base =
  'group relative inline-flex items-center justify-center overflow-hidden rounded-full px-6 py-3 font-mono text-sm font-medium transition-all duration-300 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'

const variants: Record<CTAButtonVariant, string> = {
  primary: 'bg-white text-black hover:bg-white/90 hover:shadow-[0_8px_30px_rgba(255,255,255,0.15)]',
  ghost:
    'border border-white/15 bg-white/5 text-white backdrop-blur-sm hover:border-white/30 hover:bg-white/10',
}

export function CTAButton({
  href,
  children,
  variant = 'primary',
  external = false,
  prefersReducedMotion = false,
}: CTAButtonProps) {
  const lift = prefersReducedMotion ? '' : 'hover:-translate-y-0.5'

  return (
    <a
      href={href}
      className={`${base} ${lift} ${variants[variant]}`}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
        {external && <span className="sr-only"> (opens in new tab)</span>}
      </span>
      {variant === 'ghost' && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"
        >
          <span
            className="absolute inset-0 -translate-x-full -translate-y-full transition-transform duration-700 group-focus-within:translate-x-0 group-focus-within:translate-y-0 group-hover:translate-x-0 group-hover:translate-y-0 motion-reduce:transition-none"
            style={{
              background:
                'linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
              width: '200%',
              height: '200%',
            }}
          />
        </span>
      )}
    </a>
  )
}
