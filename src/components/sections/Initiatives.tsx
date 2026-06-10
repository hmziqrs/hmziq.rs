import { motion } from 'framer-motion'
import { Package, Sparkles, ExternalLink } from 'lucide-react'
import { type ReactNode } from 'react'

import { useReducedMotion } from '~/hooks/useReducedMotion'
import { useSectionVariants } from '~/hooks/useSectionVariants'

type InitiativeStatus = 'active' | 'coming-soon'

interface InitiativeData {
  name: string
  description: string
  status: InitiativeStatus
  icon: ReactNode
  href?: string
}

const initiatives: InitiativeData[] = [
  {
    name: 'Free Oxide',
    description:
      'High quality Rust open source free software. Reliable, well-tested, and built to last.',
    status: 'active',
    icon: <Package size={20} className="text-white/70" />,
    href: 'https://github.com/hmziqrs',
  },
  {
    name: 'Rust Slop',
    description:
      'AI-assisted vibe-coded rewrites. Not well tested — could have breaking changes. Use at your own risk.',
    status: 'coming-soon',
    icon: <Sparkles size={20} className="text-white/70" />,
  },
]

const statusConfig: Record<InitiativeStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400/80',
  },
  'coming-soon': {
    label: 'Coming Soon',
    className: 'border-amber-500/20 bg-amber-500/5 text-amber-400/80',
  },
}

function InitiativeCard({
  initiative,
  variants,
}: {
  initiative: InitiativeData
  variants: unknown
}) {
  const badge = statusConfig[initiative.status]
  const card = (
    <div className="group relative flex h-full flex-col gap-3 overflow-hidden border border-white/2 bg-white/3 px-6 py-5 backdrop-blur-sm transition-all duration-500 hover:border-white/10 hover:bg-white/1 focus-within:border-white/10 focus-within:bg-white/1">
      {/* Header: icon + name + badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-white/60" aria-hidden="true">
            {initiative.icon}
          </span>
          <h3 className="font-mono text-sm font-semibold tracking-wide text-white">
            {initiative.name}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-medium ${badge.className}`}
          aria-label={`Status: ${badge.label}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed text-white/60">{initiative.description}</p>

      {/* Link */}
      {initiative.href && (
        <div className="mt-auto pt-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-white/40 transition-colors duration-200 group-hover:text-white/60 group-focus-within:text-white/60">
            Explore
            <ExternalLink size={10} />
          </span>
        </div>
      )}

      {/* Hover shine */}
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

  if (initiative.href) {
    return (
      <motion.li variants={variants as never} className="h-full">
        <a
          href={initiative.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${initiative.name} — ${initiative.description}`}
          className="block h-full"
        >
          <article>
            {card}
          </article>
          <span className="sr-only">(opens in new tab)</span>
        </a>
      </motion.li>
    )
  }

  return (
    <motion.li variants={variants as never} className="h-full">
      <article>
        {card}
      </article>
    </motion.li>
  )
}

function MysteryCard({ variants }: { variants: unknown }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.li
      variants={variants as never}
      className="h-full"
      aria-label="Unannounced initiative — coming soon"
    >
      <div className="group relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden border border-white/2 bg-white/3 px-6 py-5 backdrop-blur-sm transition-all duration-500 hover:border-white/10 hover:bg-white/1">
        {/* Pulsing question mark */}
        <motion.span
          className="font-mono text-3xl font-bold text-white/25"
          aria-hidden="true"
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  opacity: [0.25, 0.5, 0.25],
                }
          }
          transition={
            prefersReducedMotion
              ? undefined
              : {
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
          }
        >
          ?
        </motion.span>

        {/* Description */}
        <p className="text-center text-xs text-white/40 italic">Something is brewing...</p>

        {/* Badge */}
        <span
          className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 font-mono text-[10px] font-medium text-amber-400/80"
          aria-label="Status: Coming Soon"
        >
          Coming Soon
        </span>

        {/* Hover shine */}
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
    </motion.li>
  )
}

export default function Initiatives() {
  const { containerVariants, itemVariants } = useSectionVariants({
    containerDuration: 0.8,
    staggerChildren: 0.1,
    itemDuration: 0.4,
    itemY: 20,
    ease: [0.25, 0.1, 0.25, 1.0],
  })

  return (
    <section
      id="initiatives"
      className="relative flex min-h-screen items-center justify-center px-6 py-20"
      aria-label="Initiatives"
    >
      <motion.div
        className="mx-auto w-full max-w-6xl"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
      >
        <motion.h2
          variants={itemVariants}
          className="mb-10 text-center font-mono text-lg font-semibold tracking-wider text-white/80"
        >
          Initiatives
        </motion.h2>

        <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initiatives.map((initiative) => (
            <InitiativeCard key={initiative.name} initiative={initiative} variants={itemVariants} />
          ))}
          <MysteryCard variants={itemVariants} />
        </ul>
      </motion.div>
    </section>
  )
}
