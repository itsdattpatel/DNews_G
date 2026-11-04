/**
 * backend/src/tv/catalog.ts
 * IPTV-org Catalog Sync & Curated Top 5 Outlets Per Nation (PRD A Category 5).
 * Handles M3U parsing, local iptv-cache storage, deduplication, and Top-5 precedence.
 */
import fs from 'fs';
import path from 'path';
import { getDb } from '../db/db';
import { parseM3u, type IptvChannelMeta } from './iptv';

export interface Top5ChannelConfig {
  slug: string;
  name: string;
  country: string;
  country_code: string;
  category: string;
  rank: number;
  status: 'needs my review' | 'verified' | 'rejected' | 'verified-playing' | 'embedding-disabled' | 'not-live';
  website: string;
  stream_url: string;
  youtube_live_url: string;
  youtube_channel_id: string;
  logo_url?: string;
  evidence: string;
  verification_date?: string;
}

export interface Top5ConfigFile {
  schema_version: number;
  description: string;
  audit_date: string;
  channels: Top5ChannelConfig[];
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '_');
}

export function getIptvCacheDir(): string {
  const custom = process.env['IPTV_CACHE_DIR'];
  if (custom) {
    const dir = path.resolve(custom);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
  const defaultDir = path.resolve(__dirname, '../../data/iptv-cache');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return defaultDir;
}

export function getTop5ConfigPath(): string {
  const custom = process.env['TOP5_CONFIG_PATH'];
  if (custom) return path.resolve(custom);
  return path.resolve(__dirname, '../../../config/channels-top5.json');
}

/**
 * Loads the curated Top 5 outlets per nation from config/channels-top5.json
 * and upserts them into tv_channels with is_top5 = 1 and status = 'needs my review'.
 */
export function loadTop5Channels(): { loaded: number; updated: number } {
  const configPath = getTop5ConfigPath();
  if (!fs.existsSync(configPath)) {
    console.warn(`[TV:Catalog] Top-5 config file not found at ${configPath}`);
    return { loaded: 0, updated: 0 };
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const data: Top5ConfigFile = JSON.parse(raw);

  const db = getDb();
  let loaded = 0;
  let updated = 0;

  const findStmt = db.prepare(`
    SELECT id, is_top5 FROM tv_channels
    WHERE slug = ? OR stream_url = ? OR LOWER(name) = LOWER(?)
    LIMIT 1
  `);

  const insertStmt = db.prepare(`
    INSERT INTO tv_channels (
      name, slug, country, country_code, category,
      stream_url, youtube_live_url, youtube_channel_id, website,
      logo_url, is_top5, rank, status, evidence, is_alive, last_checked_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 1, datetime('now'))
  `);

  const updateStmt = db.prepare(`
    UPDATE tv_channels SET
      name = ?, slug = ?, country = ?, country_code = ?, category = ?,
      stream_url = ?, youtube_live_url = ?, youtube_channel_id = ?, website = ?,
      logo_url = COALESCE(?, logo_url), is_top5 = 1, rank = ?, status = ?,
      evidence = ?,
      is_alive = CASE WHEN ? = 'verified-playing' THEN 1 ELSE is_alive END,
      last_checked_at = datetime('now')
    WHERE id = ?
  `);

  const transaction = db.transaction((channels: Top5ChannelConfig[]) => {
    // Purge deprecated dummy placeholder rows with example.com
    db.prepare(`
      DELETE FROM tv_channels
      WHERE stream_url LIKE '%example.com%'
        AND (youtube_live_url IS NULL OR youtube_live_url LIKE '%example.com%')
    `).run();

    for (const ch of channels) {
      const existing = findStmt.get(ch.slug, ch.stream_url, ch.name) as
        | { id: number; is_top5: number }
        | undefined;

      if (existing) {
        updateStmt.run(
          ch.name,
          ch.slug,
          ch.country,
          ch.country_code,
          ch.category,
          ch.stream_url,
          ch.youtube_live_url,
          ch.youtube_channel_id,
          ch.website,
          ch.logo_url || null,
          ch.rank,
          ch.status,
          ch.evidence,
          ch.status,
          existing.id
        );
        updated++;
      } else {
        insertStmt.run(
          ch.name,
          ch.slug,
          ch.country,
          ch.country_code,
          ch.category,
          ch.stream_url,
          ch.youtube_live_url,
          ch.youtube_channel_id,
          ch.website,
          ch.logo_url || null,
          ch.rank,
          ch.status,
          ch.evidence
        );
        loaded++;
      }
    }
  });

  transaction(data.channels);
  console.log(`[TV:Catalog] Loaded Top-5 outlets: ${loaded} inserted, ${updated} updated`);
  return { loaded, updated };
}

/**
 * Fetches or reads a cached M3U playlist from backend/data/iptv-cache/
 */
export async function fetchOrReadCachedM3u(
  cacheFilename: string,
  remoteUrl: string,
  forceRefresh = false
): Promise<string> {
  const cacheDir = getIptvCacheDir();
  const filePath = path.join(cacheDir, cacheFilename);

  // In test environment, prefer local cached copy immediately without network latency
  if (fs.existsSync(filePath) && (process.env.NODE_ENV === 'test' || !forceRefresh)) {
    try {
      const stats = fs.statSync(filePath);
      const ageDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      if (process.env.NODE_ENV === 'test' || ageDays < 7) {
        return fs.readFileSync(filePath, 'utf8');
      }
    } catch {
      // Fall through to fetch
    }
  }

  // Attempt remote fetch
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(remoteUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      if (text.startsWith('#EXTM3U') || text.includes('#EXTINF:')) {
        fs.writeFileSync(filePath, text, 'utf8');
        return text;
      }
    }
  } catch (err) {
    console.warn(`[TV:Catalog] Remote fetch failed for ${remoteUrl}, checking local cache:`, err);
  }

  // Fallback: read existing cache if available
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }

  return '';
}

