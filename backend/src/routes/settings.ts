/**
 * backend/src/routes/settings.ts
 * GET /api/settings  — all current settings.
 * PATCH /api/settings — partial update with validation.
 */
import { Router, type Request, type Response } from 'express';
import { getSetting, setSetting } from '../db/db';
import { refreshInterval } from '../fetch/scheduler';
import { getUnenrichedCount, summarizeUnenrichedBatch } from '../pipeline/enricher';

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
  // Plain Mode (PRD A Category 3)
  plain_mode_enabled: { type: 'bool' },
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

/**
 * GET /api/settings/unenriched-count
 * Returns how many articles were ingested in Plain Mode without AI summaries.
 */
settingsRouter.get('/unenriched-count', (_req: Request, res: Response) => {
  res.json({ count: getUnenrichedCount() });
});

/**
 * POST /api/settings/summarize-unenriched
 * Catch-up enriches a batch of unsummarized articles (PRD A Category 3.2.6).
 */
settingsRouter.post('/summarize-unenriched', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.body?.limit || 20), 10), 50);
    const result = await summarizeUnenrichedBatch(limit);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg, code: 'ENRICHMENT_ERROR' });
  }
});

const SECRET_KEY_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /password/i,
  /credential/i,
  /gemini/i,
  /groq/i,
  /mistral/i,
  /cerebras/i,
  /youtube/i,
];

function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERNS.some((pat) => pat.test(key));
}

/**
 * GET /api/settings/export
 * Exports user settings with strict redaction of all API keys and secrets (PRD A §4.2).
 */
settingsRouter.get('/export', (_req: Request, res: Response) => {
  const allSettings = getAllSettings();
  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(allSettings)) {
    if (!isSecretKey(key)) {
      sanitized[key] = val;
    }
  }

  const exportPayload = {
    app: 'ai-world-news-desk',
    schema_version: 1,
    exported_at: new Date().toISOString(),
    settings: sanitized,
  };

  const filename = `ai-news-desk-settings-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(exportPayload);
});

/**
 * POST /api/settings/import
 * Validates schema and applies imported settings, strictly stripping secrets and malicious payloads (PRD A §4.2).
 */
settingsRouter.post('/import', (req: Request, res: Response) => {
  const payload = req.body;

  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Invalid JSON payload', code: 'INVALID_PAYLOAD' });
  }

  if (payload.schema_version !== undefined && payload.schema_version !== 1) {
    return res.status(400).json({
      error: `Unsupported settings schema version: ${payload.schema_version}`,
      code: 'UNSUPPORTED_VERSION',
    });
  }

  const importedSettings = payload.settings || payload;
  if (!importedSettings || typeof importedSettings !== 'object') {
    return res.status(400).json({ error: 'Settings object is required', code: 'MISSING_SETTINGS' });
  }

  const errors: string[] = [];
  const validUpdates: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(importedSettings)) {
    // Strict Redaction: ignore any secret or sensitive key
    if (isSecretKey(key)) {
      console.warn(`[Settings] Redacted sensitive key attempted during import: ${key}`);
      continue;
    }

    const schema = SETTINGS_SCHEMA[key];
    if (!schema) {
      continue; // Skip unknown keys safely without failure
    }

    if (schema.type === 'int') {
      const num = parseInt(String(rawValue), 10);
      if (isNaN(num)) {
        errors.push(`${key} must be an integer`);
        continue;
      }
      if (schema.min !== undefined && num < schema.min) {
        errors.push(`${key} min is ${schema.min}`);
        continue;
      }
      if (schema.max !== undefined && num > schema.max) {
        errors.push(`${key} max is ${schema.max}`);
        continue;
      }
      validUpdates[key] = String(num);
    } else if (schema.type === 'bool') {
      validUpdates[key] = rawValue ? '1' : '0';
    } else if (schema.type === 'float') {
      const flt = parseFloat(String(rawValue));
      if (isNaN(flt)) {
        errors.push(`${key} must be a number`);
        continue;
      }
      validUpdates[key] = String(flt);
    } else {
      validUpdates[key] = String(rawValue);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('; '), code: 'VALIDATION_ERROR' });
  }

  for (const [k, v] of Object.entries(validUpdates)) {
    setSetting(k, v);
  }

  if ('refresh_interval_minutes' in validUpdates) {
    refreshInterval();
  }

  res.json({
    success: true,
    applied_keys: Object.keys(validUpdates),
    settings: getAllSettings(),
  });
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
    } else if (key === 'auto_advance_enabled' || key === 'plain_mode_enabled') {
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
