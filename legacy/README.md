# Legacy Files

This folder contains files that are no longer actively used in the current codebase but are preserved for reference or potential future use.

## Components

### Effects
- `LightNebula2D.tsx` - Original light nebula implementation (replaced by LightNebula2DOptimized.tsx)
- `MeteorShower2D.tsx` - Original meteor shower implementation (replaced by MeteorShower2DOptimized.tsx)

### Three.js Components
- `OptimizedStarFieldWithCulling.tsx` - Star field with frustum culling (not currently used)
- `SimpleStarField.tsx` - Basic Three.js star field implementation
- `SpaceRocket.tsx` - 3D space rocket component
- `StarField.tsx` - Original Three.js star field implementation
- `TestCube.tsx` - Test/demo cube component

### Other Components
- `LoadingSpinner.tsx` - Generic loading spinner component

## Hooks
- `useScrollProgress.ts` - Hook for tracking scroll progress (used by legacy StarField)
- `useViewportSize.ts` - Hook for tracking viewport dimensions (used by legacy StarField)

## Libraries
- `three-utils.ts` - Three.js utility functions (used by legacy StarField components)

## Types
- `index.ts` - Global type definitions (types now defined inline where needed)

## Why These Files Are Here

These files were moved to legacy because:
1. They have been replaced by optimized versions
2. They are experimental components not used in production
3. They are utility functions only used by other legacy components
4. They represent older architectural decisions that have been superseded

All files are functional and can be restored if needed.