import { type ReactNode } from 'react'

type TagVariant = 'default' | 'status'
type TagStatus = 'active' | 'pending'
type TagSize = 'xs' | 'sm' | 'md'
type TagAs = 'span' | 'time' | 'a' | 'button'

interface TagProps {
  variant?: TagVariant
  status?: TagStatus
  size?: TagSize
  as?: TagAs
  className?: string
  children: ReactNode
}

// Layout + border-width only. Border/bg/text COLOR come from the variant so they
// never compete (this also ensures the status variant still gets a size class).
const base = 'inline-flex items-center rounded-full border font-mono focus-ring'

const sizes: Record<TagSize, string> = {
  xs: 'text-micro px-2 py-0.5',
  sm: 'text-caption px-2.5 py-0.5',
  md: 'text-xs px-3 py-1',
}

const statusActive = 'border-accent-success/20 bg-accent-success/5 text-accent-success'
const statusPending = 'border-accent-warning/20 bg-accent-warning/5 text-accent-warning'

export function Tag({
  variant = 'default',
  status = 'active',
  size = 'sm',
  as = 'span',
  className = '',
  children,
  ...rest
}: TagProps & Record<string, unknown>) {
  const color =
    variant === 'status'
      ? status === 'pending'
        ? statusPending
        : statusActive
      : size === 'md'
        ? 'border-border-subtle bg-surface-raised text-fg-secondary'
        : 'border-border-subtle bg-surface-raised text-fg-meta'

  const classes = [base, sizes[size], color, className].filter(Boolean).join(' ')

  switch (as) {
    case 'time':
      return (
        <time className={classes} {...rest}>
          {children}
        </time>
      )
    case 'a':
      return (
        <a className={classes} {...rest}>
          {children}
        </a>
      )
    case 'button':
      return (
        <button type="button" className={classes} {...rest}>
          {children}
        </button>
      )
    case 'span':
    default:
      return (
        <span className={classes} {...rest}>
          {children}
        </span>
      )
  }
}
