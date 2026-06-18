export type InitiativeStatus = 'active' | 'coming-soon'

/**
 * Semantic status key consumed by <Tag variant="status" status={...}>.
 * Maps the domain statuses above onto the Tag primitive's two visual states.
 */
export type InitiativeStatusKey = 'active' | 'pending'

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

export const statusConfig: Record<
  InitiativeStatus,
  { label: string; status: InitiativeStatusKey }
> = {
  active: {
    label: 'Active',
    status: 'active',
  },
  'coming-soon': {
    label: 'Coming Soon',
    status: 'pending',
  },
}

export function findInitiativeBySlug(slug: string) {
  return initiatives.find((initiative) => initiative.slug === slug)
}
