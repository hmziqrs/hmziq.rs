# WASM Performance Optimization Module

## Prerequisites

1. Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
2. Install wasm-pack: `curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh`
3. Add WASM target: `rustup target add wasm32-unknown-unknown`

## Building

```bash
# Development build
bun run build:wasm:dev

# Production build
bun run build:wasm
```

## Testing

1. Build the WASM module: `bun run build:wasm:dev`
2. Start the dev server: `bun dev`
3. Open http://localhost:3000
4. Look for the "WASM Integration Test" box in the bottom-left corner

## Module Structure

- `src/lib.rs` - Main module entry point
- `src/star_field.rs` - Star position generation (TODO)
- `src/particles.rs` - Particle system management (TODO)
- `src/math.rs` - Math utilities (TODO)
- `src/bezier.rs` - Bezier curve calculations (TODO)

## Integration

The WASM module is loaded via `/lib/wasm/index.ts` which provides:
- Automatic WASM loading with fallback
- TypeScript types
- JavaScript fallback implementations

## Performance Targets

- Star field calculations: 10x speedup
- Particle updates: 5x speedup
- Overlap detection: O(n²) → O(n log n)