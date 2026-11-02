/**
 * backend/src/routes/backups.ts
 * Backups Management & Safety Net REST API (PRD A Category 4).
 * Handles backup listing, manual triggers, retention pruning, and double-confirmation restore.
 */
import { Router, type Request, type Response } from 'express';
import {
  listBackups,
  createBackup,
  restoreBackup,
  pruneBackups,
} from '../services/backupManager';

export const backupsRouter = Router();

/**
 * GET /api/backups
 * Returns list of available backups in backups/ with metadata and timestamps.
 */
backupsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const backups = listBackups();
    res.json({ backups, count: backups.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg, code: 'BACKUP_LIST_ERROR' });
  }
});

/**
 * POST /api/backups/create
 * Manually creates an immediate backup snapshot.
 */
backupsRouter.post('/create', (req: Request, res: Response) => {
  try {
    const label = typeof req.body?.label === 'string' ? req.body.label.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : undefined;
    const record = createBackup('manual', label);
    res.json({ success: true, backup: record });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg, code: 'BACKUP_CREATE_ERROR' });
  }
});

/**
 * POST /api/backups/restore
 * Restores the active SQLite database from a specified backup file.
 * Requires explicit double-confirmation payload: { filename: string, confirmation: "RESTORE" }
 */
backupsRouter.post('/restore', (req: Request, res: Response) => {
  const { filename, confirmation } = req.body || {};

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Filename is required', code: 'MISSING_FILENAME' });
  }

  if (confirmation !== 'RESTORE') {
    return res.status(400).json({
      error: 'Double-confirmation failed. You must explicitly type "RESTORE" in confirmation field.',
      code: 'CONFIRMATION_REQUIRED',
    });
  }

  try {
    const result = restoreBackup(filename);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg, code: 'BACKUP_RESTORE_ERROR' });
  }
});

/**
 * POST /api/backups/prune
 * Manually triggers retention cleanup according to PRD A §4.1 rules.
 */
backupsRouter.post('/prune', (_req: Request, res: Response) => {
  try {
    const result = pruneBackups();
    res.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg, code: 'BACKUP_PRUNE_ERROR' });
  }
});

