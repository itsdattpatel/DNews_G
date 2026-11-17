/**
 * backend/src/__tests__/unit/tv-playback.test.ts
 * Unit tests for Category 6: HLS Stream Proxy, SSRF Protection, YouTube Preview & Custom Channel Adder.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app';
import { getDb, closeDb } from '../../db/db';
import {
  isPrivateIpv4,
  isPrivateIpv6,
  validateSsrfTarget,
  rewriteM3u8Playlist,
} from '../../tv/proxy';
import {
  parseYouTubeInput,
  previewYouTubeSource,
  createCustomChannel,
} from '../../tv/youtube';

describe('TV Playback & YouTube Adder (PRD A Category 6)', () => {
  const app = createApp();

  beforeEach(() => {
    process.env['DB_PATH'] = ':memory:';
    closeDb();
    const db = getDb();
  });

  afterEach(() => {
    delete process.env['DB_PATH'];
    closeDb();
    vi.restoreAllMocks();
  });

  describe('SSRF Protection Guard (PRD A §6.1)', () => {
    it('detects and blocks all private and reserved IPv4 address ranges', () => {
      // Loopback
      expect(isPrivateIpv4('127.0.0.1')).toBe(true);
      expect(isPrivateIpv4('127.255.255.255')).toBe(true);
      // Private Class A
      expect(isPrivateIpv4('10.0.0.1')).toBe(true);
      expect(isPrivateIpv4('10.254.1.1')).toBe(true);
      // Private Class B
      expect(isPrivateIpv4('172.16.0.1')).toBe(true);
      expect(isPrivateIpv4('172.31.255.254')).toBe(true);
      expect(isPrivateIpv4('172.32.0.1')).toBe(false); // Public
      // Private Class C
      expect(isPrivateIpv4('192.168.1.1')).toBe(true);
      expect(isPrivateIpv4('192.168.254.254')).toBe(true);
      // Link-local
      expect(isPrivateIpv4('169.254.1.1')).toBe(true);
      // Current network & Multicast
      expect(isPrivateIpv4('0.0.0.0')).toBe(true);
      expect(isPrivateIpv4('224.0.0.1')).toBe(true);
      expect(isPrivateIpv4('240.0.0.1')).toBe(true);

      // Public valid IPs
      expect(isPrivateIpv4('8.8.8.8')).toBe(false);
      expect(isPrivateIpv4('1.1.1.1')).toBe(false);
      expect(isPrivateIpv4('142.250.190.46')).toBe(false);
    });

    it('detects and blocks IPv6 loopback, link-local and unique local ranges', () => {
      expect(isPrivateIpv6('::1')).toBe(true);
      expect(isPrivateIpv6('fe80::1')).toBe(true);
      expect(isPrivateIpv6('fc00::1')).toBe(true);
      expect(isPrivateIpv6('fd12:3456:789a::1')).toBe(true);
      expect(isPrivateIpv6('ff02::1')).toBe(true); // Multicast
      expect(isPrivateIpv6('2001:4860:4860::8888')).toBe(false); // Google Public DNS
    });

    it('blocks internal hostnames and loopback domains', async () => {
      const r1 = await validateSsrfTarget('http://localhost:3000/stream.m3u8');
      expect(r1.valid).toBe(false);
      expect(r1.reason).toContain('Blocked local or internal hostname');

      const r2 = await validateSsrfTarget('http://internal.corp/secret.m3u8');
      expect(r2.valid).toBe(false);

      const r3 = await validateSsrfTarget('http://127.0.0.1:8080/live.m3u8');
      expect(r3.valid).toBe(false);

      const r4 = await validateSsrfTarget('ftp://example.com/stream.m3u8');
      expect(r4.valid).toBe(false);
      expect(r4.reason).toContain('Unsupported protocol');
    });

    it('allows valid public HTTP/HTTPS URLs', async () => {
      const res = await validateSsrfTarget('https://abc-iview-mediapackagestreams-2.akamaized.net/live.m3u8');
      expect(res.valid).toBe(true);
    });
  });

  describe('HLS M3U8 Playlist Chunk Rewriter (PRD A §6.1)', () => {
    it('rewrites relative and absolute segment URLs to route through proxy', () => {
      const parentUrl = 'https://cdn.example.com/live/master.m3u8';
      const m3u8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:6
#EXTINF:6.000,
segment0.ts
#EXTINF:6.000,
../other/segment1.ts
#EXTINF:6.000,
https://other-cdn.example.com/segment2.ts
#EXT-X-ENDLIST`;

      const rewritten = rewriteM3u8Playlist(m3u8, parentUrl);

      expect(rewritten).toContain('/api/tv/proxy?url=https%3A%2F%2Fcdn.example.com%2Flive%2Fsegment0.ts');
      expect(rewritten).toContain('/api/tv/proxy?url=https%3A%2F%2Fcdn.example.com%2Fother%2Fsegment1.ts');
      expect(rewritten).toContain('/api/tv/proxy?url=https%3A%2F%2Fother-cdn.example.com%2Fsegment2.ts');
      expect(rewritten).toContain('#EXTM3U');
    });

    it('rewrites URI attributes inside tags like #EXT-X-MAP and #EXT-X-KEY', () => {
      const parentUrl = 'https://cdn.example.com/stream.m3u8';
      const m3u8 = `#EXTM3U
#EXT-X-MAP:URI="init.mp4"
#EXTINF:4.0,
chunk1.m4s`;

      const rewritten = rewriteM3u8Playlist(m3u8, parentUrl);
      expect(rewritten).toContain('URI="/api/tv/proxy?url=https%3A%2F%2Fcdn.example.com%2Finit.mp4"');
    });
  });

  describe('YouTube Link Parser & Handle Protocol (PRD A §6.2)', () => {
    it('accurately parses video URLs, channel IDs and handles', () => {
      // 1. watch?v=
      const v1 = parseYouTubeInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(v1.type).toBe('video');
      expect(v1.idOrHandle).toBe('dQw4w9WgXcQ');

      // 2. youtu.be/
      const v2 = parseYouTubeInput('https://youtu.be/dQw4w9WgXcQ');
      expect(v2.type).toBe('video');
      expect(v2.idOrHandle).toBe('dQw4w9WgXcQ');

      // 3. /live/
      const v3 = parseYouTubeInput('https://www.youtube.com/live/jfKfPfyJRdk');
      expect(v3.type).toBe('video');
      expect(v3.idOrHandle).toBe('jfKfPfyJRdk');

      // 4. /channel/UC...
      const c1 = parseYouTubeInput('https://www.youtube.com/channel/UCZFMm1mMw0F81Z37aaSuT_Q');
      expect(c1.type).toBe('channel');
      expect(c1.idOrHandle).toBe('UCZFMm1mMw0F81Z37aaSuT_Q');

      // 5. @handle
      const h1 = parseYouTubeInput('https://www.youtube.com/@ndtv');
      expect(h1.type).toBe('handle');
      expect(h1.idOrHandle).toBe('@ndtv');

      // 6. raw handle
      const h2 = parseYouTubeInput('@abcnews');
      expect(h2.type).toBe('handle');
      expect(h2.idOrHandle).toBe('@abcnews');

      // 7. raw <iframe> embed snippet
      const iframeSnippet =
        '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ?si=abcdef" title="YouTube video player" frameborder="0" allowfullscreen></iframe>';
      const ifr = parseYouTubeInput(iframeSnippet);
      expect(ifr.type).toBe('video');
      expect(ifr.idOrHandle).toBe('dQw4w9WgXcQ');

      // 8. /embed/live_stream?channel=UC...
      const liveStream = parseYouTubeInput(
        'https://www.youtube.com/embed/live_stream?channel=UCt4t-jeY85JegMlZ-E5UWtA'
      );
      expect(liveStream.type).toBe('channel');
      expect(liveStream.idOrHandle).toBe('UCt4t-jeY85JegMlZ-E5UWtA');
    });

    it('returns helpful channel ID guide for @handle without API key', async () => {
      delete process.env['YOUTUBE_API_KEY'];
      const preview = await previewYouTubeSource('@ndtv');

      expect(preview.success).toBe(true);
      expect(preview.type).toBe('handle');
      expect(preview.requires_channel_id).toBe(true);
      expect(preview.guide).toContain('channelId');
      expect(preview.guide).toContain('UC');
    });

    it('creates custom channel with status verified in SQLite database', () => {
      const channel = createCustomChannel({
        name: 'My Custom Wire',
        country: 'India',
        category: 'Tech',
        youtube_channel_id: 'UC1234567890abcdefghijkl',
      });

      expect(channel).toBeTruthy();
      expect(channel.name).toBe('My Custom Wire');
      expect(channel.country).toBe('India');
      expect(channel.status).toBe('verified');
      expect(channel.is_alive).toBe(1);
      expect(channel.youtube_live_url).toContain('UC1234567890abcdefghijkl');
      expect(channel.slug).toContain('custom_my_custom_wire');
    });
  });

  describe('TV REST API Playback & Health Endpoints', () => {
    it('GET /api/tv/proxy blocks SSRF requests with 403 status', async () => {
      const res = await request(app).get('/api/tv/proxy?url=http://127.0.0.1:3000/secret.m3u8');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('SSRF_BLOCKED');
    });

    it('POST /api/tv/preview-youtube returns preview result', async () => {
      const res = await request(app)
        .post('/api/tv/preview-youtube')
        .send({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.type).toBe('video');
      expect(res.body.youtube_video_id).toBe('dQw4w9WgXcQ');
      expect(res.body.embed_url).toContain('dQw4w9WgXcQ');
    });

    it('POST /api/tv/custom-channel creates channel and returns 201', async () => {
      const res = await request(app)
        .post('/api/tv/custom-channel')
        .send({
          name: 'BBC World News Test',
          country: 'United Kingdom',
          category: 'News',
          youtube_channel_id: 'UC16niRr50-MSBwiO3YDb3RA',
          website: 'https://www.bbc.com/news',
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('BBC World News Test');
      expect(res.body.is_alive).toBe(true);
      expect(res.body.youtube_channel_id).toBe('UC16niRr50-MSBwiO3YDb3RA');
    });

    it('records and retrieves playback method health (tv_channel_health table)', async () => {
      const custom = createCustomChannel({
        name: 'Test Stream Outlet',
        stream_url: 'https://example.com/live.m3u8',
      });

      // Record HLS health success
      const postRes = await request(app)
        .post(`/api/tv/health/${custom.id}/record`)
        .send({
          method: 'hls',
          success: true,
          latency_ms: 120,
        });
      expect(postRes.status).toBe(200);
      expect(postRes.body.success).toBe(true);

      // Retrieve health records
      const getRes = await request(app).get(`/api/tv/health/${custom.id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.channel_id).toBe(custom.id);
      expect(getRes.body.methods.length).toBe(1);
      expect(getRes.body.methods[0].method).toBe('hls');
      expect(getRes.body.methods[0].latency_ms).toBe(120);
      expect(getRes.body.methods[0].consecutive_failures).toBe(0);
    });

    it('returns counts for LIVE, FAULTY, and STOPPED subpages (PRD A Category 7.1)', async () => {
      // 1. Create a live channel
      createCustomChannel({ name: 'Live Channel 1', stream_url: 'https://example.com/live1.m3u8' });

      // 2. Insert a faulty channel (< 7 days offline)
      const db = getDb();
      db.prepare(`
        INSERT INTO tv_channels (name, slug, stream_url, is_alive, last_checked_at)
        VALUES ('Faulty Channel 1', 'faulty_1', 'https://example.com/bad1.m3u8', 0, datetime('now', '-2 days'))
      `).run();

      // 3. Insert a stopped channel (>= 7 days offline)
      db.prepare(`
        INSERT INTO tv_channels (name, slug, stream_url, is_alive, last_checked_at)
        VALUES ('Stopped Channel 1', 'stopped_1', 'https://example.com/dead1.m3u8', 0, datetime('now', '-10 days'))
      `).run();

      const res = await request(app).get('/api/tv/subpages/counts');
      expect(res.status).toBe(200);
      expect(res.body.live).toBeGreaterThanOrEqual(1);
      expect(res.body.faulty).toBeGreaterThanOrEqual(1);
      expect(res.body.stopped).toBeGreaterThanOrEqual(1);

      // Verify subpage filtering
      const liveRes = await request(app).get('/api/tv/channels?subpage=live');
      expect(liveRes.status).toBe(200);
      expect(liveRes.body.items.some((c: any) => c.name === 'Live Channel 1')).toBe(true);
      expect(liveRes.body.items.some((c: any) => c.name === 'Faulty Channel 1')).toBe(false);

      const faultyRes = await request(app).get('/api/tv/channels?subpage=faulty');
      expect(faultyRes.status).toBe(200);
      expect(faultyRes.body.items.some((c: any) => c.name === 'Faulty Channel 1')).toBe(true);
      expect(faultyRes.body.items.some((c: any) => c.name === 'Stopped Channel 1')).toBe(false);

      const stoppedRes = await request(app).get('/api/tv/channels?subpage=stopped');
      expect(stoppedRes.status).toBe(200);
      expect(stoppedRes.body.items.some((c: any) => c.name === 'Stopped Channel 1')).toBe(true);
      expect(stoppedRes.body.items.some((c: any) => c.name === 'Faulty Channel 1')).toBe(false);
    });

    it('updates channel stream link and restores it to live (PRD A §7.1 Edit URL)', async () => {
      const db = getDb();
      const insert = db.prepare(`
        INSERT INTO tv_channels (name, slug, stream_url, is_alive)
        VALUES ('Broken News', 'broken_news', 'https://example.com/broken.m3u8', 0)
      `).run();
      const id = insert.lastInsertRowid;

      const updateRes = await request(app)
        .put(`/api/tv/channels/${id}`)
        .send({
          name: 'Restored News Net',
          stream_url: 'https://example.com/repaired.m3u8',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.name).toBe('Restored News Net');
      expect(updateRes.body.stream_url).toBe('https://example.com/repaired.m3u8');
      expect(updateRes.body.is_alive).toBe(true);
    });

    it('permanently deletes stopped channel (PRD A §7.1 Stopped Links)', async () => {
      const db = getDb();
      const insert = db.prepare(`
        INSERT INTO tv_channels (name, slug, stream_url, is_alive)
        VALUES ('Dead News Net', 'dead_news', 'https://example.com/dead.m3u8', 0)
      `).run();
      const id = insert.lastInsertRowid;

      const delRes = await request(app).delete(`/api/tv/channels/${id}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      const check = db.prepare('SELECT * FROM tv_channels WHERE id = ?').get(id);
      expect(check).toBeFalsy();
    });
  });
});

