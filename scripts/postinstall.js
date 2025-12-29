#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Determine the target platform
function getTarget() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'win32') {
    return 'x86_64-pc-windows-msvc';
  } else if (platform === 'darwin') {
    if (arch === 'arm64') {
      return 'aarch64-apple-darwin';
    }
    return 'x86_64-apple-darwin';
  } else if (platform === 'linux') {
    if (arch === 'arm64') {
      return 'aarch64-unknown-linux-gnu';
    }
    return 'x86_64-unknown-linux-gnu';
  }

  throw new Error(`Unsupported platform: ${platform} ${arch}`);
}

// Download file from URL
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        fs.unlinkSync(dest);
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close(() => {
          // Make the file executable
          fs.chmodSync(dest, 0o755);
          resolve();
        });
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function install() {
  try {
    const target = getTarget();
    console.log(`Installing Punch for ${target}...`);

    // Get version from package.json
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const version = packageJson.version;

    // Construct download URL
    let downloadUrl;
    if (version === '0.0.0' || version.includes('-')) {
      // Development version - use latest
      downloadUrl = `https://github.com/laktek/punch2/releases/latest/download/punch-${target}`;
    } else {
      downloadUrl = `https://github.com/laktek/punch2/releases/download/v${version}/punch-${target}`;
    }

    // Create bin directory if it doesn't exist
    const binDir = path.join(__dirname, '..', 'bin');
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    // Determine binary name
    const binaryName = process.platform === 'win32' ? 'punch.exe' : 'punch-bin';
    const binaryPath = path.join(binDir, binaryName);

    // Download binary
    console.log(`Downloading from ${downloadUrl}...`);
    await download(downloadUrl, binaryPath);

    console.log('Punch installed successfully!');
    console.log(`Run 'npx punch --help' to get started`);
  } catch (error) {
    console.error('Failed to install Punch:', error.message);
    console.error('\nYou can manually install Punch using:');
    console.error('curl -fsSL https://raw.githubusercontent.com/laktek/punch2/main/scripts/install.sh | sh');
    process.exit(1);
  }
}

install();
