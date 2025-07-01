# CLAUDE.md

AI agent documentation for a creative landing page project with space-themed 3D animations.

## Agent Rules

These rules must be followed unless explicitly overridden:

1. **No Planning Documents**: Never create plans/summaries/reports unless requested
2. **Direct File Modification**: Edit original files directly, never create copies/alternatives  
3. **AI-Focused Documentation**: Brief, technical docs with line references, not human-readable unless specified
4. **No Legacy Directory**: Never use legacy directory structure unless mentioned
5. **No Test/Demo Files**: Don't create test/demo files unless mentioned

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