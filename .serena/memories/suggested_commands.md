# Suggested Commands

## Development Commands (Bun)

**IMPORTANT**: Always use `bun` instead of `npm` or `node`

### Core Development

- `bun run dev` - Start development server
- `bun run build` - Build for production (includes WASM build)
- `bun run build:wasm` - Build WASM module only
- `bun run build:wasm:dev` - Build WASM module in dev mode
- `bun run start` - Start production server

### Code Quality & Linting

- `bun run lint` - Run ESLint
- `bun run lint:fix` - Run ESLint with auto-fix
- `bun run type-check` - TypeScript type checking (tsc --noEmit)

### Code Formatting

- `bun run format` - Format code with Prettier
- `bun run format:check` - Check formatting without changes

### Package Management

- `bun install` - Install dependencies
- `bun add <package>` - Add new dependency
- `bun add -d <package>` - Add dev dependency
- `bun remove <package>` - Remove dependency

## Task Completion Checklist

When completing coding tasks, ALWAYS run:

1. `bun run lint:fix` - Fix linting issues
2. `bun run type-check` - Ensure TypeScript compliance
3. `bun run format` - Format code
4. `bun run build` - Verify production build works

## System Commands (macOS/Darwin)

- `git status` - Check git status
- `ls -la` - List files with details
- `find . -name "pattern"` - Find files by pattern
- `grep -r "pattern" .` - Search in files (use `rg` if available)
- `cd directory` - Change directory
