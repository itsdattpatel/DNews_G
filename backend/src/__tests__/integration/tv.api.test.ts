/**
 * backend/src/__tests__/integration/tv.api.test.ts
 * Integration tests for IPTV channels, health checking, and favorites (Phase 11).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { getDb, closeDb } from '../../db/db';
import { parseM3u } from '../../tv/iptv';

describe('TV API & IPTV Engine (Phase 11 — P11-01, P11-02, P11-05, P11-08)', () => {
  beforeEach(() => {
    process.env.DB_PATH = ':memory:';
    const db = getDb();

    // Clear any seeded migration channels so test counts are deterministic
    db.prepare('DELETE FROM tv_channels').run();

    // Insert sample TV channels
    db.prepare(`
      INSERT OR REPLACE INTO tv_channels (id, name, country, category, stream_url, logo_url, is_alive, is_favorite, last_checked_at)
      VALUES
        (101, 'Wild Earth Safari', 'ZA', 'documentary', 'http://example.com/safari.m3u8', 'http://example.com/logo1.png', 1, 1, datetime('now')),
        (102, 'African Waterhole Live', 'KE', 'documentary', 'http://example.com/waterhole.m3u8', 'http://example.com/logo2.png', 1, 0, datetime('now')),
        (103, 'Global News 24', 'USA', 'news', 'http://example.com/news.m3u8', 'http://example.com/logo3.png', 1, 0, datetime('now')),
        (104, 'Offline Feed Test', 'UK', 'news', 'http://example.com/dead.m3u8', 'http://example.com/logo4.png', 0, 0, datetime('now'))
    `).run();
  });

  afterEach(() => {
    closeDb();
    delete process.env.DB_PATH;
    vi.restoreAllMocks();
  });

  it('GET /api/tv/channels filters dead streams by default and pins favorites to top (P11-05, P11-08, P11-10)', async () => {
    const app = createApp();
    const res = await request(app).get('/api/tv/channels').expect(200);

    expect(res.body).toHaveProperty('items');
    expect(res.body.items).toHaveLength(3); // 104 is dead, hidden by default

    // First item should be the favorite (Wild Earth Safari)
    expect(res.body.items[0].id).toBe(101);
    expect(res.body.items[0].is_favorite).toBe(true);

    // Now query with include_dead=true
    const deadRes = await request(app).get('/api/tv/channels?include_dead=true').expect(200);
    expect(deadRes.body.items).toHaveLength(4);
    const deadChannel = deadRes.body.items.find((c: { id: number }) => c.id === 104);
    expect(deadChannel.is_alive).toBe(false);
  });

  it('GET /api/tv/channels filters by animal & discovery shelf category (P11-07)', async () => {
    const app = createApp();
    const res = await request(app).get('/api/tv/channels?category=animals').expect(200);

    expect(res.body.items).toHaveLength(2);
    expect(res.body.items.every((c: { category: string }) => c.category === 'documentary')).toBe(true);
  });

  it('PATCH /api/tv/channels/:id/favorite toggles favorite status (P11-08)', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/tv/channels/102/favorite')
      .send({ is_favorite: true })
      .expect(200);

    expect(res.body.id).toBe(102);
    expect(res.body.is_favorite).toBe(true);

    const db = getDb();
    const row = db.prepare('SELECT is_favorite FROM tv_channels WHERE id = 102').get() as { is_favorite: number };
    expect(row.is_favorite).toBe(1);
  });

  it('parseM3u correctly parses M3U playlist content (P11-01, P11-02)', () => {
    const m3uContent = `
#EXTM3U
#EXTINF:-1 tvg-id="Discovery" tvg-name="Discovery World" tvg-logo="http://example.com/disc.png" tvg-country="US" group-title="Documentary",Discovery World Live
http://stream.example.com/hls/disc.m3u8
#EXTINF:-1 tvg-id="NatureCam" tvg-name="Nature Cam" tvg-country="ZA" group-title="Wildlife",Kruger Live
http://stream.example.com/hls/kruger.m3u8
    `.trim();

    const channels = parseM3u(m3uContent);
    expect(channels).toHaveLength(2);

    expect(channels[0]).toEqual({
      name: 'Discovery World Live',
      country: 'US',
      category: 'documentary',
      logoUrl: 'http://example.com/disc.png',
      streamUrl: 'http://stream.example.com/hls/disc.m3u8',
    });

    expect(channels[1]).toEqual({
      name: 'Kruger Live',
      country: 'ZA',
      category: 'wildlife',
      logoUrl: undefined,
      streamUrl: 'http://stream.example.com/hls/kruger.m3u8',
    });
  });
});
