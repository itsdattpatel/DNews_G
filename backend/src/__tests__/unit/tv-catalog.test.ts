/**
 * backend/src/__tests__/unit/tv-catalog.test.ts
 * Comprehensive test suite for IPTV-org Catalog Sync & Curated Top-5 Outlets Per Nation (PRD A Category 5).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { createApp } from '../../app';
import { getDb, closeDb } from '../../db/db';
import {
  loadTop5Channels,
  syncIptvCatalog,
  fetchOrReadCachedM3u,
  slugify,
  getTop5ConfigPath,
  getIptvCacheDir,
  type Top5ConfigFile,
} from '../../tv/catalog';
import { parseM3u } from '../../tv/iptv';

describe('TV Channel Catalog & Curated Top-5 Outlets (PRD A Category 5)', () => {
  const app = createApp();

  beforeEach(() => {
    process.env['DB_PATH'] = ':memory:';
    closeDb();
    const db = getDb();
    // Tables initialized through migrations
  });

  afterEach(() => {
    delete process.env['DB_PATH'];
    closeDb();
    vi.restoreAllMocks();
  });

  describe('Curated Top-5 Configuration (config/channels-top5.json)', () => {
    it('verifies configuration file exists and has valid schema', () => {
      const configPath = getTop5ConfigPath();
      expect(fs.existsSync(configPath)).toBe(true);

      const raw = fs.readFileSync(configPath, 'utf8');
      const data: Top5ConfigFile = JSON.parse(raw);

      expect(data).toHaveProperty('schema_version', 1);
      expect(data).toHaveProperty('channels');
      expect(Array.isArray(data.channels)).toBe(true);
      expect(data.channels.length).toBe(25);
    });

    it('contains exactly 5 verified nations with 5 outlets each', () => {
      const raw = fs.readFileSync(getTop5ConfigPath(), 'utf8');
      const data: Top5ConfigFile = JSON.parse(raw);

      const nations = ['India', 'USA', 'China', 'Japan', 'Australia'];
      for (const nation of nations) {
        const nationChannels = data.channels.filter((c) => c.country === nation);
        expect(nationChannels.length).toBe(5);

        const ranks = nationChannels.map((c) => c.rank).sort();
        expect(ranks).toEqual([1, 2, 3, 4, 5]);
      }
    });

    it('ensures every curated outlet starts with "needs my review" status', () => {
      const raw = fs.readFileSync(getTop5ConfigPath(), 'utf8');
      const data: Top5ConfigFile = JSON.parse(raw);

      for (const ch of data.channels) {
        expect(ch.status).toBe('needs my review');
        expect(ch.youtube_channel_id).toBeTruthy();
        expect(ch.youtube_live_url).toContain('youtube.com/embed');
        expect(ch.website).toMatch(/^https?:\/\//);
        expect(ch.evidence).toBeTruthy();
      }
    });
  });

  describe('Top-5 Ingestion & Database Precedence', () => {
    it('loads all 25 curated outlets into the database with is_top5 = 1', () => {
      const { loaded, updated } = loadTop5Channels();
      expect(loaded + updated).toBe(25);

      const db = getDb();
      const rows = db.prepare('SELECT COUNT(*) as cnt FROM tv_channels WHERE is_top5 = 1').get() as {
        cnt: number;
      };
      expect(rows.cnt).toBe(25);

      // Verify sample channel details
      const ndtv = db
        .prepare('SELECT * FROM tv_channels WHERE slug = ?')
        .get('in_ndtv') as any;
      expect(ndtv).toBeTruthy();
      expect(ndtv.name).toBe('NDTV 24x7');
      expect(ndtv.country).toBe('India');
      expect(ndtv.rank).toBe(1);
      expect(ndtv.status).toBe('needs my review');
      expect(ndtv.youtube_channel_id).toBe('UCZFMm1mMw0F81Z37aaSuT_Q');
    });

    it('updates in place without creating duplicate records on multiple runs', () => {
      loadTop5Channels();
      const secondRun = loadTop5Channels();
      expect(secondRun.loaded).toBe(0);
      expect(secondRun.updated).toBe(25);

      const db = getDb();
      const count = db.prepare('SELECT COUNT(*) as cnt FROM tv_channels WHERE is_top5 = 1').get() as {
        cnt: number;
      };
      expect(count.cnt).toBe(25);
    });
  });

  describe('IPTV-org Playlist Parsing & Deduplication', () => {
    it('parses M3U playlist headers and channel entries accurately', () => {
      const sampleM3u = `
#EXTM3U
#EXTINF:-1 tvg-id="TestNews.us" tvg-country="US" tvg-logo="https://example.com/logo.png" group-title="News",Test News Network
https://example.com/live.m3u8
      `;
      const parsed = parseM3u(sampleM3u);
      expect(parsed.length).toBe(1);
      expect(parsed[0]!.name).toBe('Test News Network');
      expect(parsed[0]!.country).toBe('US');
      expect(parsed[0]!.category).toBe('news');
      expect(parsed[0]!.streamUrl).toBe('https://example.com/live.m3u8');
      expect(parsed[0]!.logoUrl).toBe('https://example.com/logo.png');
    });

    it('enforces Top-5 precedence: preserves Top-5 verified URLs and rank when IPTV duplicates arrive', async () => {
      // 1. Load Top 5 first
      loadTop5Channels();

      const db = getDb();
      const beforeNdtv = db
        .prepare('SELECT * FROM tv_channels WHERE slug = ?')
        .get('in_ndtv') as any;

      // 2. Simulate IPTV-org sync with a matching channel
      await syncIptvCatalog({ forceRefresh: false });

      const afterNdtv = db
        .prepare('SELECT * FROM tv_channels WHERE slug = ?')
        .get('in_ndtv') as any;

      // Top 5 metadata was preserved
      expect(afterNdtv.is_top5).toBe(1);
      expect(afterNdtv.rank).toBe(1);
      expect(afterNdtv.status).toBe('needs my review');
      expect(afterNdtv.youtube_channel_id).toBe(beforeNdtv.youtube_channel_id);
      expect(afterNdtv.youtube_live_url).toBe(beforeNdtv.youtube_live_url);
    });

    it('attaches Unlicense attribution and reads local cache if offline', async () => {
      const attributionPath = path.join(getIptvCacheDir(), 'ATTRIBUTION.md');
      expect(fs.existsSync(attributionPath)).toBe(true);

      const content = fs.readFileSync(attributionPath, 'utf8');
      expect(content).toContain('Unlicense');

      // Test offline fallback for cached news.m3u
      const cached = await fetchOrReadCachedM3u('news.m3u', 'http://invalid-offline-domain.test/news.m3u');
      expect(cached).toContain('#EXTM3U');
    });
  });

  describe('TV Channels REST API Endpoints', () => {
    beforeEach(() => {
      loadTop5Channels();
    });

    it('GET /api/tv/channels returns Top-5 outlets with rank and status', async () => {
      const res = await request(app).get('/api/tv/channels');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body.items.length).toBeGreaterThanOrEqual(25);

      const item = res.body.items[0];
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('is_top5');
      expect(item).toHaveProperty('status');
      expect(item).toHaveProperty('youtube_live_url');
    });

    it('GET /api/tv/channels?top5_only=true returns only curated Top-5 outlets', async () => {
      const res = await request(app).get('/api/tv/channels?top5_only=true');
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(25);
      expect(res.body.items.every((ch: any) => ch.is_top5 === true)).toBe(true);
    });

    it('GET /api/tv/channels?country=India filters to Indian outlets', async () => {
      const res = await request(app).get('/api/tv/channels?country=India');
      expect(res.status).toBe(200);
      expect(res.body.items.every((ch: any) => ch.country === 'India')).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(5);
    });

    it('GET /api/tv/top5 returns channels grouped by nation', async () => {
      const res = await request(app).get('/api/tv/top5');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('nations');
      expect(res.body.nations).toHaveProperty('India');
      expect(res.body.nations).toHaveProperty('USA');
      expect(res.body.nations).toHaveProperty('China');
      expect(res.body.nations).toHaveProperty('Japan');
      expect(res.body.nations).toHaveProperty('Australia');

      expect(res.body.nations['India'].length).toBe(5);
      expect(res.body.nations['USA'].length).toBe(5);
    });
  });
});
