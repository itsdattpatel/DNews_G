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
  max_spiders: { type: 'int', min: 1, max: 10 },
  alert_threshold: { type: 'int', min: 0, max: 100 },
  auto_cleanup_enabled: { type: 'bool' },
  retention_days: { type: 'int', min: 7, max: 365 },
  sound_enabled: { type: 'bool' },
  spider_speed: { type: 'float', min: 0.5, max: 3.0 },
  spider_glitch: { type: 'bool' },
  spider_pause_on_hover: { type: 'bool' },
  theme: { type: 'str' },
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
    const raw = getSetting(key, '');
    const schema = SETTINGS_SCHEMA[key]!;
    if (schema.type === 'int') result[key] = parseInt(raw, 10);
    else if (schema.type === 'float') result[key] = parseFloat(raw);
    else if (schema.type === 'bool') result[key] = raw === '1';
    else result[key] = raw;
  }
  return result;
}
