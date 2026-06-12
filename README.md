# hmziq.rs

Personal portfolio. Space-themed landing page with 3D star field and particle text, particle math in Rust via WebAssembly (SIMD128).

## Stack

Bun, TanStack Start + Router (SSR, file-based routing), TanStack Query v5, VitePlus (Vite + oxlint + oxfmt), React 19, TypeScript, Tailwind CSS v4, React Compiler, Three.js + React Three Fiber (custom GLSL shaders), Firebase Analytics, Geist + Geist Mono.

Path alias: `~/` → `./src/`

## Structure

```
├── vite.config.ts               # VitePlus config (lint, format, prerender)
├── vite-plugin-content.ts       # Custom Vite plugin (virtual:content + HMR)
├── content/
│   ├── projects/<slug>/project.mdx      # 32 projects
│   └── experiences/<slug>/experience.mdx # 6 experiences
├── src/
│   ├── routes/
│   │   ├── __root.tsx          # WASM provider, analytics, star field, SEO meta, JSON-LD
│   │   ├── index.tsx           # Homepage
│   │   ├── projects.tsx        # Projects listing (type filters)
│   │   └── projects.$slug.tsx  # Project detail
│   ├── components/
│   │   ├── three/              # StarField, ScatterText, CanvasContextEvents
│   │   ├── sections/           # Hero, Skills, Initiatives, Projects, Experience, Blog
│   │   ├── layout/             # Footer, PageContainer, Section
│   │   ├── ui/                 # GlassCard, TechIcon, SocialLinks, SocialIcon, ErrorBoundary, BackLink, MarkdownRenderer, ScrollIndicator
│   │   ├── projects/           # ProjectCard, ProjectDetail, ProjectsListing, ProjectLink
│   │   ├── initiatives/        # InitiativeCard, MysteryCard
│   │   ├── blog/               # BlogPostCard
│   │   └── wasm/               # WASMCanvas
│   ├── hooks/                  # useReducedMotion
│   ├── contexts/               # WASMContext, AnalyticsContext
│   ├── types/                  # blog.ts, virtual-content.d.ts
│   ├── lib/
│   │   ├── wasm/               # core.ts, starfield.ts, scatter-text.ts, types.ts
│   │   ├── blog-api.ts         # Blog client (blog.hmziq.rs)
│   │   ├── blog-queries.ts     # TanStack Query options
│   │   ├── blog.functions.ts   # TanStack Start server function
│   │   ├── techIcons.ts        # ~80 tech-to-icon mappings
│   │   └── dateUtils.ts        # Period string parser
│   ├── content/
│   │   ├── data/               # site.json, metadata.json, user.json
│   │   ├── projects.ts, experiences.ts, initiatives.ts, blog.ts
│   └── styles.css              # Tailwind v4 @theme, @font-face
├── wasm/src/
│   ├── lib.rs, math.rs, star_field.rs, scatter_text.rs
├── public/
│   ├── fonts/, fav/, wasm/pkg/
│   ├── rss.xml, atom.xml, sitemap.xml
│   ├── robots.txt, _headers, app-ads.txt
├── scripts/                    # copy-wasm, fetch-github-stats, generate-feeds
└── tests/                      # Playwright
```

## Commands

```bash
bun install && bun run dev          # install + dev server on :3000
bun run build                      # WASM release + feeds + production build
bun run build:wasm / build:wasm:dev
bun run preview / prod             # preview production build
bun run generate:feeds             # RSS, Atom, sitemap
bun run fetch:github               # pull stars/forks into frontmatter
bun run type-check                 # tsc --noEmit
vp check / vp lint / vp fmt        # lint + format
```

Env vars (Firebase Analytics, set via GitHub repository variables in CI):

```
VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID,
VITE_FIREBASE_APP_ID, VITE_FIREBASE_MEASUREMENT_ID
```

## WASM

Zero-copy shared memory. Rust allocates `Vec<f32>` buffers, JS creates `Float32Array` views on WASM linear memory. No per-frame copy. Structure of Arrays layout (separate arrays per component) maps directly to shader attributes and enables SIMD batch processing (`f32x16`, 16 floats per op).

Star field: SIMD-batched spherical positions, colors, sizes, twinkle. Frustum culling (Gribb-Hartmann). Bitpacked visibility (64 stars/u64). Mouse/click speed control.

Scatter text: Offscreen canvas text sampling (up to 10k particles). Form mode (lerp 0.08) and scatter mode (friction 0.98), both SIMD-batched.

Math: Sin/cos lookup tables (1024 entries), 16-wide SIMD lookups, deterministic seeded random.

Build: LTO, opt-level 3, single codegen unit, `panic = "abort"`, no overflow checks. wasm-opt `-O4`, `--fast-math`, `--converge`, aggressive inlining. Target features: `+simd128,+bulk-memory,+sign-ext,+mutable-globals`.

## Content

MDX under `content/`, loaded via `virtual:content` Vite plugin (gray-matter, HMR). Blog posts prefetched at build time from `blog.hmziq.rs`. GitHub stars/forks synced into frontmatter via `fetch-github-stats.ts`. Feeds generated from blog API.

## Accessibility

`prefers-reduced-motion` kills all CSS animations and transitions globally. `useReducedMotion` hook (useSyncExternalStore) lets components skip JS animations: StarField stops rotating, ScatterText snaps to final positions. Skip-to-content link in root layout.

## Deployment

Cloudflare Pages via GitHub Actions on push to `master`. CI: Bun + Node 22 + Rust nightly (wasm32-unknown-unknown) + wasm-pack, Cargo cache, build, deploy via wrangler. Security headers in `public/_headers` (HSTS, nosniff, DENY framing, immutable static asset cache, correct WASM MIME type).
