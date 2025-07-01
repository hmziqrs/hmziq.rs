# PROJECT_STATE_AI_REFERENCE

## CORE_STACK
- next@15.3.3, react@19.1.0, typescript@5.8.3
- bun_package_manager, tailwindcss@4.0.0
- three@0.173.0, @react-three/fiber@9.0.2

## ENTRY_POINTS
- app/page.tsx:18-47 (dynamic_imports)
- app/layout.tsx:8-41 (root_provider)

## 3D_SYSTEM
- components/three/StarField.tsx:1-912 (LOD_implementation)
  - nearStars:208-287, mediumStars:289-357, farStars:359-413
  - qualityTiers:665-687, shaders:80-206

## 2D_CANVAS_EFFECTS
- components/effects/LightNebula.tsx:1-451 (gradient_cache:163-185)
- components/effects/MeteorShower.tsx:1-1072 (particle_pool:421-461)
- components/effects/StarField2D.tsx:1-135 (simple_stars)

## PERFORMANCE_LAYER
- lib/performance/quality-manager.ts:1-203 (adaptive_tiers:83-104)
- lib/performance/gradient-cache.ts:1-95 (LRU_cache)
- gradientCaches:62-67 (meteor,nebula,particle)

## CONTENT_SECTIONS
- components/sections/Hero.tsx:1-102 (main_entry)
- components/sections/About.tsx:1-51
- components/sections/Skills.tsx:1-181 (tech_grid)
- components/sections/Contact.tsx:1-79 (social_links)

## STATE_FLAGS
- PRODUCTION_READY: true
- VISUAL_EFFECTS: optimized
- PERFORMANCE_ADAPTIVE: enabled
- LEGACY_CODE: /legacy/*
- DEBUG_TOOLS: components/debug/VisualQualityTest.tsx

## RECENT_OPTIMIZATIONS
- gradient_caching: 98%_hit_rate
- viewport_culling: enabled
- quality_tiers: 3_levels
- particle_pooling: active
- LOD_system: implemented

## CRITICAL_PATHS
- dynamic_import_3d: app/page.tsx:18-21
- quality_detection: lib/performance/quality-manager.ts:151-169
- effect_compositing: app/page.tsx:79-86