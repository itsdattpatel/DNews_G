/**
 * backend/src/routes/controlRoom.ts
 * REST API endpoints for the Control Room dashboard, system error ledger, and manual controls (PRD A Category 11).
 */
import { Router, type Request, type Response } from 'express';
import {
  getControlRoomTelemetry,
  getSystemErrors,
  clearSystemErrors,
  logSystemError,
  type SubsystemName,
  type ErrorLevel,
} from '../services/controlRoom';
import { triggerManualFetchCycle } from '../fetch/scheduler';

export const controlRoomRouter = Router();

// GET /api/control-room/telemetry
controlRoomRouter.get('/telemetry', (_req: Request, res: Response) => {
  try {
    const telemetry = getControlRoomTelemetry();
    res.json(telemetry);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ControlRoom Route] Telemetry error:', msg);
    res.status(500).json({ error: msg, code: 'INTERNAL_ERROR' });
  }
});

// GET /api/control-room/errors
controlRoomRouter.get('/errors', (req: Request, res: Response) => {
  try {
    const { subsystem, level, limit, offset, q } = req.query;

    const result = getSystemErrors({
      subsystem: typeof subsystem === 'string' ? subsystem : undefined,
      level: typeof level === 'string' ? level : undefined,
      limit: typeof limit === 'string' ? parseInt(limit, 10) : undefined,
      offset: typeof offset === 'string' ? parseInt(offset, 10) : undefined,
      q: typeof q === 'string' ? q : undefined,
    });

    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ControlRoom Route] Errors query error:', msg);
    res.status(500).json({ error: msg, code: 'INTERNAL_ERROR' });
  }
});

// POST /api/control-room/errors/clear
controlRoomRouter.post('/errors/clear', (req: Request, res: Response) => {
  try {
    const { before } = req.body || {};
    const clearedCount = clearSystemErrors(typeof before === 'string' ? before : undefined);
    res.json({ cleared: true, count: clearedCount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ControlRoom Route] Errors clear error:', msg);
    res.status(500).json({ error: msg, code: 'INTERNAL_ERROR' });
  }
});

// Shared handler for manual fetch triggers (Control Room, Settings "Fetch Next 200", Electron Tray)
const handleManualFetchRequest = async (req: Request, res: Response) => {
  try {
    const force = Boolean(req.body?.force);
    const maxArticlesRaw = req.body?.maxArticles;
    const maxArticles =
      typeof maxArticlesRaw === 'number' && !isNaN(maxArticlesRaw) && maxArticlesRaw > 0
        ? Math.floor(maxArticlesRaw)
        : undefined;
    const advanceCursor =
      req.body?.advanceCursor !== undefined ? Boolean(req.body.advanceCursor) : true;

    const result = await triggerManualFetchCycle(force, {
      advanceCursor,
      ...(maxArticles !== undefined ? { maxArticles } : {}),
    });
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ControlRoom Route] Trigger fetch error:', msg);
    res.status(500).json({ error: msg, code: 'INTERNAL_ERROR' });
  }
};

// POST /api/control-room/trigger-fetch & /api/control-room/fetch-cycle
controlRoomRouter.post('/trigger-fetch', handleManualFetchRequest);
controlRoomRouter.post('/fetch-cycle', handleManualFetchRequest);

// POST /api/control-room/test-error
controlRoomRouter.post('/test-error', (req: Request, res: Response) => {
  try {
    const { subsystem = 'system', level = 'warn', message = 'Diagnostic test message', details } = req.body || {};
    const errorRecord = logSystemError(
      subsystem as SubsystemName,
      message,
      level as ErrorLevel,
      details ?? { test: true, triggeredBy: 'control_room_probe' }
    );
    res.json({ success: true, record: errorRecord });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ControlRoom Route] Test error log failed:', msg);
    res.status(500).json({ error: msg, code: 'INTERNAL_ERROR' });
  }
});

