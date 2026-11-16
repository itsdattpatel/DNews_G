/**
 * backend/scripts/copy-assets.cjs
 * Copies SQLite SQL migration scripts into dist/ for production runtime execution.
 */
const fs = require('fs');
const path = require('path');

const srcMigrations = path.resolve(__dirname, '../src/db/migrations');
const target1 = path.resolve(__dirname, '../dist/backend/src/db/migrations');
const target2 = path.resolve(__dirname, '../dist/db/migrations');

function copyFolder(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyFolder(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyFolder(srcMigrations, target1);
copyFolder(srcMigrations, target2);
console.log('[copy-assets] Successfully copied migration SQL files to dist.');
