/**
 * Arcange AI Assistant - Development Launcher
 * Starts frontend dev server and Electron main process concurrently.
 */

const path = require('path');
const concurrently = require('concurrently');

process.env.NODE_ENV = 'development';

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(rootDir, 'frontend');

console.log('====================================================');
console.log('  Starting Arcange AI Assistant Development Mode');
console.log('====================================================\n');

try {
  const { result } = concurrently(
    [
      {
        command: 'npm run dev',
        name: 'FRONTEND',
        prefixColor: 'cyan',
        cwd: frontendDir,
        env: {
          ...process.env,
          NODE_ENV: 'development'
        }
      },
      {
        command: 'npx wait-on http://localhost:5173 && npx electron .',
        name: 'ELECTRON',
        prefixColor: 'magenta',
        cwd: rootDir,
        env: {
          ...process.env,
          NODE_ENV: 'development'
        }
      }
    ],
    {
      prefix: '[{name}]',
      killOthers: ['failure', 'success'],
      restartTries: 0
    }
  );

  result.then(
    () => {
      console.log('\n[DEV] Processes exited successfully.');
      process.exit(0);
    },
    (error) => {
      console.error('\n[DEV] Error running development environment:', error);
      process.exit(1);
    }
  );
} catch (err) {
  console.error('[DEV] Failed to launch development processes:', err);
  process.exit(1);
}
