import { motion, type TargetAndTransition, type Variants } from 'framer-motion'
import { type ReactNode } from 'react'

import { GlassCard } from '~/components/GlassCard'

interface GlowTileProps {
  icon: ReactNode
  label: string
  direction?: 'row' | 'col'
  className?: string
  variants?: Variants
  href?: string
  ariaLabel?: string
  prefersReducedMotion?: boolean
}

export function GlowTile({
  icon,
  label,
  direction = 'row',
  className = '',
  variants,
  href,
  ariaLabel,
  prefersReducedMotion,
}: GlowTileProps) {
  const hoverAnimation: TargetAndTransition | undefined = prefersReducedMotion
    ? undefined
    : {
        scale: 1.15,
        rotate: 3,
        transition: { type: 'spring', stiffness: 400, damping: 25 },
      }

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
      <motion.a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel ?? label}
        variants={variants}
        whileHover={hoverAnimation}
        className="min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        {content}
        <span className="sr-only">(opens in new tab)</span>
      </motion.a>
    )
  }

  return (
    <motion.div variants={variants} whileHover={hoverAnimation} tabIndex={0}>
      {content}
    </motion.div>
  )
}
