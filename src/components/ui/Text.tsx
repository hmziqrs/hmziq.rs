import { createElement, type ElementType, type ReactNode } from 'react'

type TextTone =
  | 'primary'
  | 'heading'
  | 'heading-hover'
  | 'body'
  | 'secondary'
  | 'meta'
  | 'link'
  | 'muted'
  | 'faint'

type TextSize = 'micro' | 'caption' | 'xs' | 'sm' | 'base' | 'lg' | 'xl'

interface TextProps {
  tone?: TextTone
  as?: ElementType
  size?: TextSize
  mono?: boolean
  className?: string
  children?: ReactNode
}

const toneTokens: Record<TextTone, string> = {
  primary: 'text-fg-primary',
  heading: 'text-fg-heading',
  'heading-hover': 'text-fg-heading-hover',
  body: 'text-fg-body',
  secondary: 'text-fg-secondary',
  meta: 'text-fg-meta',
  link: 'text-fg-link',
  muted: 'text-fg-muted',
  faint: 'text-fg-faint',
}

const sizeTokens: Record<TextSize, string> = {
  micro: 'text-micro',
  caption: 'text-caption',
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
}

export function Text({
  tone = 'body',
  as = 'p',
  size,
  mono = true,
  className = '',
  children,
  ...rest
}: TextProps) {
  const classes = [
    toneTokens[tone],
    size ? sizeTokens[size] : '',
    mono ? 'font-mono' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return createElement(as, { className: classes, ...rest }, children)
}
