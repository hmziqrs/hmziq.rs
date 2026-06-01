# CLAUDE.md

AI agent documentation for a creative landing page project with space-themed 3D animations.

## Project Overview

Space-themed landing page with 3D star field and parallax animations. Focus: creative visual experience.

## Tech Stack

Bun, TanStack Start + TanStack Router, VitePlus (Vite + oxlint + oxfmt), Tailwind CSS v4, Three.js + React Three Fiber, TypeScript, React Compiler, Rust + WebAssembly

## Project Structure

`src/routes/` (TanStack Router file-based routing), `src/components/three/` (3D), `src/components/sections/`, `src/lib/` (utils), `src/contexts/`, `src/hooks/`, `wasm/` (Rust), `public/` (static assets)

## Key Guidelines

- Use `bun` (never npm/yarn), `React.lazy()` + `Suspense` for Three.js (client-side only)
- React Three Fiber + @react-three/drei, Suspense boundaries, optimize star field
- 60fps target, Intersection Observer for parallax, respect `prefers-reduced-motion`
- Colors: Black bg (#000000), white text (#FFFFFF), gray accents, blue/purple star glow only
- Content: hero, skills, contacts sections. Ensure accessibility without JS.
- WASM: `bun run build:wasm` for Rust compilation, use for particle calculations
- Path alias: `~/` maps to `./src/` (not `@/`)
- Lint/format: `vp lint`, `vp fmt`, `vp check` (replaces ESLint + Prettier)
- Never read, analyze, or ever touch the `legacy/` directory unless explicitly specified; you don't need to update or maintain import references in legacy files—even when moving orphaned or closely-related code
- Utilize sub-agents for multi-file operations when reading, updating, or performing actions across multiple files
- Only execute `git commit` or `git push` when the user has given explicit permission to do so
- The AI must never access, read, or modify any files under the `docs/completed` directory, as they contain no relevant information and provide no benefit.

## Common Patterns

3D: `const StarField = lazy(() => import('~/components/three/StarField'))`
Parallax: Intersection Observer + CSS transforms for performance
WASM: `import { loadWASM } from '~/lib/wasm'` then `await loadWASM()`
Dev server: `bun run dev` (VitePlus dev server on port 3000)
Routes: Files in `src/routes/` define routes via TanStack Router conventions (`__root.tsx`, `index.tsx`)
