/**
 * Arcange AI Assistant - Production Build Script
 * Builds frontend assets and prepares them for Electron packaging.
 * This script is designed to work both locally and in CI (GitHub Actions).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(rootDir, 'frontend');
const frontendDistDir = path.resolve(frontendDir, 'dist');

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFilesList(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFilesList(filePath, fileList);
    } else {
      fileList.push({ path: filePath, size: stat.size });
    }
  }
  return fileList;
}

function runBuild() {
  console.log('====================================================');
  console.log('  Building Arcange AI Assistant for Production');
  console.log('====================================================\n');

  // Step 1: Verify frontend dependencies are installed
  const nodeModulesDir = path.join(frontendDir, 'node_modules');
  if (!fs.existsSync(nodeModulesDir)) {
    console.log('[0/3] Installing frontend dependencies...');
    execSync('npm install', {
      cwd: frontendDir,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
  }

  // Step 2: Build frontend (tsc + vite build)
  console.log('\n[1/3] Building frontend (tsc + vite build)...');
  execSync('npm run build', {
    cwd: frontendDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  if (!fs.existsSync(frontendDistDir)) {
    throw new Error(`Frontend build output not found at: ${frontendDistDir}`);
  }

  // Step 3: Verify build output
  console.log('\n[2/3] Verifying build output...');
  const indexPath = path.join(frontendDistDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`index.html not found in frontend/dist — build may have failed`);
  }
  console.log('index.html found:', fs.existsSync(indexPath));

  // Step 4: Log file sizes
  console.log('\n[3/3] Build output summary:\n');
  const files = getFilesList(frontendDistDir);
  let totalSize = 0;

  console.log('Generated Files:');
  console.log('----------------------------------------------------');
  files.forEach((file) => {
    const relativePath = path.relative(frontendDistDir, file.path);
    totalSize += file.size;
    console.log(`  ${relativePath.padEnd(40)} [${formatBytes(file.size)}]`);
  });
  console.log('----------------------------------------------------');
  console.log(`Total: ${formatBytes(totalSize)} (${files.length} files)\n`);

  console.log('Build completed successfully!');
}

try {
  runBuild();
} catch (error) {
  console.error('\nBuild failed:', error.message || error);
  process.exit(1);
}
