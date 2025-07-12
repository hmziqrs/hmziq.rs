# Project Structure

```
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Main landing page
│   └── globals.css        # Global styles and Tailwind imports
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── three/             # Three.js components (StarField, etc.)
│   ├── sections/          # Page sections (Hero, About, Skills, Contact)
│   ├── effects/           # 2D canvas effects (Nebula, Meteor, etc.)
│   └── performance/       # Performance monitoring components
├── lib/                   # Utility functions and configurations
│   ├── utils.ts           # General helper functions
│   ├── performance/       # Performance optimization utilities
│   └── wasm/              # WebAssembly integration
├── hooks/                 # Custom React hooks
├── public/                # Static assets
├── docs/                  # Project documentation
│   ├── PERFORMANCE_TEST_RESULTS.md
│   ├── PROJECT_STATE.md
│   └── WASM_OPTIMIZATION_PLAN.md
├── wasm/                  # Rust WebAssembly module
│   ├── src/               # Rust source code
│   ├── Cargo.toml         # Rust package configuration
│   └── pkg/               # Generated WASM package
├── scripts/               # Build and utility scripts
│   └── copy-wasm.js       # WASM build script
└── legacy/                # Moved unused/old files
```

## Key Files

- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.json` - ESLint configuration
- `.prettierrc` - Prettier formatting rules
- `next.config.mjs` - Next.js configuration
- `postcss.config.mjs` - PostCSS configuration
- `CLAUDE.md` - Project instructions for Claude Code
