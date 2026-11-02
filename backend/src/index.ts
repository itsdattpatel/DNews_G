/**
 * backend/src/index.ts
 * AI World News Desk — Backend Entry Point
 * Binds exclusively to 127.0.0.1:3001
 */
import { app } from './app';
import { getDb } from './db/db';
import { syncSources } from './pipeline/dedup';
import { startScheduler, stopScheduler, initStartupGap } from './fetch/scheduler';
import { runEnrichmentPass } from './pipeline/enricher';
import { initCleanupScheduler } from './pipeline/cleanup';
import { initAppSession, closeAppSession } from './services/sessionManager';
import { initBackupScheduler, stopBackupScheduler } from './services/backupManager';
import { loadTop5Channels } from './tv/catalog';

const startTime = Date.now();
const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
const HOST = '127.0.0.1'; // Localhost only — never expose to network

// Initialize DB and sources
console.log('[Init] Initializing database...');
getDb();
syncSources();
loadTop5Channels();

// Initialize real-time session tracking & downtime gap detection (Category 1B)
const sessionInfo = initAppSession();
if (sessionInfo.gapDetected) {
  console.log(
    `[Session] Real-time downtime gap detected: ${sessionInfo.missedMinutes} minutes (${sessionInfo.missedWindowStart} to ${sessionInfo.missedWindowEnd})`,
  );
}

// Initialize startup gap detection before starting scheduler cycles
const startupGap = initStartupGap();
if (startupGap.detected) {
  console.log(
    `[Startup] Detected gap: ${startupGap.missedMinutes} minutes since ${startupGap.lastFetchedAt}`,
  );
}

// Start scheduled fetch & enrichment
startScheduler(async () => {
  await runEnrichmentPass();
});

// Initialize automatic retention cleanup & storage monitor (P8-07, P8-08)
initCleanupScheduler();

// Initialize automated daily 03:00 backups & retention monitor (PRD A Category 4)
initBackupScheduler();

const server = app.listen(PORT, HOST, () => {
  const elapsed = Date.now() - startTime;
  console.log(`[Server] AI World News Desk running at http://${HOST}:${PORT}`);
  console.log(`[Server] Startup completed in ${elapsed}ms`);
});

// Graceful shutdown
function shutdown(): void {
  console.log('\n[Server] Shutting down gracefully...');
  closeAppSession('clean');
  stopScheduler();
  stopBackupScheduler();
  server.close(() => {
    try {
      getDb().close();
    } catch {
      // ignore
    }
    console.log('[Server] Closed');
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default server;
