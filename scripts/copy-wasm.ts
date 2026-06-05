import { mkdirSync, existsSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Ensure directories exist
const publicWasmDir = join(__dirname, '..', 'public', 'wasm', 'pkg')
mkdirSync(publicWasmDir, { recursive: true })

// Copy WASM files from build output to public directory
const wasmPkgDir = join(__dirname, '..', 'wasm', 'pkg')

// Check if WASM package directory exists
if (!existsSync(wasmPkgDir)) {
  console.error('WASM package directory not found. Run "bun run build:wasm" first.')
  process.exit(1)
}

// Copy all necessary files
const filesToCopy = ['hmziq_wasm_bg.wasm', 'hmziq_wasm.js', 'hmziq_wasm.d.ts']

for (const file of filesToCopy) {
  const src = join(wasmPkgDir, file)
  const dest = join(publicWasmDir, file)

  if (existsSync(src)) {
    copyFileSync(src, dest)
    console.log(`Copied ${file} to public/wasm/pkg/`)
  }
}

console.log('WASM files copied successfully!')
