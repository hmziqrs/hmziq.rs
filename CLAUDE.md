# CLAUDE.md

AI agent documentation for a creative landing page project with space-themed 3D animations.

## Agent Rules

These rules must be followed unless explicitly overridden:

1. **No Planning Documents**: Never create plans, summaries, completion reports, or documentation files unless explicitly requested
2. **Direct File Modification**: When asked to modify, revamp, or optimize files, edit the original file directly - never create copies or alternative versions
3. **AI-Focused Documentation**: Create documentation optimized for AI consumption - brief, technical, with line number references when referencing code, not human-readable unless specified

## Project Overview

A minimal landing page featuring:
- Canvas-based parallax animations
- 3D star field simulation
- Space-themed design
- Subtle, performance-focused animations

**Focus**: Creative visual experience, not content-heavy presentation.

## Tech Stack

- **Runtime**: Bun (package manager & runtime)
- **Framework**: Next.js 15+ (App Router)
- **UI**: shadcn/ui components
- **Styling**: Tailwind CSS v4
- **3D**: Three.js + React Three Fiber
- **Language**: TypeScript

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main page
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── three/             # Three.js components
│   └── sections/          # Page sections
├── lib/                   # Utilities
└── public/                # Static assets
```

## Key Guidelines

### Development
- Use `bun` for all package management (never npm/yarn)
- Use `dynamic` imports for Three.js components (client-side only)
- Implement proper Three.js cleanup to prevent memory leaks

### Three.js Implementation
- Use React Three Fiber for React integration
- Use @react-three/drei for utilities
- Implement Suspense boundaries for 3D loading
- Optimize star field performance

### Animations
- Target 60fps performance
- Use Intersection Observer for parallax triggers
- Respect `prefers-reduced-motion`
- Keep effects subtle and smooth

### Design Constraints
- **Colors**: Black (#000000) background, white (#FFFFFF) text, gray accents
- **Effects**: Blue/purple tints only for star glow
- **Content**: Minimal sections (hero, skills, contacts)
- **Accessibility**: Ensure content works without JavaScript

## Common Patterns

### 3D Components
```typescript
// Use dynamic imports
const StarField = dynamic(() => import('@/components/three/StarField'), {
  ssr: false
})
```

### Parallax Sections
- Use Intersection Observer API
- Calculate scroll progress for smooth transitions
- Apply CSS transforms for performance