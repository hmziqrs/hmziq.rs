export interface Skill {
  /** Display name; matches a key in `techIconMap` so <TechIcon> resolves its icon. */
  name: string
  /** Kebab-case identifier for a future /skills/$slug detail route. */
  slug: string
  /** One-line tagline shown in the marquee tooltip. */
  short: string
  /** Longer description reserved for a future skill detail page. */
  detail: string
}

export const skills: Skill[] = [
  {
    name: 'Flutter',
    slug: 'flutter',
    short: 'Dart UI toolkit by Google',
    detail: 'A Google toolkit for building mobile, web, and desktop apps from one Dart codebase.',
  },
  {
    name: 'Dioxus',
    slug: 'dioxus',
    short: 'React-like Rust UI framework',
    detail:
      'A Rust framework with a React-like component model. One codebase can target web, desktop, and mobile.',
  },
  {
    name: 'React',
    slug: 'react',
    short: 'Component UI library',
    detail: 'A JavaScript library for building user interfaces out of reusable components.',
  },
  {
    name: 'React Native',
    slug: 'react-native',
    short: 'Native mobile apps with React',
    detail: 'Build native iOS and Android apps with React and JavaScript.',
  },
  {
    name: 'Next.JS',
    slug: 'nextjs',
    short: 'Full-stack React framework',
    detail:
      'A React framework from Vercel. It adds file-based routing, server rendering, and server components on top of React.',
  },
  {
    name: 'TanStack',
    slug: 'tanstack',
    short: 'Headless data & routing libs',
    detail:
      'A set of headless libraries (Router, Query, Table, Form) for React and other frameworks.',
  },
  {
    name: 'HonoJS',
    slug: 'honojs',
    short: 'Fast TypeScript web framework',
    detail:
      'A small, fast web framework written in TypeScript. It runs on Cloudflare Workers, Bun, Deno, and Node.',
  },
  {
    name: 'AdonisJS',
    slug: 'adonisjs',
    short: 'TypeScript MVC framework for Node',
    detail:
      'A Node.js web framework with an MVC layout, an ORM, and TypeScript support. The API is similar to Laravel.',
  },
  {
    name: 'Axum',
    slug: 'axum',
    short: 'Rust web framework (Tokio)',
    detail: 'A Rust web framework built on Tokio and Tower. It uses async handlers and extractors.',
  },
  {
    name: 'GPUI',
    slug: 'gpui',
    short: 'Rust GPU-native UI (Zed)',
    detail:
      'The UI framework behind the Zed editor, written in Rust. It renders on the GPU and mixes immediate and retained mode.',
  },
  {
    name: 'Ratatui',
    slug: 'ratatui',
    short: 'Rust terminal UI framework',
    detail:
      'A Rust library for building terminal user interfaces (TUIs). It is the successor to tui-rs.',
  },
  {
    name: 'Docker',
    slug: 'docker',
    short: 'Containerization platform',
    detail:
      'A platform for packaging an app and its dependencies into a container that runs the same way anywhere.',
  },
  {
    name: 'Cloudflare',
    slug: 'cloudflare',
    short: 'Edge cloud & CDN platform',
    detail:
      'A global network that provides CDN, DNS, security, and serverless compute from edge servers near users.',
  },
  {
    name: 'CI/CD',
    slug: 'ci-cd',
    short: 'Automated build & deploy',
    detail:
      'Continuous integration and delivery. Code is built, tested, and deployed automatically on every change, often with GitHub Actions.',
  },
  {
    name: 'Architecture',
    slug: 'architecture',
    short: 'System & software design',
    detail: 'How a system is split into parts and how those parts interact.',
  },
  {
    name: 'Animations',
    slug: 'animations',
    short: 'UI motion & micro-interactions',
    detail:
      'Adding motion to an interface (transitions, hover effects, small details) with CSS, Framer Motion, and WebGL.',
  },
]

export function findSkillBySlug(slug: string) {
  return skills.find((skill) => skill.slug === slug)
}
