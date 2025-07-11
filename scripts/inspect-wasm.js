#!/usr/bin/env node

/**
 * WebAssembly SIMD inspection tool
 * Analyzes the generated WASM file for SIMD instructions
 */

const fs = require('fs');
const path = require('path');

// WASM SIMD opcodes (partial list)
const SIMD_OPCODES = {
  // v128 operations
  0xfd0c: 'v128.const',
  0xfd15: 'v128.load',
  0xfd16: 'v128.store',
  
  // i32x4 operations
  0xfd51: 'i32x4.splat',
  0xfd52: 'i32x4.extract_lane',
  0xfd53: 'i32x4.replace_lane',
  0xfd54: 'i32x4.eq',
  0xfd55: 'i32x4.ne',
  0xfd56: 'i32x4.lt_s',
  0xfd57: 'i32x4.lt_u',
  0xfd58: 'i32x4.gt_s',
  0xfd59: 'i32x4.gt_u',
  0xfd5a: 'i32x4.le_s',
  0xfd5b: 'i32x4.le_u',
  0xfd5c: 'i32x4.ge_s',
  0xfd5d: 'i32x4.ge_u',
  0xfd70: 'i32x4.add',
  0xfd71: 'i32x4.sub',
  0xfd73: 'i32x4.mul',
  
  // f32x4 operations
  0xfd8d: 'f32x4.splat',
  0xfd8e: 'f32x4.extract_lane',
  0xfd8f: 'f32x4.replace_lane',
  0xfd90: 'f32x4.eq',
  0xfd91: 'f32x4.ne',
  0xfd92: 'f32x4.lt',
  0xfd93: 'f32x4.gt',
  0xfd94: 'f32x4.le',
  0xfd95: 'f32x4.ge',
  0xfd9e: 'f32x4.add',
  0xfd9f: 'f32x4.sub',
  0xfda0: 'f32x4.mul',
  0xfda1: 'f32x4.div',
  0xfda2: 'f32x4.min',
  0xfda3: 'f32x4.max',
  0xfda4: 'f32x4.pmin',
  0xfda5: 'f32x4.pmax',
  
  // i8x16 operations
  0xfd61: 'i8x16.splat',
  0xfd67: 'i8x16.eq',
  0xfd68: 'i8x16.ne',
  
  // Select operations
  0xfd0d: 'v128.bitselect',
  0xfd0e: 'v128.andnot',
  0xfd0f: 'v128.and',
  0xfd10: 'v128.or',
  0xfd11: 'v128.xor',
  0xfd12: 'v128.not'
};

function analyzeWasm(filePath) {
  console.log(`🔍 Analyzing WebAssembly file: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }
  
  const buffer = fs.readFileSync(filePath);
  const bytes = new Uint8Array(buffer);
  
  console.log(`📊 File size: ${bytes.length} bytes`);
  
  // Check WASM magic number
  const magic = Array.from(bytes.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('');
  if (magic !== '0061736d') {
    console.error(`❌ Invalid WASM magic number: ${magic}`);
    return;
  }
  
  console.log(`✅ Valid WebAssembly file`);
  
  // Look for SIMD instructions
  const simdInstructions = new Map();
  let simdCount = 0;
  
  for (let i = 0; i < bytes.length - 1; i++) {
    // Look for SIMD prefix (0xfd)
    if (bytes[i] === 0xfd && i + 1 < bytes.length) {
      const opcode = (0xfd << 8) | bytes[i + 1];
      const instruction = SIMD_OPCODES[opcode];
      
      if (instruction) {
        simdCount++;
        simdInstructions.set(instruction, (simdInstructions.get(instruction) || 0) + 1);
      }
    }
  }
  
  console.log(`\n🚀 SIMD Analysis Results:`);
  
  if (simdCount === 0) {
    console.log(`❌ No SIMD instructions found`);
    console.log(`   This suggests SIMD was not enabled during compilation`);
  } else {
    console.log(`✅ Found ${simdCount} SIMD instructions`);
    console.log(`\n📋 SIMD Instruction Breakdown:`);
    
    const sortedInstructions = Array.from(simdInstructions.entries())
      .sort((a, b) => b[1] - a[1]);
    
    for (const [instruction, count] of sortedInstructions) {
      console.log(`   ${instruction}: ${count} occurrences`);
    }
  }
  
  // Look for function exports
  console.log(`\n📤 Checking for SIMD-related exports...`);
  const fileContent = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));
  
  const simdFunctions = [
    'calculate_effects_into_buffers_simd',
    'cull_stars_by_frustum_simd',
    'calculate_star_effects_temporal_simd',
    'is_simd_enabled',
    'get_simd_info'
  ];
  
  let foundExports = 0;
  for (const funcName of simdFunctions) {
    if (fileContent.includes(funcName)) {
      console.log(`   ✅ Found: ${funcName}`);
      foundExports++;
    }
  }
  
  if (foundExports === 0) {
    console.log(`   ⚠️  No SIMD-related function exports found`);
  }
  
  return {
    simdInstructionCount: simdCount,
    simdInstructions: Object.fromEntries(simdInstructions),
    hasSimd: simdCount > 0,
    fileSize: bytes.length
  };
}

function compareBuilds(simdPath, nonSimdPath) {
  console.log(`\n🔄 Comparing SIMD vs Non-SIMD builds:`);
  
  const simdResult = analyzeWasm(simdPath);
  console.log(`\n${'='.repeat(50)}`);
  const nonSimdResult = analyzeWasm(nonSimdPath);
  
  console.log(`\n📊 Comparison Summary:`);
  console.log(`   SIMD build: ${simdResult.simdInstructionCount} SIMD instructions`);
  console.log(`   Non-SIMD build: ${nonSimdResult.simdInstructionCount} SIMD instructions`);
  console.log(`   Size difference: ${simdResult.fileSize - nonSimdResult.fileSize} bytes`);
  
  if (simdResult.simdInstructionCount > nonSimdResult.simdInstructionCount) {
    console.log(`   ✅ SIMD build contains more SIMD instructions as expected`);
  } else {
    console.log(`   ⚠️  Unexpected: SIMD build doesn't have more SIMD instructions`);
  }
}

// CLI interface
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`Usage: node inspect-wasm.js <path-to-wasm-file> [path-to-compare-file]`);
  console.log(`\nExamples:`);
  console.log(`  node inspect-wasm.js wasm/pkg/hmziq_wasm_bg.wasm`);
  console.log(`  node inspect-wasm.js build1.wasm build2.wasm`);
  process.exit(1);
}

if (args.length === 1) {
  analyzeWasm(args[0]);
} else {
  compareBuilds(args[0], args[1]);
}