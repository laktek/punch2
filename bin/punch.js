#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Determine binary name based on platform
const binaryName = process.platform === 'win32' ? 'punch.exe' : 'punch-bin';
const binaryPath = path.join(__dirname, binaryName);

// Check if binary exists
if (!fs.existsSync(binaryPath)) {
  console.error('Punch binary not found!');
  console.error('Please try reinstalling: npm install punch-cli');
  process.exit(1);
}

// Execute the binary with all arguments
const child = spawn(binaryPath, process.argv.slice(2), {
  stdio: 'inherit',
  windowsHide: false
});

child.on('exit', (code) => {
  process.exit(code);
});
