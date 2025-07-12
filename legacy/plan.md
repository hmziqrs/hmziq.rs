# Implementation Plan for hmziq.rs

## Project Overview

Personal landing page for @hmziqrs featuring creative visual experiences with canvas-based parallax animations, 3D components, and a space-themed background with star simulation.

## Current State

- Basic Next.js project initialized with TypeScript
- No actual implementation started
- Missing required dependencies and project structure
- Using npm instead of Bun as specified

## Phase 1: Project Setup & Configuration (Priority: Critical)

### 1.1 Switch to Bun Package Manager

- [ ] Remove `node_modules` and `package-lock.json`
- [ ] Install Bun globally if not already installed
- [ ] Run `bun install` to reinstall dependencies with Bun
- [ ] Verify `bun.lockb` is created

### 1.2 Install Core Dependencies

- [ ] Install Tailwind CSS v4 beta
  ```bash
  bun add -d tailwindcss@next @tailwindcss/vite
  ```
- [ ] Install Three.js ecosystem
  ```bash
  bun add three @react-three/fiber @react-three/drei
  ```
- [ ] Install animation libraries
  ```bash
  bun add framer-motion
  ```
- [ ] Install shadcn/ui CLI
  ```bash
  bun add -d @shadcn/ui
  ```
- [ ] Install development tools
  ```bash
  bun add -d eslint eslint-config-next prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin
  ```

### 1.3 Configure Tailwind CSS v4

- [ ] Create `app/globals.css` with Tailwind v4 imports
- [ ] Set up CSS-first configuration approach
- [ ] Define custom color palette (monochrome with space theme accents)
- [ ] Configure typography and spacing scales

### 1.4 Initialize shadcn/ui

- [ ] Run `bunx shadcn@latest init`
- [ ] Choose default theme with custom colors
- [ ] Configure components path as `components/ui`
- [ ] Set up CSS variables for theming

### 1.5 Create Project Structure

```
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── three/           # 3D components
│   │   ├── StarField.tsx
│   │   ├── Scene.tsx
│   │   └── Canvas.tsx
│   └── sections/        # Page sections
│       ├── Hero.tsx
│       ├── About.tsx
│       ├── Skills.tsx
│       └── Contact.tsx
├── lib/
│   ├── utils.ts
│   ├── three-utils.ts
│   └── animations.ts
├── hooks/
│   ├── useScrollProgress.ts
│   ├── useReducedMotion.ts
│   └── useViewportSize.ts
├── public/
│   └── (assets)
└── types/
    └── index.ts
```

### 1.6 Configure ESLint & Prettier

- [ ] Create `.eslintrc.json` with Next.js and TypeScript rules
- [ ] Create `.prettierrc` with consistent formatting rules
- [ ] Add pre-commit hooks with husky (optional)

## Phase 2: Core Infrastructure (Priority: High)

### 2.1 Set Up Root Layout

- [ ] Implement root layout with proper metadata
- [ ] Add font configuration (Inter or similar clean font)
- [ ] Set up viewport and theme color meta tags
- [ ] Implement basic SEO tags

### 2.2 Create Three.js Infrastructure

- [ ] Create reusable Canvas wrapper component
- [ ] Implement performance monitoring
- [ ] Set up proper lighting system
- [ ] Create camera controller with smooth movements
- [ ] Implement resize handlers

### 2.3 Develop Utility Functions

- [ ] Scroll progress calculator
- [ ] Intersection Observer hooks
- [ ] Animation timing functions
- [ ] Color manipulation utilities
- [ ] Performance optimization helpers

### 2.4 Implement Custom Hooks

- [ ] `useScrollProgress`: Track scroll position and progress
- [ ] `useReducedMotion`: Respect accessibility preferences
- [ ] `useViewportSize`: Responsive viewport tracking
- [ ] `useIntersection`: Intersection Observer wrapper
- [ ] `useAnimationFrame`: RAF wrapper for smooth animations

## Phase 3: 3D Components & Animations (Priority: High)

### 3.1 Star Field Implementation

- [ ] Create procedural star generation system
- [ ] Implement different star sizes and brightness
- [ ] Add subtle twinkling animation
- [ ] Optimize for performance (LOD system)
- [ ] Add parallax depth effect
- [ ] Implement proper cleanup on unmount

### 3.2 Background Scene

- [ ] Set up main Three.js scene
- [ ] Implement fog for depth perception
- [ ] Add subtle nebula/cloud effects
- [ ] Create ambient particle system
- [ ] Ensure 60fps performance

### 3.3 Interactive Elements

- [ ] Mouse-following subtle effects
- [ ] Scroll-triggered animations
- [ ] Hover interactions on 3D elements
- [ ] Touch-friendly interactions for mobile

