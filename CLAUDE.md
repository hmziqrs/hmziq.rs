# CLAUDE.md

AI agent documentation for a creative landing page project with space-themed 3D animations.

## Project Overview

Space-themed landing page with 3D star field and parallax animations. Focus: creative visual experience.

## Tech Stack

Bun, Next.js 15+ (App Router), shadcn/ui, Tailwind CSS v4, Three.js + React Three Fiber, TypeScript, Rust + WebAssembly

## Project Structure

`app/` (Next.js), `components/ui/` (shadcn/ui), `components/three/` (3D), `components/sections/`, `lib/` (utils), `wasm/` (Rust)

## Key Guidelines

- Use `bun` (never npm/yarn), `dynamic` imports for Three.js (client-side only)
- React Three Fiber + @react-three/drei, Suspense boundaries, optimize star field
- 60fps target, Intersection Observer for parallax, respect `prefers-reduced-motion`
- Colors: Black bg (#000000), white text (#FFFFFF), gray accents, blue/purple star glow only
- Content: hero, skills, contacts sections. Ensure accessibility without JS.
- WASM: `bun run build:wasm` for Rust compilation, use for particle calculations
- Never read, analyze, or ever touch the `legacy/` directory unless explicitly specified; you don’t need to update or maintain import references in legacy files—even when moving orphaned or closely-related code
- Utilize sub-agents for multi-file operations when reading, updating, or performing actions across multiple files

## Common Patterns

3D: `const StarField = dynamic(() => import('@/components/three/StarField'), { ssr: false })`
Parallax: Intersection Observer + CSS transforms for performance
WASM: `import { initWasm } from '@/lib/wasm'` then `await initWasm()`
