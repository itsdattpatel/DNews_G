/**
 * backend/src/__tests__/integration/broadcast.api.test.ts
 * Integration tests for Broadcast, Audio & Media Synthesis (Phase G, Features 21-28).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let testDb: Database.Database;

vi.mock('../../db/db', () => ({
  getDb: () => testDb,
}));

import { createApp } from '../../app';

function setupSchema(db: Database.Database) {
  // Run initial migration
  const mig001 = fs.readFileSync(path.resolve(__dirname, '../../db/migrations/001_initial.sql'), 'utf8');
  db.exec(mig001);
  // Run broadcast migration
  const mig021 = fs.readFileSync(path.resolve(__dirname, '../../db/migrations/021_broadcast_media.sql'), 'utf8');
  db.exec(mig021);
}

describe('Broadcast, Audio & Media Synthesis (Phase G, Features 21-28)', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    testDb = new Database(':memory:');
    setupSchema(testDb);
    app = createApp();

    testDb.prepare(`
      INSERT INTO sources (id, slug, name, country, url, fetch_type)
      VALUES (1, 'thehindu', 'The Hindu', 'India', 'https://thehindu.com/rss', 'rss')
    `).run();

    testDb.prepare(`
      INSERT INTO clusters (id, headline)
      VALUES (88, 'Maritime Treaty Negotiations')
    `).run();

    testDb.prepare(`
      INSERT INTO articles (id, source_id, url, title_english, summary, body_english, status, published_at, cluster_id)
      VALUES (301, 1, 'https://test.com/broadcast-lead', 
              'Global naval patrols deploy as strategic sea corridor reopens', 
              'Maritime logistics coalitions initiate joint surveillance across transit choke points following diplomatic pact.', 
              'Naval taskforces have commenced coordinated patrols today to safeguard commercial tankers.', 
              'done', 
              '2026-11-22T08:00:00Z',
              88)
    `).run();
  });

  // Feature #21: Two-Host Radio Podcast Mode ("The Newsroom Dispatch")
  it('Feature #21: synthesizes two-host radio podcast dialogue with distinct personas', async () => {
    const res = await request(app)
      .post('/api/broadcast/podcast-dialogue')
      .send({ articleId: 301 });

    expect(res.status).toBe(200);
    expect(res.body.episodeTitle).toContain('The Newsroom Dispatch');
    expect(res.body.hostA.name).toBe('Julian Vance');
    expect(res.body.hostB.name).toBe('Evelyn Reed');
    expect(res.body.dialogue.length).toBeGreaterThanOrEqual(4);
    expect(res.body.dialogue[0].speaker).toBe('anchor');
    expect(res.body.dialogue[1].speaker).toBe('reporter');
  });

  // Feature #22: Whisper Local Offline Speech-to-Text for TV News
  it('Feature #22: returns TV subtitles and archives clip to repository', async () => {
    const resGet = await request(app)
      .get('/api/broadcast/tv-subtitles/1');

    expect(resGet.status).toBe(200);
    expect(resGet.body.channelId).toBe(1);
    expect(resGet.body.transcripts.length).toBeGreaterThanOrEqual(2);

    const resPost = await request(app)
      .post('/api/broadcast/tv-subtitles/archive')
      .send({
        channelId: 1,
        text: 'Live breaking quote from diplomatic envoy in Geneva.',
        segmentTitle: 'Geneva Briefing',
        speaker: 'Diplomatic Envoy',
      });

    expect(resPost.status).toBe(200);
    expect(resPost.body.success).toBe(true);
    expect(resPost.body.transcriptId).toBeDefined();
  });

  // Feature #23: Interactive Audio Bar with Chapter Scrubber
  it('Feature #23: computes timecoded chapter navigation milestones', async () => {
    const res = await request(app)
      .get('/api/broadcast/audio-chapters/301');

    expect(res.status).toBe(200);
    expect(res.body.articleId).toBe(301);
    expect(res.body.chapters.length).toBe(4);
    expect(res.body.chapters[0].formattedTime).toBe('00:00');
    expect(res.body.chapters[1].timeOffsetSeconds).toBe(45);
  });

  // Feature #24: Soundtrack for Reading (Ambient Pressroom Soundscapes)
  it('Feature #24: provides procedural soundscape presets without external MP3 assets', async () => {
    const res = await request(app)
      .get('/api/broadcast/soundscape-presets');

    expect(res.status).toBe(200);
    expect(res.body.presets.length).toBeGreaterThanOrEqual(3);
    const nightPreset = res.body.presets.find((p: any) => p.id === 'pressroom_night');
    expect(nightPreset).toBeDefined();
    expect(nightPreset.defaultLevels.rain).toBe(45);
  });

  // Feature #25: Archival Radio Broadcast Simulator
  it('Feature #25: returns 1938 shortwave radio DSP specifications', async () => {
    const res = await request(app)
      .get('/api/broadcast/shortwave-specs');

    expect(res.status).toBe(200);
    expect(res.body.era).toContain('1938');
    expect(res.body.tubeHumFrequencyHz).toBe(60);
    expect(res.body.bandpassRangeHz).toEqual([300, 3200]);
  });

  // Feature #26: Automated 60-Second Video Reel Generator
  it('Feature #26: generates 9:16 mobile video reel storyboard with Ken Burns effects', async () => {
    const res = await request(app)
      .post('/api/broadcast/reel-script/301');

    expect(res.status).toBe(200);
    expect(res.body.aspectRatio).toContain('9:16');
    expect(res.body.totalDurationSeconds).toBe(60);
    expect(res.body.scenes.length).toBe(4);
    expect(res.body.scenes[0].kenBurnsEffect).toBeDefined();
  });

  // Feature #28: CAP (Common Alerting Protocol) Emergency Broadcast Banner
  it('Feature #28: serves emergency CAP alerts and acknowledges them', async () => {
    const resGet = await request(app)
      .get('/api/broadcast/cap-alerts');

    expect(resGet.status).toBe(200);
    expect(resGet.body.alerts.length).toBeGreaterThanOrEqual(2);
    expect(resGet.body.telegraphChirpEnabled).toBe(true);

    const alertId = resGet.body.alerts[0].id;
    const resAck = await request(app)
      .post('/api/broadcast/cap-alerts/acknowledge')
      .send({ id: alertId });

    expect(resAck.status).toBe(200);
    expect(resAck.body.success).toBe(true);
  });
});
