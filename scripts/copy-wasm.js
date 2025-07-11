const fs = require('fs')
const path = require('path')

// Ensure directories exist
const publicWasmDir = path.join(__dirname, '..', 'public', 'wasm', 'pkg')
fs.mkdirSync(publicWasmDir, { recursive: true })

// Copy WASM files from build output to public directory
const wasmPkgDir = path.join(__dirname, '..', 'wasm', 'pkg')

// Check if WASM package directory exists
if (!fs.existsSync(wasmPkgDir)) {
  console.error('WASM package directory not found. Run "bun run build:wasm" first.')
  process.exit(1)
}

// Copy all necessary files
const filesToCopy = ['hmziq_wasm_bg.wasm', 'hmziq_wasm.js', 'hmziq_wasm_bg.js', 'hmziq_wasm.d.ts']

filesToCopy.forEach((file) => {
  const src = path.join(wasmPkgDir, file)
  const dest = path.join(publicWasmDir, file)

  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest)
    console.log(`Copied ${file} to public/wasm/pkg/`)
  }
})

console.log('WASM files copied successfully!')
