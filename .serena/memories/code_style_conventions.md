# Code Style & Conventions

## TypeScript Configuration

- **Strict mode**: Enabled (`strict: true`)
- **Target**: ES2017
- **Module**: ESNext with bundler resolution
- **JSX**: preserve (handled by Next.js)
- **Path mapping**: `@/*` maps to project root

## ESLint Rules

- Extends Next.js core web vitals
- TypeScript parser and plugin enabled
- Key rules:
  - `@typescript-eslint/no-unused-vars: error`
  - `@typescript-eslint/no-explicit-any: warn`
  - `prefer-const: error`
  - `no-var: error`
  - `react-hooks/exhaustive-deps: warn`

## Prettier Configuration

- **No semicolons** (`semi: false`)
- **Single quotes** (`singleQuote: true`)
- **Print width**: 100 characters
- **Tab width**: 2 spaces (no tabs)
- **Trailing commas**: ES5 style
- **Arrow parens**: always
- **Line endings**: LF

## File Naming Conventions

- React components: PascalCase (e.g., `Hero.tsx`, `StarField.tsx`)
- Utilities: camelCase (e.g., `utils.ts`, `performance-utils.ts`)
- Directories: kebab-case or camelCase
- Constants: UPPER_SNAKE_CASE

## Code Organization

- Use absolute imports with `@/` prefix
- Group imports: external libraries first, then internal modules
- Export components as default when single export
- Use named exports for utilities and multiple exports

## Component Patterns

- Prefer function components over class components
- Use TypeScript interfaces for props
- Implement proper error boundaries for 3D components
- Use `dynamic` imports for client-side only components (Three.js)
- Always include loading states for dynamic imports
