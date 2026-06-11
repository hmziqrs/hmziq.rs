import { ExternalLink, Package, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

import { GlassCard } from '~/components/ui/GlassCard'
import { statusConfig, type Initiative, type InitiativeIconName } from '~/content/initiatives'

const icons: Record<InitiativeIconName, ReactNode> = {
  package: <Package size={20} className="text-white/70" />,
  sparkles: <Sparkles size={20} className="text-white/70" />,
}

export function InitiativeCard({ initiative }: { initiative: Initiative }) {
  const badge = statusConfig[initiative.status]
  const card = (
    <GlassCard className="flex h-full flex-col gap-3 px-6 py-5 focus-within:border-white/10 focus-within:bg-white/1">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-white/60" aria-hidden="true">
            {icons[initiative.iconName]}
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

      <p className="text-xs leading-relaxed text-white/60">{initiative.description}</p>

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

  return (
    <li className="h-full">
      {initiative.href ? (
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
      ) : (
        <article aria-label={initiative.name}>{card}</article>
      )}
    </li>
  )
}
