/**
 * Arcange AI Assistant - Full Packaging Script
 * Copies desktop-agent Python files into resources, triggers production build,
 * and generates Windows installer via electron-builder.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const desktopAgentDir = path.resolve(rootDir, 'desktop-agent');
const electronResourcesDir = path.resolve(rootDir, 'electron/resources/desktop-agent');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

function packageApp() {
  console.log('====================================================');
  console.log('  Packaging Arcange AI Assistant Application');
  console.log('====================================================\n');

  try {
    // Step 1: Copy desktop-agent Python files into resources
    console.log('[1/3] 🐍 Step 1: Copying desktop-agent Python files into resources...');
    if (fs.existsSync(desktopAgentDir)) {
      if (fs.existsSync(electronResourcesDir)) {
        fs.rmSync(electronResourcesDir, { recursive: true, force: true });
      }
      copyRecursiveSync(desktopAgentDir, electronResourcesDir);
      console.log(`✓ Copied desktop-agent files from ${desktopAgentDir} to ${electronResourcesDir}`);
    } else {
      console.warn(`⚠️ Warning: desktop-agent directory not found at ${desktopAgentDir}. Skipping copy.`);
    }

    // Step 2: Run production build (scripts/build.js)
    console.log('\n[2/3] 🏗️ Step 2: Running frontend and asset build (scripts/build.js)...');
    execSync(`node "${path.join(__dirname, 'build.js')}"`, {
      cwd: rootDir,
      stdio: 'inherit'
    });

    // Step 3: Run Windows build & create installer (scripts/build-windows.js)
    console.log('\n[3/3] 🪟 Step 3: Running Windows installer packaging (scripts/build-windows.js)...');
    execSync(`node "${path.join(__dirname, 'build-windows.js')}"`, {
      cwd: rootDir,
      stdio: 'inherit'
    });

    console.log('\n🎉 Arcange AI Assistant packaging process finished successfully!');
  } catch (error) {
    console.error('\n❌ Packaging failed:', error.message || error);
    process.exit(1);
  }
}

if (require.main === module) {
  packageApp();
}

module.exports = { packageApp };
