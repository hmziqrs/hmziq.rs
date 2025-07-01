# CLAUDE.md

AI agent documentation for a creative landing page project with space-themed 3D animations.

## Agent Rules

These rules must be followed unless explicitly overridden:

1. **No Planning Documents**: Never create plans, summaries, completion reports, or documentation files unless explicitly requested
2. **Direct File Modification**: When asked to modify, revamp, or optimize files, edit the original file directly - never create copies or alternative versions
3. **AI-Focused Documentation**: Create documentation optimized for AI consumption - brief, technical, with line number references when referencing code, not human-readable unless specified
4. **No Legacy Directory**: Never use or reference legacy directory structure in any way unless explicitly mentioned

## Project Overview

Space-themed landing page with 3D star field and parallax animations. Focus: creative visual experience.

## Tech Stack

Bun, Next.js 15+ (App Router), shadcn/ui, Tailwind CSS v4, Three.js + React Three Fiber, TypeScript

## Project Structure

`app/` (Next.js), `components/ui/` (shadcn/ui), `components/three/` (3D), `components/sections/`, `lib/` (utils)

## Key Guidelines

- Use `bun` (never npm/yarn), `dynamic` imports for Three.js (client-side only)
- React Three Fiber + @react-three/drei, Suspense boundaries, optimize star field
- 60fps target, Intersection Observer for parallax, respect `prefers-reduced-motion`
- Colors: Black bg (#000000), white text (#FFFFFF), gray accents, blue/purple star glow only
- Content: hero, skills, contacts sections. Ensure accessibility without JS.

## Common Patterns

3D: `const StarField = dynamic(() => import('@/components/three/StarField'), { ssr: false })`
Parallax: Intersection Observer + CSS transforms for performance