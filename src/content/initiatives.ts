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
    content: `Free Oxide is Rust open source software that I publish when it's ready and maintain as long as people use it. The bar is simple: I test it, I run it myself, and I won't publish something I wouldn't ship in my own projects.

Everything here is Rust because that's what I work in. Not because of some ideological stance. Rust gives me the guarantees I want for the kind of software I build, and I'm not interested in fighting the language while I'm fighting the actual problem.

The work right now is mostly GPUI, the framework behind the Zed editor. It's new, the docs are thin, and a lot of patterns you'd expect from a GUI toolkit don't exist yet. gpui-starter gives you a working desktop app with window management, SQLite, and a sidebar. gpui-query handles async data fetching and caching the same way TanStack Query does for React. I built these because I needed them.

There is no roadmap. I build what I need, I publish it when the tests pass and the API doesn't make me cringe, and I fix things when people file issues. If it's under Free Oxide, it's not an experiment I abandoned on GitHub. It's software I'm running.

If you're building with GPUI or Rust, contributions are welcome. Open a PR, start a discussion, or just use the libraries and tell me what breaks.`,
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
