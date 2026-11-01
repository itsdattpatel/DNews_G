/**
 * backend/src/tv/health.ts
 * Stream health checker probing HLS / IPTV stream endpoints (P11-04).
 */
import { getDb } from '../db/db';

export interface HealthProbeResult {
  isAlive: boolean;
  latencyMs: number;
  statusCode?: number | undefined;
}

export async function probeStreamUrl(streamUrl: string, timeoutMs = 3500): Promise<HealthProbeResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Try HEAD first for lightweight probing
    let res = await fetch(streamUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AIWorldNewsDesk/1.0',
      },
    }).catch(() => null);

    // Some HLS CDNs reject HEAD or return 405 Method Not Allowed; fallback to GET with range 0-1000
    if (!res || res.status === 405) {
      res = await fetch(streamUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Range: 'bytes=0-1000',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AIWorldNewsDesk/1.0',
        },
      }).catch(() => null);
    }

    clearTimeout(timer);
    const latencyMs = Date.now() - start;

    if (res && res.status >= 200 && res.status < 400) {
      return { isAlive: true, latencyMs, statusCode: res.status };
    }

    return { isAlive: false, latencyMs, statusCode: res?.status };
  } catch {
    clearTimeout(timer);
    return { isAlive: false, latencyMs: Date.now() - start };
  }
}

export async function checkChannelHealth(channelId: number): Promise<HealthProbeResult> {
  const db = getDb();
  const row = db.prepare('SELECT stream_url FROM tv_channels WHERE id = ?').get(channelId) as
    | { stream_url: string }
    | undefined;

  if (!row) {
    throw new Error(`Channel with ID ${channelId} not found`);
  }

  const result = await probeStreamUrl(row.stream_url);

  db.prepare(`
    UPDATE tv_channels
    SET is_alive = ?, last_checked_at = datetime('now')
    WHERE id = ?
  `).run(result.isAlive ? 1 : 0, channelId);

  return result;
}
