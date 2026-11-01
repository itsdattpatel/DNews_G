/**
 * backend/src/routes/alerts.ts
 * Alerts REST endpoints (P6-09):
 * GET /api/alerts - list alerts with optional filters
 * PATCH /api/alerts/:id/acknowledge - acknowledge an alert
 */
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db/db';

export const alertsRouter = Router();

alertsRouter.get('/', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    let query = 'SELECT id, type, message, cluster_id, fired_at, acknowledged FROM alerts WHERE 1=1';
    const params: unknown[] = [];

    if (req.query.acknowledged !== undefined) {
      const isAck = req.query.acknowledged === 'true' || req.query.acknowledged === '1' ? 1 : 0;
      query += ' AND acknowledged = ?';
      params.push(isAck);
    }

    if (req.query.type) {
      query += ' AND type = ?';
      params.push(req.query.type);
    }

    query += ' ORDER BY fired_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params) as Array<{
      id: number;
      type: string;
      message: string;
      cluster_id: number | null;
      fired_at: string;
      acknowledged: number;
    }>;

    const items = rows.map((r) => ({
      id: r.id,
      type: r.type,
      message: r.message,
      cluster_id: r.cluster_id,
      fired_at: r.fired_at,
      acknowledged: Boolean(r.acknowledged),
    }));

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

    res.json({ acknowledged: true });
  } catch (err) {
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

