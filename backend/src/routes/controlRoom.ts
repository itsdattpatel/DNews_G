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

// POST /api/control-room/trigger-fetch
controlRoomRouter.post('/trigger-fetch', async (req: Request, res: Response) => {
  try {
    const force = Boolean(req.body?.force);
    const result = await triggerManualFetchCycle(force);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ControlRoom Route] Trigger fetch error:', msg);
    res.status(500).json({ error: msg, code: 'INTERNAL_ERROR' });
  }
});

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