/**
 * Synchronizes IPTV-org playlists into tv_channels with deduplication
 * Top-5 entries take precedence and merge their metadata.
 */
export async function syncIptvCatalog(options?: {
  forceRefresh?: boolean;
}): Promise<{ totalParsed: number; inserted: number; deduplicated: number }> {
  // First, ensure Top 5 channels are present in DB
  loadTop5Channels();

  const playlists: { filename: string; url: string }[] = [
    { filename: 'news.m3u', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
    { filename: 'countries-in.m3u', url: 'https://iptv-org.github.io/iptv/countries/in.m3u' },
    { filename: 'countries-us.m3u', url: 'https://iptv-org.github.io/iptv/countries/us.m3u' },
    { filename: 'countries-cn.m3u', url: 'https://iptv-org.github.io/iptv/countries/cn.m3u' },
    { filename: 'countries-jp.m3u', url: 'https://iptv-org.github.io/iptv/countries/jp.m3u' },
    { filename: 'countries-au.m3u', url: 'https://iptv-org.github.io/iptv/countries/au.m3u' },
    { filename: 'documentary.m3u', url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u' },
    { filename: 'wildlife.m3u', url: 'https://iptv-org.github.io/iptv/categories/wildlife.m3u' },
    { filename: 'outdoor.m3u', url: 'https://iptv-org.github.io/iptv/categories/outdoor.m3u' },
  ];

  let totalParsed = 0;
  let inserted = 0;
  let deduplicated = 0;

  const db = getDb();

  const findStmt = db.prepare(`
    SELECT id, is_top5, logo_url, stream_url FROM tv_channels
    WHERE slug = ? OR stream_url = ? OR LOWER(name) = LOWER(?)
    LIMIT 1
  `);

  const insertStmt = db.prepare(`
    INSERT INTO tv_channels (
      name, slug, country, country_code, category,
      stream_url, logo_url, is_top5, status, is_alive, last_checked_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'community', 1, datetime('now'))
  `);

  const updateCommunityStmt = db.prepare(`
    UPDATE tv_channels SET
      logo_url = COALESCE(?, logo_url),
      last_checked_at = datetime('now')
    WHERE id = ?
  `);

  for (const pl of playlists) {
    const content = await fetchOrReadCachedM3u(pl.filename, pl.url, options?.forceRefresh);
    if (!content) continue;

    const channels = parseM3u(content);
    totalParsed += channels.length;

    const transaction = db.transaction((items: IptvChannelMeta[]) => {
      for (const ch of items) {
        const genSlug = slugify(ch.name);
        const existing = findStmt.get(genSlug, ch.streamUrl, ch.name) as
          | { id: number; is_top5: number; logo_url: string | null; stream_url: string }
          | undefined;

        if (existing) {
          deduplicated++;
          // If existing is a Top-5 channel, Top-5 precedence applies:
          // Never overwrite Top-5 verified URLs, rank, or status.
          // Only merge logo_url if missing.
          if (existing.is_top5 === 1) {
            if (!existing.logo_url && ch.logoUrl) {
              updateCommunityStmt.run(ch.logoUrl, existing.id);
            }
          } else {
            // Update community channel
            updateCommunityStmt.run(ch.logoUrl || null, existing.id);
          }
        } else {
          // New community channel
          insertStmt.run(
            ch.name,
            genSlug,
            ch.country,
            ch.country.length === 2 ? ch.country.toUpperCase() : null,
            ch.category,
            ch.streamUrl,
            ch.logoUrl || null
          );
          inserted++;
        }
      }
    });

    transaction(channels);
  }

  console.log(
    `[TV:Catalog] IPTV-org sync complete: parsed ${totalParsed}, inserted ${inserted}, deduplicated ${deduplicated}`
  );
  return { totalParsed, inserted, deduplicated };
}
