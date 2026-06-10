import { type ReactNode } from 'react'

import { GlassCard } from '~/components/GlassCard'

interface GlowTileProps {
  icon: ReactNode
  label: string
  direction?: 'row' | 'col'
  className?: string
  href?: string
  ariaLabel?: string
  prefersReducedMotion?: boolean
}

export function GlowTile({
  icon,
  label,
  direction = 'col',
  className = '',
  href,
  ariaLabel,
  prefersReducedMotion,
}: GlowTileProps) {
  const hoverClass = prefersReducedMotion
    ? ''
    : 'transition-transform duration-300 hover:scale-[1.15] hover:rotate-[3deg]'

  const content = (
    <GlassCard
      className={`flex ${direction === 'col' ? 'flex-col' : 'flex-row'} items-center gap-3 rounded-none px-6 py-4 focus-visible:border-white/10 focus-visible:bg-white/1 ${className}`}
    >
      <div className="z-10 transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110">
        {icon}
      </div>
      <span className="relative z-10 font-mono text-sm font-medium tracking-wide text-white">
        {label}
      </span>
    </GlassCard>
  )

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel ?? label}
        className={`min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${hoverClass}`}
      >
        {content}
        <span className="sr-only">(opens in new tab)</span>
      </a>
    )
  }

  return (
    <div tabIndex={0} className={hoverClass}>
      {content}
    </div>
  )
}
