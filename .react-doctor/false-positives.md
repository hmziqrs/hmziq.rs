# False Positives

## no-pure-black-background

- `src/components/three/StarField.tsx` — Intentional: project uses pure black (#000000) per design system in CLAUDE.md
- `src/routes/__root.tsx` — Intentional: project uses pure black (#000000) per design system in CLAUDE.md
- `src/routes/index.tsx` — Intentional: project uses pure black (#000000) per design system in CLAUDE.md (including ErrorBoundary fallback)

## no-unknown-property

- `src/components/three/ScatterText/index.tsx` — Three.js/R3F component props (geometry, material) are valid
- `src/components/three/StarField.tsx` — Three.js/R3F component props (ref, intensity) are valid

## only-export-components

- `src/routes/__root.tsx` — TanStack Router convention: Route export references shellComponent defined in same file

## no-react19-deprecated-apis

- `src/contexts/WASMContext.tsx` — useContext is standard in React 19 client components; use() is for server components

## jsx-no-constructed-context-values

- `src/contexts/WASMContext.tsx` — React Compiler handles memoization; useMemo was flagged as dead weight by react-compiler rule

## no-aria-hidden-on-focusable

- `src/components/three/ScatterText/index.tsx` — Canvas is not focusable (no tabindex/role), invisible utility class, aria-hidden is correct

## no-dynamic-import-path

- `src/lib/wasm/core.ts` — WASM module loader uses intentional dynamic import with @vite-ignore; path is always the same literal

## no-pass-data-to-parent

- `src/components/three/ScatterText/index.tsx` — PixelGenerator requires canvas render for image data extraction; callback is the correct pattern here

## no-prop-callback-in-effect

- `src/components/three/ScatterText/index.tsx` — Same as no-pass-data-to-parent; canvas-based pixel extraction requires effect timing

## no-initialize-state

- `src/components/three/ScatterText/index.tsx` — Container size requires DOM measurement after mount; ref callback creates new function references on every render

## refs

- `src/components/three/ScatterText/index.tsx` — Container size measurement requires reading ref after mount; ref callback pattern is worse for React Compiler

## no-event-handler

- `src/components/three/StarField.tsx` — useEffect for material cleanup and shared memory initialization is legitimate side-effect synchronization, not a fake event handler

## react-compiler-no-manual-memoization

- `src/components/three/StarField.tsx` — useMemo for starGroup is required because removing it causes no-effect-with-fresh-deps regression; React Compiler cannot stabilize the object identity here

## todo

- `src/components/three/ScatterText/index.tsx` — React Compiler limitation: cannot optimize throw statements inside try/catch (BuildHIR::lowerStatement). The throw is a null guard for canvas.getContext('2d') which is correct defensive code

## unused-file

- `public/wasm/pkg/hmziq_wasm.js` — WASM build artifact loaded dynamically at runtime, not statically importable

## unused-dev-dependency

- `@tanstack/devtools-a11y` — Peer dependency of @tanstack/devtools-vite
- `@tanstack/react-devtools` — Peer dependency of @tanstack/devtools-vite
- `@tanstack/react-query-devtools` — Peer dependency of @tanstack/devtools-vite
- `@tanstack/react-router-devtools` — Peer dependency of @tanstack/devtools-vite
