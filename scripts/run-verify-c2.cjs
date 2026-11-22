/**
 * scripts/run-verify-c2.cjs
 * Spawns backend, waits for health endpoint, runs verify-v112-phase-c2.cjs, tears down.
 */
const { spawn } = require('child_process');

const backend = spawn('node', ['backend/dist/backend/src/index.js'], {
  stdio: 'inherit',
  env: process.env,
});

console.log('Backend spawned with PID:', backend.pid);

const runner = spawn('node', ['scripts/verify-v112-phase-c2.cjs'], {
  stdio: 'inherit',
  env: process.env,
});

runner.on('exit', (code) => {
  console.log('Runner exited with code:', code);
  try {
    process.kill(backend.pid);
  } catch {}
  process.exit(code || 0);
});

process.on('SIGINT', () => {
  try { process.kill(backend.pid); } catch {}
  process.exit(1);
});
