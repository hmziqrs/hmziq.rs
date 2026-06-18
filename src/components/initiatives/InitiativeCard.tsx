import { Link } from '@tanstack/react-router'
import { ExternalLink, Package, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card } from '~/components/ui/Card'
import { Tag } from '~/components/ui/Tag'
import { statusConfig, type Initiative, type InitiativeIconName } from '~/content/initiatives'

const icons: Record<InitiativeIconName, ReactNode> = {
  package: <Package size={20} className="text-fg-link" />,
  sparkles: <Sparkles size={20} className="text-fg-link" />,
}

export function InitiativeCard({ initiative }: { initiative: Initiative }) {
  const badge = statusConfig[initiative.status]
  const card = (
    <Card variant="glass" interactive className="flex h-full flex-col gap-3 px-6 py-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-fg-meta" aria-hidden="true">
            {icons[initiative.iconName]}
          </span>
          <h3 className="text-fg-primary font-mono text-sm font-semibold tracking-wide">
            {initiative.name}
          </h3>
        </div>
        <Tag
          variant="status"
          status={badge.status}
          size="xs"
          className="shrink-0"
          aria-label={`Status: ${badge.label}`}
        >
          {badge.label}
        </Tag>
      </div>

      <p className="text-fg-link text-xs leading-relaxed">{initiative.description}</p>

      <div className="mt-auto flex items-center gap-3 pt-2">
        <span className="text-caption text-fg-secondary group-focus-within:text-fg-meta group-hover:text-fg-meta inline-flex items-center gap-1.5 font-mono transition-colors duration-200">
          View details
        </span>
        {initiative.href && (
          <span className="text-caption text-fg-secondary inline-flex items-center gap-1 font-mono">
            <ExternalLink size={10} aria-hidden="true" />
            Website
          </span>
        )}
      </div>
    </Card>
  )

  return (
    <li className="h-full">
      <Link
        to="/initiatives/$slug"
        params={{ slug: initiative.slug }}
        aria-label={`${initiative.name} — ${initiative.description}`}
        className="block h-full"
      >
        <article aria-label={initiative.name}>{card}</article>
      </Link>
    </li>
  )
}
