import { type ReactNode } from 'react'

type CardVariant = 'glass' | 'solid' | 'outline'
type CardPadding = 'none' | 'sm' | 'md' | 'lg'
type CardRounded = 'none' | 'md' | 'lg' | 'full'

interface CardProps {
  variant?: CardVariant
  padding?: CardPadding
  interactive?: boolean
  rounded?: CardRounded
  className?: string
  children?: ReactNode
}

const variantClasses: Record<CardVariant, string> = {
  glass: 'border border-border-default bg-surface-glass backdrop-blur-glass',
  solid: 'bg-surface-button',
  outline: 'border border-border-default bg-surface-raised',
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

const roundedClasses: Record<CardRounded, string> = {
  none: 'rounded-none',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
}

export function Card({
  variant = 'glass',
  padding = 'none',
  interactive = false,
  rounded = 'none',
  className = '',
  children,
}: CardProps) {
  const interactiveHover =
    variant === 'glass' ? 'hover:bg-surface-raised' : 'hover:bg-surface-overlay'

  const interactiveClasses = interactive
    ? `overflow-hidden transition-colors duration-300 hover:border-border-hover focus-within:border-border-hover ${interactiveHover}`
    : ''

  return (
    <div
      className={`group relative ${variantClasses[variant]} ${paddingClasses[padding]} ${roundedClasses[rounded]} ${interactiveClasses} ${className}`}
    >
      {children}
      {interactive && (
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
      )}
    </div>
  )
}
