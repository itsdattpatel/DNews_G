/**
 * backend/src/routes/settings.ts
 * GET /api/settings  — all current settings.
 * PATCH /api/settings — partial update with validation.
 */
import { Router, type Request, type Response } from 'express';
import { getSetting, setSetting } from '../db/db';
import { refreshInterval } from '../fetch/scheduler';

export const settingsRouter = Router();

const SETTINGS_SCHEMA: Record<string, { type: 'int' | 'bool' | 'str' | 'float'; min?: number; max?: number }> = {
  refresh_interval_minutes: { type: 'int', min: 1, max: 60 },
  alert_threshold: { type: 'int', min: 0, max: 100 },
  auto_cleanup_enabled: { type: 'bool' },
  retention_days: { type: 'int', min: 7, max: 365 },
  sound_enabled: { type: 'bool' },
  theme: { type: 'str' },
  evidence_highlight_enabled: { type: 'bool' },
  reading_mode_enabled: { type: 'bool' },
  // Auto-advance reader settings (PRD A Category 2)
  auto_advance_enabled: { type: 'bool' },
  auto_advance_interval_sec: { type: 'int', min: 3, max: 60 },
  auto_advance_pause_on_hover: { type: 'bool' },
};

settingsRouter.get('/', (_req: Request, res: Response) => {
  res.json(getAllSettings());
});

settingsRouter.patch('/', (req: Request, res: Response) => {
  const updates = req.body as Record<string, unknown>;
  const errors: string[] = [];

  for (const [key, rawValue] of Object.entries(updates)) {
    const schema = SETTINGS_SCHEMA[key];
    if (!schema) {
      errors.push(`Unknown setting: ${key}`);
      continue;
    }

    let value: string;
    if (schema.type === 'int') {
      const num = parseInt(String(rawValue), 10);
      if (isNaN(num)) { errors.push(`${key} must be an integer`); continue; }
      if (schema.min !== undefined && num < schema.min) { errors.push(`${key} min is ${schema.min}`); continue; }
      if (schema.max !== undefined && num > schema.max) { errors.push(`${key} max is ${schema.max}`); continue; }
      value = String(num);
    } else if (schema.type === 'float') {
      const flt = parseFloat(String(rawValue));
      if (isNaN(flt)) { errors.push(`${key} must be a number`); continue; }
      if (schema.min !== undefined && flt < schema.min) { errors.push(`${key} min is ${schema.min}`); continue; }
      if (schema.max !== undefined && flt > schema.max) { errors.push(`${key} max is ${schema.max}`); continue; }
      value = String(flt);
    } else if (schema.type === 'bool') {
      value = rawValue ? '1' : '0';
    } else {
      value = String(rawValue);
    }

    setSetting(key, value);
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('; '), code: 'VALIDATION_ERROR' });
  }

  // If refresh interval changed, reschedule
  if ('refresh_interval_minutes' in updates) {
    refreshInterval();
  }

  res.json(getAllSettings());
});

function getAllSettings(): Record<string, unknown> {
  const keys = Object.keys(SETTINGS_SCHEMA);
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    let defaultVal = '';
    if (
      key === 'evidence_highlight_enabled' ||
      key === 'reading_mode_enabled' ||
      key === 'auto_advance_pause_on_hover'
    ) {
      defaultVal = '1';
    } else if (key === 'auto_advance_interval_sec') {
      defaultVal = '7';
    } else if (key === 'auto_advance_enabled') {
      defaultVal = '0';
    }

    const raw = getSetting(key, defaultVal);
    const schema = SETTINGS_SCHEMA[key]!;
    if (schema.type === 'int') result[key] = parseInt(raw, 10);
    else if (schema.type === 'float') result[key] = parseFloat(raw);
    else if (schema.type === 'bool') result[key] = raw === '1';
    else result[key] = raw;
  }
  return result;
}
