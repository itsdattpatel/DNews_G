/**
 * backend/scripts/bundle-deps.cjs
 *
 * Post-build step: copies all production dependencies listed in backend/package.json
 * into backend/dist/node_modules/ so the bundled private Node runtime can resolve
 * them without NODE_PATH tricks when running from the packaged app.asar.unpacked/.
 *
 * Node's standard module resolver walks parent directories from the entry point:
 *   .../app.asar.unpacked/backend/dist/backend/src/index.js
 *   → looks in .../app.asar.unpacked/backend/dist/node_modules/  ← we put them here
 *
 * Run after `tsc` via copy-assets.cjs.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const BACKEND_PKG = path.resolve(__dirname, '../package.json');
const ROOT_MODULES = path.resolve(__dirname, '../../node_modules');
const DEST_MODULES = path.resolve(__dirname, '../dist/node_modules');

const { dependencies = {} } = JSON.parse(fs.readFileSync(BACKEND_PKG, 'utf-8'));

/** Recursively copy a folder from src to dest */
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isSymbolicLink()) {
      // Resolve symlink and copy the real target as a real file/dir
      const target = fs.readlinkSync(srcPath);
      const resolvedTarget = path.resolve(path.dirname(srcPath), target);
      if (fs.existsSync(resolvedTarget)) {
        const stat = fs.statSync(resolvedTarget);
        if (stat.isDirectory()) {
          copyDir(resolvedTarget, destPath);
        } else {
          fs.copyFileSync(resolvedTarget, destPath);
        }
      }
    } else if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Copy a single package (and its own nested node_modules if any) from root node_modules
 * into dest/node_modules.
 */
function copyPackage(pkgName, destModules) {
  const srcPkg = path.join(ROOT_MODULES, pkgName);
  const destPkg = path.join(destModules, pkgName);

  if (!fs.existsSync(srcPkg)) {
    console.warn(`[bundle-deps] WARNING: ${pkgName} not found in ${ROOT_MODULES} — skipping`);
    return;
  }

  if (fs.existsSync(destPkg)) return; // Already copied (may be a transitive dep)

  copyDir(srcPkg, destPkg);
  console.log(`[bundle-deps]   ✓ ${pkgName}`);

  // Also copy any node_modules nested inside this package (private/conflicting deps)
  const nestedModules = path.join(srcPkg, 'node_modules');
  if (fs.existsSync(nestedModules)) {
    for (const entry of fs.readdirSync(nestedModules, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('@')) {
        // Scoped — go one level deeper
        const scopeDir = path.join(nestedModules, entry.name);
        for (const inner of fs.readdirSync(scopeDir, { withFileTypes: true })) {
          if (!inner.isDirectory()) continue;
          const scopedName = `${entry.name}/${inner.name}`;
          copyPackage(scopedName, destModules);
        }
      } else {
        copyPackage(entry.name, destModules);
      }
    }
  }
}

/**
 * Transitively collect all runtime deps of a package via its package.json `dependencies`.
 * Avoids infinite loops with a visited set.
 */
function collectTransitiveDeps(pkgName, visited = new Set()) {
  if (visited.has(pkgName)) return;
  visited.add(pkgName);

  const pkgJson = path.join(ROOT_MODULES, pkgName, 'package.json');
  if (!fs.existsSync(pkgJson)) return;

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf-8'));
  } catch {
    return;
  }

  for (const dep of Object.keys(pkg.dependencies || {})) {
    collectTransitiveDeps(dep, visited);
  }
  // peerDependencies are optional — only copy if present in root node_modules
  for (const dep of Object.keys(pkg.peerDependencies || {})) {
    if (fs.existsSync(path.join(ROOT_MODULES, dep))) {
      collectTransitiveDeps(dep, visited);
    }
  }
}

// --- Main ---
console.log('[bundle-deps] Bundling backend production dependencies into dist/node_modules/...');
console.log(`[bundle-deps] Source: ${ROOT_MODULES}`);
console.log(`[bundle-deps] Dest:   ${DEST_MODULES}`);

// Collect full transitive closure
const allDeps = new Set();
for (const pkgName of Object.keys(dependencies)) {
  collectTransitiveDeps(pkgName, allDeps);
}

console.log(`[bundle-deps] ${allDeps.size} packages to copy (${Object.keys(dependencies).length} direct + transitive)`);

fs.mkdirSync(DEST_MODULES, { recursive: true });
for (const dep of allDeps) {
  copyPackage(dep, DEST_MODULES);
}

console.log(`[bundle-deps] Done — ${allDeps.size} packages copied to dist/node_modules/.`);
