import { Link } from '@tanstack/react-router'
import { type ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'ghost' | 'solid' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Optional element placed before the children. */
  leadingIcon?: ReactNode
  /** Optional element placed after the children. */
  trailingIcon?: ReactNode
  /** Opens the link in a new tab (only with `href`). Adds an sr-only note. */
  external?: boolean
  /** Sets aria-pressed + an active surface — for filter toggles. */
  pressed?: boolean
  prefersReducedMotion?: boolean
  /** Renders an <a> when provided. */
  href?: string
  /** Renders a TanStack <Link> when provided. */
  to?: string
  className?: string
  children?: ReactNode
  /** Pass-through props for the underlying <button>/<a>/<Link>. */
  [key: string]: unknown
}

const textSizeClasses: Record<ButtonSize, string> = {
  sm: 'text-micro',
  md: 'text-xs',
  lg: 'text-sm',
}

// Box padding + radius. Skipped for the `link` variant, which renders as an
// inline text link (BackLink, "Clear filter", footer links) and should carry
// no button chrome or surrounding padding.
const boxClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 rounded-md',
  md: 'px-4 py-2 rounded-lg',
  lg: 'px-6 py-3 rounded-lg',
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-white text-black rounded-full hover:bg-white/90 hover:shadow-glow',
  ghost:
    'border border-border-elevated bg-surface-raised text-fg-link backdrop-blur-glass hover:border-border-hover hover:bg-surface-overlay hover:text-fg-primary',
  solid: 'bg-surface-button text-fg-meta hover:bg-surface-overlay hover:text-fg-link',
  link: 'text-fg-link underline underline-offset-4 hover:text-fg-heading-hover',
}

/** Shine-sweep hover overlay — reused verbatim (clips to a group + overflow-hidden root). */
function ShineSweep() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"
    >
      <span
        className="absolute inset-0 -translate-x-full -translate-y-full transition-transform duration-700 group-focus-within:translate-x-0 group-focus-within:translate-y-0 group-hover:translate-x-0 group-hover:translate-y-0 motion-reduce:transition-none"
        style={{
          background:
            'linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.08) 50%, transparent 70%)',
          width: '200%',
          height: '200%',
        }}
      />
    </span>
  )
}

/**
 * Polymorphic button unifying the 16 button-like controls across the site.
 * - <button> by default
 * - <a> when `href` is provided
 * - TanStack <Link> when `to` is provided
 */
export function Button({
  variant = 'ghost',
  size = 'md',
  leadingIcon,
  trailingIcon,
  external = false,
  pressed,
  prefersReducedMotion = false,
  href,
  to,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const lift = prefersReducedMotion ? '' : 'hover:-translate-y-0.5'
  const showShine = variant === 'ghost'
  const hasLift = variant !== 'link'

  const base = [
    'group relative inline-flex items-center justify-center gap-2 font-mono transition-all duration-300 motion-reduce:transition-none focus-ring',
    showShine ? 'overflow-hidden' : '',
    textSizeClasses[size],
    variant === 'link' ? '' : boxClasses[size],
    pressed ? 'bg-surface-active text-fg-primary' : variantClasses[variant],
    hasLift ? lift : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const ariaProps = typeof pressed === 'boolean' ? { 'aria-pressed': pressed } : {}

  const externalProps = external && href ? { target: '_blank', rel: 'noopener noreferrer' } : {}

  const content = (
    <>
      {leadingIcon != null && <span aria-hidden="true">{leadingIcon}</span>}
      {children}
      {trailingIcon != null && <span aria-hidden="true">{trailingIcon}</span>}
      {external && href && <span className="sr-only"> (opens in new tab)</span>}
      {showShine && <ShineSweep />}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={base} {...ariaProps} {...rest}>
        {content}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={base} {...ariaProps} {...externalProps} {...rest}>
        {content}
      </a>
    )
  }

  return (
    <button className={base} {...ariaProps} {...rest}>
      {content}
    </button>
  )
}

export default Button