## Phase 4: Content Sections (Priority: High)

### 4.1 Hero Section

- [ ] Implement name typography with custom styling
- [ ] Add professional tagline
- [ ] Create animated entrance effect
- [ ] Implement scroll indicator
- [ ] Add subtle floating animation

### 4.2 About Section

- [ ] Brief professional introduction
- [ ] Years of experience indicator
- [ ] Subtle skill visualization (not a list)
- [ ] Parallax scrolling effect
- [ ] Smooth reveal animation

### 4.3 Skills/Expertise Visualization

- [ ] Create unique visual representation (not typical progress bars)
- [ ] Categorize skills subtly (Frontend, Backend, Cross-platform)
- [ ] Interactive hover states
- [ ] Smooth transitions between states

### 4.4 Contact Section

- [ ] Social links (GitHub, LinkedIn, etc.)
- [ ] Email contact (obfuscated)
- [ ] Smooth scroll-to-top functionality
- [ ] Minimal design approach

## Phase 5: Performance & Polish (Priority: Medium)

### 5.1 Performance Optimization

- [ ] Implement lazy loading for Three.js components
- [ ] Use React.Suspense for loading states
- [ ] Optimize bundle size with dynamic imports
- [ ] Implement progressive enhancement
- [ ] Add performance monitoring

### 5.2 Accessibility

- [ ] Ensure keyboard navigation
- [ ] Add proper ARIA labels
- [ ] Implement skip links
- [ ] Test with screen readers
- [ ] Ensure content works without JavaScript

### 5.3 Responsive Design

- [ ] Mobile-first approach
- [ ] Test on various devices
- [ ] Optimize touch interactions
- [ ] Adjust 3D complexity for mobile
- [ ] Ensure text readability

### 5.4 Animation Polish

- [ ] Fine-tune timing curves
- [ ] Add micro-interactions
- [ ] Implement smooth page transitions
- [ ] Ensure consistent animation language
- [ ] Test reduced motion preferences

## Phase 6: Testing & Deployment (Priority: Low)

### 6.1 Testing Setup

- [ ] Unit tests for utilities
- [ ] Visual regression tests
- [ ] Performance benchmarks
- [ ] Accessibility audits
- [ ] Cross-browser testing

### 6.2 SEO & Metadata

- [ ] Optimize meta descriptions
- [ ] Add Open Graph tags
- [ ] Implement structured data
- [ ] Create sitemap
- [ ] Add robots.txt

### 6.3 Deployment Preparation

- [ ] Environment variable setup
- [ ] Build optimization
- [ ] CDN configuration
- [ ] Domain setup (hmziq.rs)
- [ ] SSL certificate

## Implementation Notes

### Design Principles to Follow

1. **Subtlety**: Effects enhance, never overwhelm
2. **Performance**: Maintain 60fps at all times
3. **Accessibility**: Full functionality without JS
4. **Uniqueness**: Stand out through execution quality
5. **Professionalism**: Clean, sophisticated implementation

### Technical Considerations

- Use `requestAnimationFrame` for custom animations
- Implement proper Three.js resource disposal
- Use CSS transforms for smooth animations
- Batch DOM operations
- Minimize re-renders with proper memoization

### Color Palette

- Background: #000000 (Deep space black)
- Primary Text: #FFFFFF (High contrast white)
- Secondary: #888888 (Subtle gray)
- Accents: #111111, #222222 (Dark grays)
- Effects: Subtle blue/purple for star glow only

### Content Guidelines

- Keep text minimal and impactful
- Focus on visual storytelling
- Avoid typical resume/CV format
- Emphasize creativity and technical prowess
- Maintain professional tone

## Next Steps

1. Complete Phase 1 setup immediately
2. Begin Phase 2 infrastructure in parallel
3. Prototype star field effect early for feasibility
4. Get early feedback on visual direction
5. Iterate on performance throughout development

## Success Metrics

- [ ] Page loads in under 2 seconds
- [ ] Maintains 60fps during animations
- [ ] Passes WCAG 2.1 AA standards
- [ ] Works on all modern browsers
- [ ] Creates memorable first impression
- [ ] Showcases technical capabilities subtly

## Estimated Timeline

- Phase 1: 2-3 hours
- Phase 2: 4-6 hours
- Phase 3: 8-10 hours
- Phase 4: 6-8 hours
- Phase 5: 4-6 hours
- Phase 6: 2-4 hours

**Total: 26-37 hours of focused development**

## Risk Mitigation

- **Performance Issues**: Profile early and often
- **Browser Compatibility**: Test Three.js features early
- **Mobile Performance**: Have fallback for complex 3D
- **Accessibility**: Design with a11y from start
- **Scope Creep**: Stick to minimal viable features first
