import { type ReactNode } from 'react'

import { Button } from './Button'

type CTAButtonVariant = 'primary' | 'ghost'

interface CTAButtonProps {
  href: string
  children: ReactNode
  variant?: CTAButtonVariant
  /** Opens in a new tab with `noopener noreferrer` + an sr-only "opens in new tab" note. */
  external?: boolean
  prefersReducedMotion?: boolean
}

/**
 * Backward-compatible wrapper around <Button>.
 * Existing callers render an <a>; we default to size="lg" to match the
 * previous px-6 py-3 layout. Pass-through props are forwarded to Button.
 */
export function CTAButton({
  href,
  children,
  variant = 'primary',
  external = false,
  prefersReducedMotion = false,
  ...rest
}: CTAButtonProps) {
  return (
    <Button
      href={href}
      variant={variant}
      size="lg"
      external={external}
      prefersReducedMotion={prefersReducedMotion}
      {...rest}
    >
      {children}
    </Button>
  )
}

export default CTAButton
