/**
 * backend/src/ai/quota.ts
 * Per-provider request/token counter. Writes to quota_log and maintains
 * an in-memory cache for fast SSE pushes.
 */
import { getDb } from '../db/db';
import { emitSseEvent } from '../routes/sse';

export interface ProviderStats {
  callsToday: number;
  tokensToday: number;
  errorsToday: number;
}

type QuotaCache = Record<string, ProviderStats>;
const _cache: QuotaCache = {};

export function recordCall(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  success: boolean,
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO quota_log (provider, model, input_tokens, output_tokens, success)
    VALUES (?, ?, ?, ?, ?)
  `).run(provider, model, inputTokens, outputTokens, success ? 1 : 0);

  // Update in-memory cache
  if (!_cache[provider]) {
    _cache[provider] = { callsToday: 0, tokensToday: 0, errorsToday: 0 };
  }
  const stats = _cache[provider]!;
  stats.callsToday++;
  stats.tokensToday += inputTokens + outputTokens;
  if (!success) stats.errorsToday++;

  const all = getAllProviderStats();
  emitSseEvent('quota_update', {
    provider,
    providers: {
      gemini: {
        calls_today: all['gemini']?.callsToday ?? 0,
        tokens_today: all['gemini']?.tokensToday ?? 0,
        errors_today: all['gemini']?.errorsToday ?? 0,
      },
      groq: {
        calls_today: all['groq']?.callsToday ?? 0,
        tokens_today: all['groq']?.tokensToday ?? 0,
        errors_today: all['groq']?.errorsToday ?? 0,
      },
      mistral: {
        calls_today: all['mistral']?.callsToday ?? 0,
        tokens_today: all['mistral']?.tokensToday ?? 0,
        errors_today: all['mistral']?.errorsToday ?? 0,
      },
      cerebras: {
        calls_today: all['cerebras']?.callsToday ?? 0,
        tokens_today: all['cerebras']?.tokensToday ?? 0,
        errors_today: all['cerebras']?.errorsToday ?? 0,
      },
    },
  });
}

export function getTodayStats(provider: string): ProviderStats {
  // Check cache first (populated on startup from DB)
  if (_cache[provider]) return _cache[provider]!;
  return loadFromDb(provider);
}

export function getAllProviderStats(): Record<string, ProviderStats> {
  const providers = ['gemini', 'groq', 'mistral', 'cerebras'];
  const result: Record<string, ProviderStats> = {};
  for (const p of providers) {
    result[p] = getTodayStats(p);
  }
  return result;
}

/** Load today's stats from DB into cache (call once on startup) */
export function initQuotaCache(): void {
  const providers = ['gemini', 'groq', 'mistral', 'cerebras'];
  for (const p of providers) {
    _cache[p] = loadFromDb(p);
  }
}

function loadFromDb(provider: string): ProviderStats {
  const db = getDb();
  const row = db.prepare(`
    SELECT
      COUNT(*) as calls,
      SUM(input_tokens + output_tokens) as tokens,
      SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors
    FROM quota_log
    WHERE provider = ?
      AND date(called_at) = date('now')
  `).get(provider) as { calls: number; tokens: number | null; errors: number };

  const stats: ProviderStats = {
    callsToday: row.calls ?? 0,
    tokensToday: row.tokens ?? 0,
    errorsToday: row.errors ?? 0,
  };
  _cache[provider] = stats;
  return stats;
}
