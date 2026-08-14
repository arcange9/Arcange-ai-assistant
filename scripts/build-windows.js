/**
 * Arcange AI Assistant - Windows Build Script
 * Runs frontend build, then triggers electron-builder for Windows targets.
 * Produces: ArcangeAI-Setup.exe (NSIS installer) and ArcangeAI.exe (portable)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function buildWindows() {
  console.log('====================================================');
  console.log('  Building Arcange AI Assistant — Windows');
  console.log('====================================================\n');

  try {
    // Step 1: Build frontend
    console.log('[1/3] Building frontend assets...');
    execSync(`node "${path.join(__dirname, 'build.js')}"`, {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    // Step 2: Run electron-builder
    console.log('\n[2/3] Running electron-builder --win --x64...\n');
    execSync('npx electron-builder --win --x64 --config electron-builder.yml', {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    // Step 3: Ensure correct artifact names
    console.log('\n[3/3] Verifying and renaming build artifacts...\n');

    if (!fs.existsSync(distDir)) {
      throw new Error('dist/ directory not found — build may have failed');
    }

    // Find and rename the NSIS setup installer to ArcangeAI-Setup.exe
    const targetSetupName = path.join(distDir, 'ArcangeAI-Setup.exe');
    if (!fs.existsSync(targetSetupName)) {
      const files = fs.readdirSync(distDir);
      const setupMatch = files.find(f =>
        f.endsWith('.exe') &&
        (f.toLowerCase().includes('setup') || f.toLowerCase().includes('installer')) &&
        !f.includes('ArcangeAI.exe')
      );
      if (setupMatch) {
        fs.renameSync(
          path.join(distDir, setupMatch),
          targetSetupName
        );
        console.log(`  Renamed: ${setupMatch} → ArcangeAI-Setup.exe`);
      } else {
        console.log('  WARNING: Could not find NSIS installer to rename');
      }
    }

    // Report results
    console.log('\n====================================================');
    console.log('  Windows Build Summary');
    console.log('====================================================\n');

    const setupPath = path.join(distDir, 'ArcangeAI-Setup.exe');
    const portablePath = path.join(distDir, 'ArcangeAI.exe');

    if (fs.existsSync(setupPath)) {
      const stats = fs.statSync(setupPath);
      console.log(`  Installer : ArcangeAI-Setup.exe  (${formatBytes(stats.size)})`);
    } else {
      console.log('  WARNING: ArcangeAI-Setup.exe not found');
    }

    if (fs.existsSync(portablePath)) {
      const stats = fs.statSync(portablePath);
      console.log(`  Portable : ArcangeAI.exe         (${formatBytes(stats.size)})`);
    } else {
      console.log('  WARNING: ArcangeAI.exe not found');
    }

    console.log('\n  Build completed successfully!');
    console.log('====================================================\n');

  } catch (error) {
    console.error('\nBuild failed:', error.message || error);
    process.exit(1);
  }
}

buildWindows();
