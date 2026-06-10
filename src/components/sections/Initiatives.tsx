import { Package, Sparkles, ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'

import { GlassCard } from '~/components/GlassCard'
import { Section } from '~/components/Section'
import { useReducedMotion } from '~/hooks/useReducedMotion'
import {
  initiatives,
  statusConfig,
  type Initiative,
  type InitiativeIconName,
} from '~/lib/content/Initiatives'

const iconMap: Record<InitiativeIconName, ReactNode> = {
  package: <Package size={20} className="text-white/70" />,
  sparkles: <Sparkles size={20} className="text-white/70" />,
}

function InitiativeCard({ initiative }: { initiative: Initiative }) {
  const badge = statusConfig[initiative.status]
  const card = (
    <GlassCard rounded="rounded-none" className="flex h-full flex-col gap-3 px-6 py-5 focus-within:border-white/10 focus-within:bg-white/1">
      {/* Header: icon + name + badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-white/60" aria-hidden="true">
            {iconMap[initiative.iconName]}
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
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-white/60 transition-colors duration-200 group-focus-within:text-white/60 group-hover:text-white/60">
            Explore
            <ExternalLink size={10} aria-hidden="true" />
          </span>
        </div>
      )}
    </GlassCard>
  )

  if (initiative.href) {
    return (
      <li className="h-full">
        <a
          href={initiative.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${initiative.name} — ${initiative.description}`}
          className="block h-full"
        >
          <article aria-label={initiative.name}>{card}</article>
          <span className="sr-only">(opens in new tab)</span>
        </a>
      </li>
    )
  }

  return (
    <li className="h-full">
      <article aria-label={initiative.name}>{card}</article>
    </li>
  )
}

function MysteryCard() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <li className="h-full" aria-label="Unannounced initiative — coming soon">
      <GlassCard rounded="rounded-none" className="flex h-full flex-col items-center justify-center gap-3 px-6 py-5">
        {/* Pulsing question mark */}
        <span
          className="font-mono text-3xl font-bold text-white/25"
          aria-hidden="true"
          style={{
            animation: prefersReducedMotion ? 'none' : 'pulseOpacity 3s ease-in-out infinite',
          }}
        >
          ?
        </span>

        {/* Description */}
        <p className="text-center text-xs text-white/55 italic">Something is brewing...</p>

        {/* Badge */}
        <span
          className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 font-mono text-[10px] font-medium text-amber-400/80"
          aria-label="Status: Coming Soon"
        >
          Coming Soon
        </span>
      </GlassCard>
    </li>
  )
}

export default function Initiatives() {
  return (
    <Section
      id="initiatives"
      heading="Initiatives"
      className="relative flex min-h-screen items-center justify-center px-6 py-20"
    >
      <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initiatives.map((initiative) => (
          <InitiativeCard key={initiative.name} initiative={initiative} />
        ))}
        <MysteryCard />
      </ul>
    </Section>
  )
}
