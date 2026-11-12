/**
 * backend/src/routes/alerts.ts
 * Alerts REST endpoints (P6-09):
 * GET /api/alerts - list alerts with optional filters
 * PATCH /api/alerts/:id/acknowledge - acknowledge an alert
 */
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/db';
import { computeConfirmationStatus } from '../utils/confirmation';
import { emitSseEvent } from './sse';

export const alertsRouter = Router();

alertsRouter.get('/', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    let query = `
      SELECT a.id, a.type, a.message, a.cluster_id, a.fired_at, a.acknowledged,
             c.outlet_count, c.country_count, c.is_breaking AS cluster_is_breaking
      FROM alerts a
      LEFT JOIN clusters c ON a.cluster_id = c.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (req.query.acknowledged !== undefined) {
      const isAck = req.query.acknowledged === 'true' || req.query.acknowledged === '1' ? 1 : 0;
      query += ' AND a.acknowledged = ?';
      params.push(isAck);
    }

    if (req.query.type) {
      query += ' AND a.type = ?';
      params.push(req.query.type);
    }

    query += ' ORDER BY a.fired_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params) as Array<{
      id: number;
      type: string;
      message: string;
      cluster_id: number | null;
      fired_at: string;
      acknowledged: number;
      outlet_count?: number | null;
      country_count?: number | null;
      cluster_is_breaking?: number | null;
    }>;

    const items = rows.map((r) => {
      const confirmation = computeConfirmationStatus({
        outletCount: r.outlet_count,
        countryCount: r.country_count,
        isBreakingCluster: r.type === 'breaking' || r.cluster_is_breaking === 1,
      });

      return {
        id: r.id,
        type: r.type,
        message: r.message,
        cluster_id: r.cluster_id,
        fired_at: r.fired_at,
        acknowledged: Boolean(r.acknowledged),
        confirmation,
      };
    });

    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

alertsRouter.patch('/:id/acknowledge', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid alert ID', code: 'VALIDATION_ERROR' });
      return;
    }

    const alert = db.prepare('SELECT id FROM alerts WHERE id = ?').get(id);
    if (!alert) {
      res.status(404).json({ error: 'Alert not found', code: 'NOT_FOUND' });
      return;
    }

    db.prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(id);

    emitSseEvent('alert_acknowledged', { id });

    res.json({ acknowledged: true });
  } catch (err) {
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

alertsRouter.post('/acknowledge-all', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    db.prepare('UPDATE alerts SET acknowledged = 1 WHERE acknowledged = 0').run();
    emitSseEvent('alert_acknowledged', { all: true });
    res.json({ acknowledged: true });
  } catch (err) {
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

