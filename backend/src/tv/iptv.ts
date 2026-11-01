/**
 * backend/src/tv/iptv.ts
 * IPTV playlist parser and synchronization service (P11-01, P11-02, P11-03).
 */
import { getDb } from '../db/db';

export interface IptvChannelMeta {
  name: string;
  country: string;
  category: string;
  streamUrl: string;
  logoUrl?: string | undefined;
}

/**
 * Parses raw M3U / M3U8 playlist format into structured channel records.
 */
export function parseM3u(content: string): IptvChannelMeta[] {
  const lines = content.split(/\r?\n/);
  const channels: IptvChannelMeta[] = [];

  let currentMeta: Partial<IptvChannelMeta> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      currentMeta = {};

      // Extract logo: tvg-logo="url"
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      if (logoMatch && logoMatch[1]) {
        currentMeta.logoUrl = logoMatch[1];
      }

      // Extract country: tvg-country="US"
      const countryMatch = line.match(/tvg-country="([^"]+)"/i);
      if (countryMatch && countryMatch[1]) {
        currentMeta.country = countryMatch[1].toUpperCase();
      }

      // Extract category: group-title="News"
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      if (groupMatch && groupMatch[1]) {
        currentMeta.category = groupMatch[1].toLowerCase();
      }

      // Extract channel title after last comma
      const commaIdx = line.lastIndexOf(',');
      if (commaIdx !== -1) {
        currentMeta.name = line.substring(commaIdx + 1).trim();
      } else {
        currentMeta.name = 'Unnamed Channel';
      }
    } else if (!line.startsWith('#') && (line.startsWith('http://') || line.startsWith('https://'))) {
      if (currentMeta && currentMeta.name) {
        channels.push({
          name: currentMeta.name,
          country: currentMeta.country || 'Global',
          category: currentMeta.category || 'general',
          streamUrl: line,
          logoUrl: currentMeta.logoUrl,
        });
      }
      currentMeta = null;
    }
  }

  return channels;
}

/**
 * Synchronizes parsed channels into the SQLite tv_channels table.
 */
export function upsertChannels(channels: IptvChannelMeta[]): number {
  const db = getDb();
  const insertStmt = db.prepare(`
    INSERT INTO tv_channels (name, country, category, stream_url, logo_url, is_alive, last_checked_at)
    VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
  `);

  const existsStmt = db.prepare('SELECT id FROM tv_channels WHERE stream_url = ?');

  let inserted = 0;
  const transaction = db.transaction((items: IptvChannelMeta[]) => {
    for (const ch of items) {
      const existing = existsStmt.get(ch.streamUrl);
      if (!existing) {
        insertStmt.run(ch.name, ch.country, ch.category, ch.streamUrl, ch.logoUrl || null);
        inserted++;
      }
    }
  });

  transaction(channels);
  return inserted;
}
