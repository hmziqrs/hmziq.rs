# Legacy Files

This folder contains files that are no longer actively used in the current codebase but are preserved for reference or potential future use.

## Components

### Effects

- `LightNebula.tsx` - Optimized light nebula implementation (moved to legacy)
- `LightNebula2D.tsx` - Original light nebula implementation (replaced by LightNebula2DOptimized.tsx)
- `MeteorShower2D.tsx` - Original meteor shower implementation (replaced by MeteorShower2DOptimized.tsx)
- `Nebula2D.tsx` - Basic 2D nebula implementation

### Three.js Components

- `OptimizedStarFieldWithCulling.tsx` - Star field with frustum culling (not currently used)
- `SimpleStarField.tsx` - Basic Three.js star field implementation
- `SpaceRocket.tsx` - 3D space rocket component
- `StarField.tsx` - Original Three.js star field implementation
- `TestCube.tsx` - Test/demo cube component

### Other Components

- `LoadingSpinner.tsx` - Generic loading spinner component

### Performance Components

- `performance/performance-monitor.tsx` - Debug UI overlay for monitoring FPS, quality tiers, and performance metrics

## Hooks

- `useScrollProgress.ts` - Hook for tracking scroll progress (used by legacy StarField)
- `useViewportSize.ts` - Hook for tracking viewport dimensions (used by legacy StarField)

## Libraries

- `three-utils.ts` - Three.js utility functions (used by legacy StarField components)

### WASM Utilities

- `lib/wasm/nebula-spatial.ts` - Spatial indexing for nebula overlap detection

### Performance Utilities

- `lib/performance/debug-config.ts` - Debug configuration manager with localStorage persistence (replaced by silent operation)
- `lib/performance/gradient-cache.ts` - Canvas gradient caching system with LRU eviction (used only by nebula)
- `lib/performance/performance-utils.ts` - Frame timing, object pooling, Bezier calculations, spatial grid (used only by legacy components)
- `lib/performance/quality-manager.ts` - Quality tier management system (replaced by ultra-only rendering)

### Rust/WASM Source

- `wasm/src/nebula_system.rs` - Rust implementation for nebula particle system
- `wasm/src/bezier.rs` - Bezier path calculation functions (used only in meteor system)
- `wasm/src/physics_utils.rs` - Physics simulation utilities (used only in meteor system)
- `wasm/src/spatial.rs` - Spatial indexing and grid systems (used only in nebula system)
- `wasm/src/memory.rs` - Memory management and buffer operations (not used anywhere)
- `wasm/src/batch_transfer.rs` - Batch data transfer utilities (not used anywhere)
- `wasm/src/lib.rs` - Legacy module configuration

### WASM Interfaces

- `lib/wasm/unused-wasm-interfaces.ts` - Complete TypeScript interfaces for all legacy WASM functions

## Types

- `index.ts` - Global type definitions (types now defined inline where needed)

## Why These Files Are Here

These files were moved to legacy because:

1. They have been replaced by optimized versions
2. They are experimental components not used in production
3. They are utility functions only used by other legacy components
4. They represent older architectural decisions that have been superseded
5. They are debug/development tools not needed in production (performance monitor)
6. They are WASM functions and Rust modules only used by legacy components or not used at all

### WASM Cleanup Details

The active codebase now only includes essential WASM functions:

- Star generation (positions, colors, sizes)
- Star effects (twinkle/sparkle calculations with temporal coherence)
- Frustum culling (visibility optimization)
- Basic math utilities (fast trigonometric functions)

Moved to legacy:

- All Bezier functions (meteor system only)
- All physics utilities (meteor system only)
- All spatial indexing (nebula system only)
- All memory management (unused)
- All batch transfer utilities (unused)
- LOD and quality tier functions (removed from simplified StarField)

All files are functional and can be restored if needed.
