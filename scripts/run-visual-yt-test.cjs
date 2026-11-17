const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

async function waitForServer(url, timeout = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode < 500) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1500, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return false;
}

async function main() {
  console.log('[Runner] Starting backend server...');
  const server = spawn('node', ['dist/backend/src/index.js'], {
    cwd: path.resolve(__dirname, '../backend'),
    env: {
      ...process.env,
      PORT: '3001',
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
      FRONTEND_DIST: path.resolve(__dirname, '../frontend/dist'),
    },
    stdio: 'inherit',
  });

  try {
    const ready = await waitForServer('http://127.0.0.1:3001/api/health', 25000);
    if (!ready) {
      throw new Error('Backend server failed to start in time.');
    }
    console.log('[Runner] Backend ready! Executing visual test...');

    const testProc = spawn('node', ['scripts/verify-youtube-embed-resilience.cjs'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });

    await new Promise((resolve, reject) => {
      testProc.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Test exited with code ${code}`));
      });
    });

    console.log('[Runner] Visual test completed successfully!');
  } finally {
    console.log('[Runner] Stopping backend server...');
    server.kill();
  }
}

main().catch((err) => {
  console.error('[Runner] Error:', err);
  process.exit(1);
});
