import { motion, type TargetAndTransition, type Variants } from 'framer-motion'
import { type ReactNode } from 'react'

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
    <div
      className={`group relative flex ${direction === 'col' ? 'flex-col' : 'flex-row'} bg-gradient-radial items-center gap-3 overflow-hidden rounded-lg from-transparent via-transparent to-white/[0.05] px-6 py-4 shadow-[inset_0_0_20px_rgba(255,255,255,0.07),0_0_10px_rgba(255,255,255,0.03)] backdrop-blur-sm transition-all duration-500 hover:to-white/[0.08] ${className}`}
    >
      <div className="z-10 transition-transform duration-300 group-hover:scale-110">{icon}</div>
      <span className="relative z-10 font-mono text-sm font-medium tracking-wide text-white">
        {label}
      </span>
      {/* White shine effect on hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-all duration-1000 group-hover:opacity-100">
        <div
          className="absolute inset-0 -translate-x-full -translate-y-full transition-transform duration-1000 group-hover:translate-x-0 group-hover:translate-y-0"
          style={{
            background:
              'linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.4) 50%, transparent 70%)',
            width: '200%',
            height: '200%',
          }}
        />
      </div>
    </div>
  )

  if (href) {
    return (
      <motion.a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        variants={variants}
        whileHover={hoverAnimation}
      >
        {content}
      </motion.a>
    )
  }

  return (
    <motion.div variants={variants} whileHover={hoverAnimation}>
      {content}
    </motion.div>
  )
}
