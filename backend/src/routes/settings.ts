/**
 * backend/src/routes/settings.ts
 * GET /api/settings  — all current settings.
 * PATCH /api/settings — partial update with validation.
 */
import { Router, type Request, type Response } from 'express';
import { getDb, getSetting, setSetting } from '../db/db';
import { refreshInterval } from '../fetch/scheduler';
import { getUnenrichedCount, summarizeUnenrichedBatch } from '../pipeline/enricher';

export const settingsRouter = Router();

const SETTINGS_SCHEMA: Record<string, { type: 'int' | 'bool' | 'str' | 'float'; min?: number; max?: number }> = {
  // General & Realtime
  timezone_mode: { type: 'str' },
  catchup_alert_enabled: { type: 'bool' },
  clock_sync_enabled: { type: 'bool' },
  debug_logging: { type: 'bool' },
  rail_pinned: { type: 'bool' },

  // Reading Desk (PRD A Cat 2 & PRD C Cat 4)
  auto_advance_enabled: { type: 'bool' },
  auto_advance_interval_sec: { type: 'int', min: 3, max: 60 },
  auto_advance_pause_on_hover: { type: 'bool' },
  strip_follow_enabled: { type: 'bool' },
  strip_follow_grace_sec: { type: 'int', min: 2, max: 15 },
  ticker_speed: { type: 'str' },
  evidence_highlight_enabled: { type: 'bool' },
  reading_mode_enabled: { type: 'bool' },

  // News & Sources
  refresh_interval_minutes: { type: 'int', min: 1, max: 60 },
  default_country_filter: { type: 'str' },
  category_filter_list: { type: 'str' },
  enrich_batch_size: { type: 'int', min: 5, max: 50 },

  // AI & Plain Mode (PRD A Cat 3 & 10)
  plain_mode_enabled: { type: 'bool' },
  two_pass_ai_enabled: { type: 'bool' },
  pass2_threshold: { type: 'int', min: 50, max: 100 },

  // TV Broadcasts (PRD C Cat 5)
  tv_method_order: { type: 'str' },
  tv_autoplay_muted: { type: 'bool' },
  tv_volume: { type: 'float', min: 0, max: 1 },
  tv_health_interval_min: { type: 'int', min: 5, max: 180 },
  tv_stopped_fail_threshold: { type: 'int', min: 2, max: 20 },
  tv_mini_player_enabled: { type: 'bool' },

  // Cartography & Map (PRD C Cat 7)
  map_engine: { type: 'str' },
  globe_autorotate: { type: 'bool' },
  map_wildlife_layer: { type: 'bool' },
  map_pulse_enabled: { type: 'bool' },

  // Alerts & Acoustic
  alert_threshold: { type: 'int', min: 0, max: 100 },
  sound_enabled: { type: 'bool' },
  browser_notifications: { type: 'bool' },

  // Appearance & Broadsheet Typography
  theme: { type: 'str' },
  layout_density: { type: 'str' },
  reduce_motion_override: { type: 'str' },

  // Data & Storage (PRD A Cat 4)
  auto_cleanup_enabled: { type: 'bool' },
  retention_days: { type: 'int', min: 7, max: 365 },

  // Library & Mind (PRD B)
  library_citation_format: { type: 'str' },
  helpline_default_region: { type: 'str' },
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
 * GET /api/settings/two-pass-telemetry
 * Returns live Two-Pass AI processing stats and estimated tokens saved (PRD A §10.1).
 */
settingsRouter.get('/two-pass-telemetry', (_req: Request, res: Response) => {
  const db = getDb();
  let stats = db.prepare('SELECT * FROM two_pass_stats WHERE id = 1').get() as {
    pass1_count: number;
    pass2_count: number;
    pass2_skipped_count: number;
    estimated_tokens_saved: number;
    last_updated_at: string;
  } | undefined;

  if (!stats) {
    stats = {
      pass1_count: 0,
      pass2_count: 0,
      pass2_skipped_count: 0,
      estimated_tokens_saved: 0,
      last_updated_at: new Date().toISOString(),
    };
  }

  res.json({
    two_pass_ai_enabled: getSetting('two_pass_ai_enabled', '1') === '1',
    pass2_threshold: parseInt(getSetting('pass2_threshold', '75'), 10),
    pass1_count: stats.pass1_count,
    pass2_count: stats.pass2_count,
    pass2_skipped_count: stats.pass2_skipped_count,
    estimated_tokens_saved: stats.estimated_tokens_saved,
    last_updated_at: stats.last_updated_at,
  });
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

const SETTINGS_DEFAULTS: Record<string, string> = {
  // General & Realtime
  timezone_mode: 'local',
  catchup_alert_enabled: '1',
  clock_sync_enabled: '1',
  debug_logging: '0',
  rail_pinned: '0',

  // Reading Desk
  auto_advance_enabled: '0',
  auto_advance_interval_sec: '7',
  auto_advance_pause_on_hover: '1',
  strip_follow_enabled: '1',
  strip_follow_grace_sec: '4',
  ticker_speed: 'normal',
  evidence_highlight_enabled: '1',
  reading_mode_enabled: '1',

  // News & Sources
  refresh_interval_minutes: '15',
  default_country_filter: '',
  category_filter_list: 'all',
  enrich_batch_size: '20',

  // AI & Plain Mode
  plain_mode_enabled: '0',
  two_pass_ai_enabled: '1',
  pass2_threshold: '75',

  // TV Broadcasts
  tv_method_order: 'youtube,hls,vlc',
  tv_autoplay_muted: '1',
  tv_volume: '0.8',
  tv_health_interval_min: '30',
  tv_stopped_fail_threshold: '5',
  tv_mini_player_enabled: '0',

  // Map & Globe
  map_engine: 'globe',
  globe_autorotate: '1',
  map_wildlife_layer: '1',
  map_pulse_enabled: '1',

  // Alerts & Sound
  alert_threshold: '75',
  sound_enabled: '0',
  browser_notifications: '0',

  // Appearance
  theme: 'paper',
  layout_density: 'comfortable',
  reduce_motion_override: 'system',

  // Data & Storage
  auto_cleanup_enabled: '0',
  retention_days: '30',

  // Library
  library_citation_format: 'apa',
  helpline_default_region: 'all',
};

function getAllSettings(): Record<string, unknown> {
  const keys = Object.keys(SETTINGS_SCHEMA);
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const defaultVal = SETTINGS_DEFAULTS[key] ?? '';
    const raw = getSetting(key, defaultVal);
    const schema = SETTINGS_SCHEMA[key]!;
    if (schema.type === 'int') result[key] = parseInt(raw, 10);
    else if (schema.type === 'float') result[key] = parseFloat(raw);
    else if (schema.type === 'bool') result[key] = raw === '1';
    else result[key] = raw;
  }
  return result;
}
