export type InitiativeStatus = 'active' | 'coming-soon'

export type InitiativeIconName = 'package' | 'sparkles'

export interface Initiative {
  name: string
  slug: string
  description: string
  status: InitiativeStatus
  iconName: InitiativeIconName
  href?: string
  content?: string
}

export const initiatives: Initiative[] = [
  {
    name: 'Free Oxide',
    slug: 'free-oxide',
    description:
      'High quality Rust open source free software. Reliable, well-tested, and built to last.',
    status: 'active',
    iconName: 'package',
    href: 'https://freeoxide.com',
    content: `Rust open source software that I publish when it's ready and maintain as long as people use it. I test it, I run it myself, and I won't publish something I wouldn't ship in my own projects.

Right now the work is mostly GPUI, the framework behind the Zed editor. gpui-starter gives you a working desktop app with window management, SQLite, and a sidebar. gpui-query handles async data fetching and caching the same way TanStack Query does for React. I built these because I needed them.

No roadmap. I build what I need, publish when the tests pass, and fix things when people file issues. Contributions welcome.`,
  },
  {
    name: 'Rust Slop',
    slug: 'rust-slop',
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

export function findInitiativeBySlug(slug: string) {
  return initiatives.find((initiative) => initiative.slug === slug)
}
