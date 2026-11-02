/**
 * backend/src/app.ts
 * Express application configuration and route registration.
 */
import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import { articlesRouter } from './routes/articles';
import { clustersRouter } from './routes/clusters';
import { sseRouter } from './routes/sse';
import { quotaRouter } from './routes/quota';
import { settingsRouter } from './routes/settings';
import { alertsRouter } from './routes/alerts';
import { watchlistRouter } from './routes/watchlist';
import { searchRouter } from './routes/search';
import { exportRouter } from './routes/export';
import { tvRouter } from './routes/tv';
import { sourcesRouter } from './routes/sources';
import { backupsRouter } from './routes/backups';
import { feedCounterRouter } from './routes/feedCounter';
import { controlRoomRouter } from './routes/controlRoom';
import { libraryRouter } from './library';
import { getStartupGap } from './fetch/scheduler';
import { backfillMissedWindow } from './fetch/backfill';
import { getCurrentSession, getDowntimeGap } from './services/sessionManager';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
  app.use(express.json());

  // Routes
  app.use('/api/articles', articlesRouter);
  app.use('/api/clusters', clustersRouter);
  app.use('/api/sse', sseRouter);
  app.use('/api/quota', quotaRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/watchlist', watchlistRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/export', exportRouter);
  app.use('/api/tv', tvRouter);
  app.use('/api/sources', sourcesRouter);
  app.use('/api/backups', backupsRouter);
  app.use('/api/feed/counter', feedCounterRouter);
  app.use('/api/control-room', controlRoomRouter);
  app.use('/api/library', libraryRouter);

  // Clock synchronization endpoint (PRD A Category 1B)
  app.get('/api/time', (_req, res) => {
    const now = new Date();
    res.json({
      utc: now.toISOString(),
      timestamp: now.getTime(),
    });
  });

  // Real-time session and downtime status endpoint (PRD A Category 1B)
  app.get('/api/session/current', (_req, res) => {
    const session = getCurrentSession();
    const downtime = getDowntimeGap();
    res.json({
      status: 'ok',
      session: session
        ? {
            id: session.id,
            started_at: session.started_at,
            last_heartbeat_at: session.last_heartbeat_at,
            articles_ingested_in_session: session.articles_ingested_in_session,
          }
        : null,
      downtime: {
        detected: downtime.detected,
        missed_minutes: downtime.missedMinutes,
        missed_window_start: downtime.missedWindowStart,
        missed_window_end: downtime.missedWindowEnd,
        previous_clean: downtime.previousClean,
      },
    });
  });

  // Health / Startup status
  app.get('/api/startup-status', (_req, res) => {
    const gap = getStartupGap();
    res.json({
      status: 'ok',
      uptime_ms: process.uptime() * 1000,
      missed_minutes: gap.missedMinutes,
      last_fetched_at: gap.lastFetchedAt,
      detected: gap.detected,
      can_backfill: gap.canBackfill,
      window_start: gap.windowStart,
      window_end: gap.windowEnd,
    });
  });

  // Backfill missed window
  app.post('/api/backfill', async (_req, res) => {
    try {
      const result = await backfillMissedWindow();
      res.json({
        status: 'ok',
        covered_minutes: result.coveredMinutes,
        total_missed_minutes: result.totalMissedMinutes,
        articles_fetched: result.articlesFetched,
        articles_inserted: result.articlesInserted,
        gdelt_coverage: result.gdeltCoverage,
        rss_coverage: result.rssCoverage,
        warning: result.warning,
      });
    } catch (err) {
      res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}

export const app = createApp();
