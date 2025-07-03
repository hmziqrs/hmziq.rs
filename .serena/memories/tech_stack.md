# Tech Stack

## Runtime & Package Manager
- **Bun** (latest version) - Used instead of npm/node
- **IMPORTANT**: Always use `bun` commands, never `npm` or `node`

## Framework & Core Technologies
- **Next.js 15+** (App Router)
- **React 19+** with TypeScript
- **TypeScript 5.8+** (strict mode enabled)

## UI & Styling
- **shadcn/ui** (latest version) - UI component library
- **Tailwind CSS v4** (CSS-first configuration)
- **Framer Motion 12+** - For declarative animations
- **CSS-in-JS**: Inline styles for performance-critical components

## 3D Graphics & Effects
- **Three.js 0.177+** - For star simulation and 3D animations
- **@react-three/fiber** - React integration for Three.js
- **@react-three/drei** - Three.js utilities and helpers

## Performance Optimization
- **WebAssembly (WASM)** - Rust-based particle systems
- **Rust** - For high-performance calculations

## Development Tools
- **ESLint** with TypeScript support and Next.js config
- **Prettier** - Code formatting
- **PostCSS** with Tailwind CSS v4

## Key Dependencies
- `clsx` and `tailwind-merge` - for className management
- `@types/three` - TypeScript definitions for Three.js