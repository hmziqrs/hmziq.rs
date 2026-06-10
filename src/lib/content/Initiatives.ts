export type InitiativeStatus = 'active' | 'coming-soon'

export type InitiativeIconName = 'package' | 'sparkles'

export interface Initiative {
  name: string
  description: string
  status: InitiativeStatus
  iconName: InitiativeIconName
  href?: string
}

export const initiatives: Initiative[] = [
  {
    name: 'Free Oxide',
    description:
      'High quality Rust open source free software. Reliable, well-tested, and built to last.',
    status: 'active',
    iconName: 'package',
    href: 'https://github.com/hmziqrs',
  },
  {
    name: 'Rust Slop',
    description:
      'AI-assisted vibe-coded rewrites. Not well tested — could have breaking changes. Use at your own risk.',
    status: 'coming-soon',
    iconName: 'sparkles',
  },
]

export const statusConfig: Record<InitiativeStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400/80',
  },
  'coming-soon': {
    label: 'Coming Soon',
    className: 'border-amber-500/20 bg-amber-500/5 text-amber-400/80',
  },
}
