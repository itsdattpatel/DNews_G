#!/usr/bin/env node
/**
 * scripts/db-restore.cjs
 * Standalone Database Restore Utility Script (PRD A §4.1).
 * Usage:
 *   npm run db:restore -- <backup_file>
 *   node scripts/db-restore.cjs <backup_file>
 *   node scripts/db-restore.cjs (interactive selection)
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Database = require('better-sqlite3');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKUPS_DIR = path.join(ROOT_DIR, 'backups');
const ACTIVE_DB_PATH = path.join(ROOT_DIR, 'backend', 'data', 'news.sqlite');

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getAvailableBackups() {
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  return fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith('.sqlite'))
    .map((filename) => {
      const fullPath = path.join(BACKUPS_DIR, filename);
      const stat = fs.statSync(fullPath);
      return {
        filename,
        fullPath,
        size: stat.size,
        sizeFormatted: formatBytes(stat.size),
        time: stat.mtime,
      };
    })
    .sort((a, b) => b.time - a.time);
}

function prompt(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       AI WORLD NEWS DESK — DATABASE RESTORE UTILITY           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const backups = getAvailableBackups();
  if (backups.length === 0) {
    console.error(`[Error] No SQLite backups found in ${BACKUPS_DIR}`);
    process.exit(1);
  }

  const argFile = process.argv[2];
  let selectedBackup = null;

  if (argFile) {
    // Check if filename or path matches
    const targetName = path.basename(argFile);
    selectedBackup = backups.find(
      (b) => b.filename.toLowerCase() === targetName.toLowerCase()
    );
    if (!selectedBackup) {
      console.error(`[Error] Specified backup file not found: ${argFile}`);
      console.log('Available backups:');
      backups.forEach((b, i) => console.log(`  [${i + 1}] ${b.filename} (${b.sizeFormatted})`));
      process.exit(1);
    }
  } else {
    // Interactive selection
    console.log(`Available backups in ${BACKUPS_DIR}:`);
    backups.forEach((b, i) => {
      console.log(`  [${i + 1}] ${b.filename.padEnd(52)} ${b.sizeFormatted.padStart(10)} · ${b.time.toLocaleString()}`);
    });

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const selection = await prompt(rl, '\nSelect backup number to restore (1-' + backups.length + ') or q to quit: ');

    if (selection.trim().toLowerCase() === 'q') {
      console.log('Restore cancelled by user.');
      rl.close();
      process.exit(0);
    }

    const idx = parseInt(selection.trim(), 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= backups.length) {
      console.error('[Error] Invalid selection.');
      rl.close();
      process.exit(1);
    }

    selectedBackup = backups[idx];

    // Double confirmation prompt
    console.log(`\nSelected for restoration: ${selectedBackup.filename}`);
    console.log(`Target database path:    ${ACTIVE_DB_PATH}`);
    console.log('WARNING: This will replace the active database with the selected snapshot.');
    console.log('A safety pre-restore backup will be created automatically before overwriting.\n');

    const confirm = await prompt(rl, 'Type "RESTORE" to confirm: ');
    rl.close();

    if (confirm.trim() !== 'RESTORE') {
      console.log('Confirmation failed. Operation aborted with zero changes made.');
      process.exit(1);
    }
  }

  console.log(`\n[Restore] Validating backup header for ${selectedBackup.filename}...`);
  const fd = fs.openSync(selectedBackup.fullPath, 'r');
  const headerBuf = Buffer.alloc(16);
  fs.readSync(fd, headerBuf, 0, 16, 0);
  fs.closeSync(fd);
  if (!headerBuf.toString('utf8').startsWith('SQLite format 3')) {
    console.error('[Error] Target file does not have a valid SQLite format 3 header!');
    process.exit(1);
  }

  // 1. Create a safety backup of active database
  if (fs.existsSync(ACTIVE_DB_PATH)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const safetyFile = `news.backup_pre_restore_${ts}.sqlite`;
    const safetyPath = path.join(BACKUPS_DIR, safetyFile);
    console.log(`[Restore] Creating pre-restore safety backup: ${safetyFile}...`);
    fs.copyFileSync(ACTIVE_DB_PATH, safetyPath);
  }

  // 2. Overwrite active database file
  console.log(`[Restore] Copying ${selectedBackup.filename} -> ${ACTIVE_DB_PATH}...`);
  const destDir = path.dirname(ACTIVE_DB_PATH);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(selectedBackup.fullPath, ACTIVE_DB_PATH);

  // 3. Remove stale WAL & SHM files
  const walPath = `${ACTIVE_DB_PATH}-wal`;
  const shmPath = `${ACTIVE_DB_PATH}-shm`;
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

  // 4. Verify database integrity
  console.log('[Restore] Verifying database integrity...');
  const db = new Database(ACTIVE_DB_PATH);
  const integrity = db.pragma('integrity_check', { simple: true });
  if (integrity !== 'ok') {
    console.error(`[Error] Integrity check failed: ${integrity}`);
    process.exit(1);
  }

  const articlesCount = db.prepare('SELECT COUNT(*) as cnt FROM articles').get().cnt;
  db.close();

  console.log('\n✔ RESTORATION COMPLETE');
  console.log(`  Source:   ${selectedBackup.filename}`);
  console.log(`  Status:   Integrity OK (100% verified)`);
  console.log(`  Articles: ${articlesCount.toLocaleString()} dispatches loaded\n`);
}

main().catch((err) => {
  console.error('[Restore] Fatal error:', err);
  process.exit(1);
});

