#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
process.chdir(rootDir);

const nextCli = path.join(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next');
const args = process.argv.slice(2);

console.log(`[ziii] Running: next lint ${args.join(' ')}`);

const child = spawn(process.execPath, [nextCli, 'lint', ...args], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('[ziii] Error:', err);
  process.exit(1);
});
