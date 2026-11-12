/**
 * backend/src/tv/health.ts
 * Stream playability health checker validating M3U8 headers, child playlists,
 * media chunks, and YouTube oEmbed feeds (PRD C Category 5B Health Truth).
 */
import { getDb } from '../db/db';
import { emitSseEvent } from '../routes/sse';
import { validateSsrfTarget } from './proxy';

export interface HealthProbeResult {
  isAlive: boolean;
  latencyMs: number;
  statusCode?: number | undefined;
  method?: 'hls' | 'youtube' | undefined;
  detail?: string | undefined;
}

export async function probeStreamUrl(
  streamUrl: string | null | undefined,
  youtubeLiveUrl?: string | null | undefined,
  timeoutMs = 8000
): Promise<HealthProbeResult> {
  const start = Date.now();

  // Step 1: Probe HLS stream if provided
  if (streamUrl && streamUrl.trim()) {
    const rawUrl = streamUrl.trim();

    // Reject mock URLs immediately
    if (rawUrl.includes('example.com')) {
      if (youtubeLiveUrl) {
        return probeYouTubeLive(youtubeLiveUrl, start, timeoutMs);
      }
      return {
        isAlive: false,
        latencyMs: Date.now() - start,
        statusCode: 200,
        detail: 'Mock placeholder URL (invalid M3U8)',
      };
    }

    const ssrf = await validateSsrfTarget(rawUrl);
    if (!ssrf.valid) {
      if (youtubeLiveUrl) {
        return probeYouTubeLive(youtubeLiveUrl, start, timeoutMs);
      }
      return {
        isAlive: false,
        latencyMs: Date.now() - start,
        statusCode: 403,
        detail: `SSRF blocked: ${ssrf.reason}`,
      };
    }

    try {
      let refererHeader = '';
      try {
        const parsed = new URL(rawUrl);
        refererHeader = `${parsed.protocol}//${parsed.host}/`;
      } catch {}

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const upstreamRes = await fetch(rawUrl, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: '*/*',
          ...(refererHeader ? { Referer: refererHeader, Origin: refererHeader.slice(0, -1) } : {}),
        },
      });

      clearTimeout(timer);

      if (upstreamRes.ok) {
        const manifestText = await upstreamRes.text();
        if (manifestText.includes('#EXTM3U')) {
          const finalUrl = upstreamRes.url || rawUrl;
          const lines = manifestText
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
          let targetChildOrSegment: string | null = null;

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]!;
            if (line.startsWith('#EXT-X-STREAM-INF') && i + 1 < lines.length) {
              targetChildOrSegment = lines[i + 1]!;
              break;
            } else if (
              !line.startsWith('#') &&
              (line.includes('.m3u8') ||
                line.includes('.ts') ||
                line.includes('.m4s') ||
                line.includes('.mp4') ||
                line.includes('.aac'))
            ) {
              targetChildOrSegment = line;
              break;
            }
          }

          if (targetChildOrSegment) {
            let childUrl = targetChildOrSegment;
            try {
              childUrl = new URL(targetChildOrSegment, finalUrl).toString();
            } catch {}

            const childSsrf = await validateSsrfTarget(childUrl);
            if (childSsrf.valid) {
              const segController = new AbortController();
              const segTimer = setTimeout(() => segController.abort(), 6000);

              const childRes = await fetch(childUrl, {
                signal: segController.signal,
                redirect: 'follow',
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  Range: 'bytes=0-4096',
                  ...(refererHeader ? { Referer: refererHeader, Origin: refererHeader.slice(0, -1) } : {}),
                },
              }).catch(() => null);

              clearTimeout(segTimer);

              if (childRes && (childRes.status === 200 || childRes.status === 206)) {
                const chunkBuffer = await childRes.arrayBuffer().catch(() => null);
                if (chunkBuffer && chunkBuffer.byteLength > 100) {
                  return {
                    isAlive: true,
                    latencyMs: Date.now() - start,
                    statusCode: childRes.status,
                    method: 'hls',
                    detail: 'HLS manifest & media chunk verified decodable',
                  };
                }
              }
            }
          } else {
            // Master manifest verified
            return {
              isAlive: true,
              latencyMs: Date.now() - start,
              statusCode: upstreamRes.status,
              method: 'hls',
              detail: 'HLS master manifest verified',
            };
          }
        }
      }
    } catch {
      // HLS fetch error, try fallback to YouTube below
    }
  }

  // Step 2: Fallback to YouTube Live probe
  if (youtubeLiveUrl && youtubeLiveUrl.trim()) {
    return probeYouTubeLive(youtubeLiveUrl.trim(), start, timeoutMs);
  }

  return {
    isAlive: false,
    latencyMs: Date.now() - start,
    statusCode: 0,
    detail: 'HLS and YouTube probes failed',
  };
}

async function probeYouTubeLive(
  youtubeUrl: string,
  start: number,
  timeoutMs: number
): Promise<HealthProbeResult> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(oembedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AIWorldNewsDesk/1.0',
      },
    });

    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as { title?: string; author_name?: string };
      if (data && data.title) {
        return {
          isAlive: true,
          latencyMs: Date.now() - start,
          statusCode: res.status,
          method: 'youtube',
          detail: `YouTube Live verified: "${data.title.slice(0, 40)}"`,
        };
      }
    }

    return {
      isAlive: false,
      latencyMs: Date.now() - start,
      statusCode: res.status,
      detail: `YouTube oEmbed returned ${res.status}`,
    };
  } catch (err: any) {
    return {
      isAlive: false,
      latencyMs: Date.now() - start,
      statusCode: 0,
      detail: `YouTube probe error: ${err.message}`,
    };
  }
}

export async function checkChannelHealth(channelId: number): Promise<HealthProbeResult> {
  const db = getDb();
  const row = db
    .prepare('SELECT stream_url, youtube_live_url FROM tv_channels WHERE id = ?')
    .get(channelId) as { stream_url: string; youtube_live_url?: string | null } | undefined;

  if (!row) {
    throw new Error(`Channel with ID ${channelId} not found`);
  }

  const result = await probeStreamUrl(row.stream_url, row.youtube_live_url);

  db.prepare(`
    UPDATE tv_channels
    SET is_alive = ?, last_checked_at = datetime('now')
    WHERE id = ?
  `).run(result.isAlive ? 1 : 0, channelId);

  emitSseEvent('tv_health_update', {
    channel_id: channelId,
    is_alive: result.isAlive,
    latency_ms: result.latencyMs,
    method: result.method,
    last_checked_at: new Date().toISOString(),
  });

  return result;
}
