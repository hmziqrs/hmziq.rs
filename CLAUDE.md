# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal landing page for @hmziqrs (hmziq.rs domain). It's designed to be a creative and unique introduction page featuring:
- Canvas-based parallax animations
- 3D components with animations
- Space-themed background with star simulation
- Subtle, non-bloated design that doesn't distract from content

**Important**: This is NOT a CV/Resume site. It's a subtle introduction page with focus on creative visual experience.

## Tech Stack

- **Runtime & Package Manager**: Bun (latest version)
- **Framework**: Next.js 15+ (App Router)
- **UI Components**: shadcn/ui (latest version)
- **Styling**: Tailwind CSS v4 (with CSS-first configuration)
- **3D Graphics**: Three.js (for star simulation and 3D animations)
- **Language**: TypeScript

### Tech Stack References
- Bun: https://bun.sh/docs
- Next.js: https://nextjs.org/docs
- shadcn/ui: https://ui.shadcn.com/
- Tailwind CSS v4: https://tailwindcss.com/docs/v4-beta
- Three.js + React Three Fiber: https://docs.pmnd.rs/react-three-fiber/

## Development Commands

**IMPORTANT**: This project uses Bun as the package manager and runtime. Always use `bun` instead of `npm` or `node`.

```bash
# Install dependencies
bun install

# Run development server
bun dev

# Build for production
bun run build

# Run production build locally
bun start

# Type checking
bun run type-check

# Linting
bun run lint

# Format code
bun run format

# Install shadcn/ui components (example)
bunx shadcn@latest add button

# Add a new dependency
bun add <package-name>

# Add a dev dependency
bun add -d <package-name>
```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Main landing page
│   └── globals.css        # Global styles and Tailwind v4 imports
├── components/            
│   ├── ui/                # shadcn/ui components
│   ├── three/             # Three.js components (StarField, etc.)
│   └── sections/          # Page sections (Hero, About, etc.)
├── lib/                   # Utility functions and configurations
│   ├── utils.ts           # Helper functions
│   └── three-utils.ts     # Three.js specific utilities
└── public/                # Static assets

```

## Key Implementation Guidelines

### Three.js Integration
- Use React Three Fiber (@react-three/fiber) for better React integration
- Implement star field as a separate component with performance optimization
- Use @react-three/drei for common Three.js utilities
- Ensure proper cleanup of Three.js resources to prevent memory leaks
- Consider using Suspense boundaries for 3D content loading

### Implementation Considerations
- Implement lazy loading for Three.js components
- Use `dynamic` imports from Next.js for client-side only components
- Implement reduced motion preferences for accessibility

### Animation Guidelines
- Keep animations subtle and smooth (60fps target)
- Implement parallax scrolling using Intersection Observer API
- Use requestAnimationFrame for custom animations
- Consider using Framer Motion for declarative animations
- Ensure animations respect prefers-reduced-motion

### Content Structure
- Hero section with name and brief tagline
- Subtle skill indicators (not a full list)
- Contact/social links (GitHub, LinkedIn, etc.)
- Keep content minimal and impactful

## Professional Background Context

The site owner is a Senior Software Engineer with 9 years of experience, specializing in:
- **Frontend**: TypeScript, Next.js, React.js, React Native
- **Backend**: AdonisJS, Express.js, Rust (Axum)
- **Cross-platform**: Flutter, Dioxus
- **Expertise**: Complex problem-solving, full-stack development

This context helps in crafting appropriate content and choosing suitable technical implementations.

## Design Principles

1. **Subtlety First**: Animations and effects should enhance, not overwhelm
2. **Smooth Experience**: Focus on fluid animations
3. **Accessibility**: Ensure content is accessible without JavaScript
4. **Uniqueness**: Stand out through creative implementation, not gimmicks
5. **Professionalism**: Maintain a professional tone despite creative elements

### Color Palette
- **Primary**: Neutral monochrome palette (black, white, grays)
- **Background**: Deep black (#000000) for space theme
- **Text**: High contrast white (#FFFFFF) on dark backgrounds
- **Accents**: Subtle gray variations (#111111, #222222, #888888)
- **Effects**: Slight blue/purple tints for star glow effects only

## Common Tasks

### Adding New 3D Elements
1. Create component in `components/three/`
2. Use React Three Fiber patterns
3. Implement proper lighting and camera setup
4. Test performance impact
5. Add loading states

### Implementing Parallax Sections
1. Use Intersection Observer for trigger points
2. Calculate scroll progress for smooth transitions
3. Use CSS transforms for smooth animations
4. Test on various screen sizes


## Testing Approach

- Visual regression testing for animations
- Accessibility testing with screen readers