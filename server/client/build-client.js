const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('[Vercel Build Bridge] Starting frontend build from server directory...');

const clientDir = path.resolve(__dirname, '../../client');
const serverDir = path.resolve(__dirname, '../');

console.log('[Vercel Build Bridge] Client directory:', clientDir);

try {
  // 1. Install client dependencies if not already installed or on CI
  console.log('[Vercel Build Bridge] Installing client dependencies...');
  execSync('npm install', { cwd: clientDir, stdio: 'inherit' });

  // 2. Build Vite client
  console.log('[Vercel Build Bridge] Building Vite client...');
  execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });

  const clientDist = path.join(clientDir, 'dist');
  if (fs.existsSync(clientDist)) {
    console.log('[Vercel Build Bridge] Distributing output assets...');

    // Copy to server/dist
    const serverDist = path.join(serverDir, 'dist');
    if (!fs.existsSync(serverDist)) fs.mkdirSync(serverDist, { recursive: true });
    fs.cpSync(clientDist, serverDist, { recursive: true });

    // Copy to server/client/dist
    const serverClientDist = path.join(__dirname, 'dist');
    if (!fs.existsSync(serverClientDist)) fs.mkdirSync(serverClientDist, { recursive: true });
    fs.cpSync(clientDist, serverClientDist, { recursive: true });

    console.log('[Vercel Build Bridge] Successfully created build artifacts in:');
    console.log(' - ' + serverDist);
    console.log(' - ' + serverClientDist);
  } else {
    console.error('[Vercel Build Bridge] Error: client/dist directory does not exist.');
    process.exit(1);
  }
  console.log('[Vercel Build Bridge] All builds succeeded.');
} catch (err) {
  console.error('[Vercel Build Bridge] Build failed:', err);
  process.exit(1);
}
