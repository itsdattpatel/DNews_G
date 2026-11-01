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

const startTime = Date.now();
const PORT = parseInt(process.env['PORT'] ?? '3001', 10);
const HOST = '127.0.0.1'; // Localhost only — never expose to network

// Initialize DB and sources
console.log('[Init] Initializing database...');
getDb();
syncSources();

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

const server = app.listen(PORT, HOST, () => {
  const elapsed = Date.now() - startTime;
  console.log(`[Server] AI World News Desk running at http://${HOST}:${PORT}`);
  console.log(`[Server] Startup completed in ${elapsed}ms`);
});

// Graceful shutdown
function shutdown(): void {
  console.log('\n[Server] Shutting down gracefully...');
  stopScheduler();
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
