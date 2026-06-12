# hmziq.rs

Personal portfolio at [hmziq.rs](https://hmziq.rs). Space-themed landing page with 3D star field and particle text. The particle math runs in Rust compiled to WebAssembly with SIMD128.

## Tech stack

- [Bun](https://bun.sh)
- [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router) (file-based routing, SSR)
- [TanStack Query](https://tanstack.com/query) v5 (SSR-integrated)
- [VitePlus](https://vite.dev) (Vite + oxlint + oxfmt)
- React 19, TypeScript, [Tailwind CSS v4](https://tailwindcss.com)
- React Compiler (`babel-plugin-react-compiler`)
- [Three.js](https://threejs.org) + [React Three Fiber](https://docs.pmnd.rs/react-three-fiber), custom GLSL shaders
- Rust nightly + [wasm-pack](https://rustwasm.github.io/wasm-pack/), SIMD128, wasm-opt `-O4`
- MDX frontmatter via `gray-matter`, virtual Vite module with HMR
- RSS 2.0, Atom 1.0, XML sitemap
- [Playwright](https://playwright.dev)

## Structure

```
src/
├── routes/
│   ├── __root.tsx         # Root layout (WASM provider, analytics, star field)
│   ├── index.tsx          # Homepage
│   ├── projects.tsx       # Projects listing with type filters
│   └── projects.$slug.tsx # Project detail page
├── components/
│   ├── three/             # StarField, ScatterText
│   ├── sections/          # Hero, Skills, Initiatives, Projects, Experience, Blog
│   ├── layout/            # Footer, PageContainer, Section
│   ├── ui/                # GlassCard, TechIcon, SocialLinks, ErrorBoundary
│   ├── projects/          # Card, Detail, Listing
│   ├── initiatives/       # Initiative cards
│   ├── blog/              # Blog post card
│   └── wasm/              # WASM integration
├── hooks/                 # useReducedMotion
├── contexts/              # WASMContext, AnalyticsContext
├── lib/
│   ├── content/           # Content loaders and type exports
│   ├── wasm/              # WASM loader, shared memory classes
│   ├── blog-api.ts        # Blog client (blog.hmziq.rs)
│   ├── blog-queries.ts    # TanStack Query options
│   ├── techIcons.ts       # ~80 tech-to-icon mappings
│   └── dateUtils.ts       # Period string parser
└── styles.css             # Tailwind v4 @theme config
content/
├── projects/<slug>/project.mdx      # 39 projects
└── experiences/<slug>/experience.mdx # 6 experiences
wasm/src/
├── lib.rs            # Module exports, memory export
├── math.rs           # SIMD sin/cos lookup tables, seeded random
├── star_field.rs     # Star field pool, SIMD particle gen and effects
└── scatter_text.rs   # Text-to-particle system, SIMD animation
public/               # Fonts, favicons, compiled WASM, feeds
scripts/              # Build and data scripts
```

## Getting started

```bash
bun install
bun run dev        # builds WASM (dev mode), starts :3000
```

```bash
bun run build            # WASM release + feeds + production build
bun run build:wasm       # WASM release only
bun run build:wasm:dev   # WASM dev (faster compile)
bun run generate:feeds   # RSS, Atom, sitemap
bun run fetch:github     # Pull GitHub stars/forks into frontmatter
vp check                 # Lint + format
vp lint                  # oxlint (react, ts, a11y plugins)
vp fmt                   # oxfmt
```

## WASM

Rust allocates `Vec<f32>` buffers and exposes raw pointers. JS creates `Float32Array` views on the WASM linear memory directly. There is no per-frame copy between WASM and JS. The layout is Structure of Arrays (SoA): `positionX`, `positionY`, `positionZ`, `colorR`, and so on as separate arrays, not interleaved structs. That maps to WebGL shader attributes directly and lets Rust process 16 floats per operation via `f32x16`.

Star field:
- Spherical positions, colors (white/blue/yellow/purple), sizes, twinkle values, SIMD batched
- Twinkle and sparkle per-frame, groups of 16 via `f32x16`
- Frustum culling (Gribb-Hartmann plane extraction from the VP matrix)
- Bitpacked visibility (64 stars per `u64`)
- Mouse movement and clicks increase rotation speed

Scatter text:
- Text rendered to offscreen canvas, visible pixels sampled up to 10k particles
- Form mode: particles ease toward targets (lerp 0.08)
- Scatter mode: particles fly along pre-calculated velocities, friction 0.98
- Both modes SIMD-batched

Math:
- Sin/cos lookup tables, 1024 entries, thread-local
- Scalar and 16-wide SIMD lookups
- Deterministic seeded random, no stored state

Build flags: LTO, opt-level 3, single codegen unit, wasm-opt `-O4` with `--fast-math` and aggressive inlining.

## Content

Projects and experiences live as MDX under `content/`. A custom Vite plugin (`vite-plugin-content.ts`) reads them at build time, parses frontmatter with gray-matter, and exports typed arrays through a `virtual:content` module. HMR works: editing a project MDX file reloads without restarting the dev server.

`fetch-github-stats.ts` pulls stars and forks for every project from GitHub and writes them back into frontmatter.

Blog posts come from `blog.hmziq.rs/api/index.json` through a TanStack Start server function, fetched server-side during SSR. TanStack Query caches results with a 5-minute stale time.

## Deployment

Cloudflare Pages via GitHub Actions on push to `master`. CI installs Bun, Node.js 22, Rust nightly (`wasm32-unknown-unknown`), and wasm-pack, then builds WASM, generates feeds, runs the production build, and deploys via `cloudflare/wrangler-action@v3`.

## License

MIT
