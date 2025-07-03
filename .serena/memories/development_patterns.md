# Development Patterns & Best Practices

## React Patterns
- **Function components only** - no class components
- **Custom hooks** for reusable logic
- **TypeScript interfaces** for all props and complex types
- **Error boundaries** for Three.js components to handle WebGL errors
- **Suspense boundaries** for async component loading

## Performance Patterns
- **Dynamic imports** for heavy components (Three.js, effects)
- **Memoization** with `React.memo()` for expensive renders
- **useCallback/useMemo** for stable references in dependencies
- **Object pooling** for frequently created objects
- **WASM integration** for performance-critical calculations

## Three.js Integration Patterns
```typescript
// Preferred pattern for Three.js components
const StarField = dynamic(() => import('@/components/three/StarField'), {
  ssr: false,
  loading: () => <div className="loading-placeholder" />
})
```

## Animation Patterns
- **Framer Motion** for declarative animations
- **requestAnimationFrame** for custom animations
- **Intersection Observer** for scroll-triggered effects
- **CSS transforms** over position changes for performance
- **Will-change** property for optimized animations

## File Organization Patterns
- Group related components in directories
- Separate concerns: UI, effects, performance, debug
- Use index files for clean imports
- Co-locate types with components when specific to that component

## Error Handling Patterns
- Try-catch blocks around WebGL operations
- Graceful degradation for unsupported features
- Error boundaries for component isolation
- User-friendly error messages for Three.js failures

## State Management
- **React state** for component-local state
- **Context API** for theme/settings if needed
- **Refs** for imperative Three.js operations
- **Custom hooks** for complex state logic