# hmziq.rs

Space-themed creative portfolio with 3D star field and particle animations powered by WebAssembly.

## Tech Stack

- **Runtime:** [Bun](https://bun.sh)
- **Framework:** [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router)
- **Build:** [VitePlus](https://vite.dev) (Vite + oxlint + oxfmt)
- **UI:** React 19, TypeScript, [Tailwind CSS v4](https://tailwindcss.com)
- **3D:** [Three.js](https://threejs.org) + [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- **Animation:** [Framer Motion](https://www.framer.com/motion)
- **WASM:** Rust + [wasm-pack](https://rustwasm.github.io/wasm-pack/) with SIMD128

## Structure

```
src/
├── routes/              # TanStack Router file-based routing
├── components/
│   ├── sections/        # Page sections (Hero, Skills, Contact)
│   └── three/           # 3D components (StarField, ScatterText)
├── hooks/               # Custom React hooks
├── lib/
│   ├── content/         # Content data wrappers
│   └── wasm/            # WASM module loaders and shared memory
├── contexts/            # React contexts
├── content/data/        # JSON data files
└── styles.css           # Global styles + Tailwind v4 config
wasm/                    # Rust WebAssembly source
public/                  # Static assets
scripts/                 # Build scripts
```

## Getting Started

```bash
# Install dependencies
bun install

# Start dev server (builds WASM first)
bun run dev

# Build WASM only
bun run build:wasm

# Production build
bun run build

# Lint and format
vp check
```

## WASM

The particle systems (star field and scatter text) are powered by a Rust WebAssembly module using SIMD128 for performance. Source is in `wasm/src/`.

```bash
# Build WASM (release)
bun run build:wasm

# Build WASM (dev, faster compile)
bun run build:wasm:dev
```

## Deployment

Deploys to three platforms via GitHub Actions:

- **GitHub Pages** -- static hosting
- **Cloudflare Pages** -- CDN with edge functions
- **Firebase Hosting** -- Google Cloud CDN

Push to `master` to trigger deployment.

## License

MIT
