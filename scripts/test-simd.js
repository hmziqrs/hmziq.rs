#!/usr/bin/env node

/**
 * SIMD testing script - builds and compares SIMD vs non-SIMD versions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, description) {
  console.log(`\n🔧 ${description}`);
  console.log(`Running: ${command}`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    if (output.trim()) {
      console.log(output);
    }
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (error.stdout) console.log('STDOUT:', error.stdout);
    if (error.stderr) console.log('STDERR:', error.stderr);
    return false;
  }
}

function backupExisting() {
  const pkgPath = 'wasm/pkg';
  const backupPath = 'wasm/pkg-backup';
  
  if (fs.existsSync(pkgPath)) {
    console.log('📁 Backing up existing pkg directory');
    if (fs.existsSync(backupPath)) {
      execSync(`rm -rf ${backupPath}`);
    }
    execSync(`mv ${pkgPath} ${backupPath}`);
  }
}

function restoreBackup() {
  const pkgPath = 'wasm/pkg';
  const backupPath = 'wasm/pkg-backup';
  
  if (fs.existsSync(backupPath)) {
    if (fs.existsSync(pkgPath)) {
      execSync(`rm -rf ${pkgPath}`);
    }
    execSync(`mv ${backupPath} ${pkgPath}`);
    console.log('📁 Restored original pkg directory');
  }
}

async function main() {
  console.log('🚀 SIMD Testing Script');
  console.log('='.repeat(50));
  
  // Backup existing build
  backupExisting();
  
  try {
    // Build with SIMD
    console.log('\n📦 Building with SIMD enabled...');
    const simdSuccess = runCommand('bun run build:wasm', 'Building WASM with SIMD');
    
    if (!simdSuccess) {
      console.error('❌ SIMD build failed');
      restoreBackup();
      return;
    }
    
    // Copy SIMD build
    const simdWasmPath = 'wasm/pkg/hmziq_wasm_bg.wasm';
    const simdBackupPath = 'wasm-simd-build.wasm';
    
    if (fs.existsSync(simdWasmPath)) {
      execSync(`cp ${simdWasmPath} ${simdBackupPath}`);
      console.log(`✅ SIMD build saved to ${simdBackupPath}`);
    }
    
    // Analyze SIMD build
    console.log('\n🔍 Analyzing SIMD build...');
    runCommand(`node scripts/inspect-wasm.js ${simdBackupPath}`, 'Analyzing SIMD WASM');
    
    // Build without SIMD
    console.log('\n📦 Building without SIMD...');
    const nonSimdSuccess = runCommand('bun run build:wasm:no-simd', 'Building WASM without SIMD');
    
    if (!nonSimdSuccess) {
      console.error('❌ Non-SIMD build failed');
      restoreBackup();
      return;
    }
    
    // Copy non-SIMD build
    const nonSimdBackupPath = 'wasm-no-simd-build.wasm';
    
    if (fs.existsSync(simdWasmPath)) {
      execSync(`cp ${simdWasmPath} ${nonSimdBackupPath}`);
      console.log(`✅ Non-SIMD build saved to ${nonSimdBackupPath}`);
    }
    
    // Compare builds
    console.log('\n🔄 Comparing builds...');
    runCommand(
      `node scripts/inspect-wasm.js ${simdBackupPath} ${nonSimdBackupPath}`,
      'Comparing SIMD vs Non-SIMD builds'
    );
    
    // Test with current build (should be non-SIMD)
    console.log('\n🧪 Testing current WASM module...');
    const testCode = `
      import init, { is_simd_enabled, get_simd_info } from './wasm/pkg/hmziq_wasm.js';
      
      async function test() {
        await init();
        console.log('SIMD Enabled:', is_simd_enabled());
        console.log('SIMD Info:', get_simd_info());
      }
      
      test().catch(console.error);
    `;
    
    fs.writeFileSync('test-simd-temp.mjs', testCode);
    runCommand('node test-simd-temp.mjs', 'Testing WASM SIMD detection');
    fs.unlinkSync('test-simd-temp.mjs');
    
    // Restore SIMD build
    console.log('\n🔄 Restoring SIMD build for development...');
    if (fs.existsSync(simdBackupPath)) {
      execSync(`cp ${simdBackupPath} ${simdWasmPath}`);
      console.log('✅ SIMD build restored');
    }
    
    console.log('\n✅ SIMD testing complete!');
    console.log('\nFiles created:');
    console.log(`  - ${simdBackupPath} (SIMD-enabled build)`);
    console.log(`  - ${nonSimdBackupPath} (SIMD-disabled build)`);
    console.log('\nTo test in browser:');
    console.log('  1. Run: bun run dev');
    console.log('  2. Open browser console');
    console.log('  3. Look for SIMD status messages');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  } finally {
    // Always try to restore if something went wrong
    if (!fs.existsSync('wasm/pkg')) {
      restoreBackup();
    }
  }
}

main().catch(console.error);