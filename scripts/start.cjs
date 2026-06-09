#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
process.chdir(rootDir);

const nextCli = path.join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next');
const args = process.argv.slice(2);

// Check if build output exists, if not run build first
const buildOutputPath = path.join(rootDir, '.next', 'server', 'webpack-runtime.js');
if (!fs.existsSync(buildOutputPath)) {
  console.log('[ziii] Build output not found, running build first...');
  const buildChild = spawn(process.execPath, [nextCli, 'build'], {
    stdio: 'inherit',
  });
  
  buildChild.on('exit', (code) => {
    if (code !== 0) {
      process.exit(code);
    }
    runStart();
  });
} else {
  runStart();
}

function runStart() {
  console.log(`[ziii] Running: next start ${args.join(' ')}`);
  const child = spawn(process.execPath, [nextCli, 'start', ...args], {
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });

  child.on('error', (err) => {
    console.error('[ziii] Error:', err);
    process.exit(1);
  });
}
