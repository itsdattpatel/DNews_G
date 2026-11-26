/**
 * backend/src/__tests__/integration/editorialAi.api.test.ts
 * Integration tests for AI Editorial Intelligence, Socratic Analysis & Jargon Decoders (Phase F, Features 11-20).
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
  // Run editorial intelligence migration
  const mig020 = fs.readFileSync(path.resolve(__dirname, '../../db/migrations/020_editorial_intelligence.sql'), 'utf8');
  db.exec(mig020);
}

describe('AI Editorial Intelligence & Socratic Suite (Phase F, Features 11-20)', () => {
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
      VALUES (99, 'Central Banking Stability')
    `).run();

    testDb.prepare(`
      INSERT INTO articles (id, source_id, url, title_english, summary, body_english, status, published_at, cluster_id)
      VALUES (201, 1, 'https://test.com/editorial-lead', 
              'Central banks intervene with coordinated currency swap lines', 
              'Financial regulators announce emergency liquidity stabilization across European and American markets.', 
              'Central banks have raised rates sharply. The government announced emergency economic measures today.', 
              'done', 
              '2026-11-21T10:00:00Z',
              99)
    `).run();
  });

  // Feature #11: "Devil's Advocate" Counter-Argument Generator
  it('Feature #11: generates dialectical counter-arguments with precedent citations', async () => {
    const res = await request(app)
      .post('/api/editorial/devils-advocate')
      .send({
        title: 'Central banks intervene with coordinated currency swap lines',
        text: 'Financial regulators announce emergency liquidity stabilization.',
      });

    expect(res.status).toBe(200);
    expect(res.body.coreThesisRebuttal).toBeDefined();
    expect(res.body.counterArguments.length).toBeGreaterThanOrEqual(3);
    expect(res.body.counterArguments[0].precedentCite).toBeDefined();
    expect(res.body.confidenceScore).toBe(88);
  });

  // Feature #12: Historical Parallel Engine ("History Rhymes")
  it('Feature #12: matches ongoing financial crisis against 1907 or Smoot-Hawley precedent', async () => {
    const res = await request(app)
      .get('/api/editorial/historical-rhymes')
      .query({ query: 'liquidity banking panic' });

    expect(res.status).toBe(200);
    expect(res.body.hasPrecedent).toBe(true);
    expect(res.body.parallel.eventName).toContain('Panic of 1907');
    expect(res.body.parallel.precedentYear).toBe(1907);
    expect(res.body.parallel.parallelLesson).toBeDefined();
  });

  // Feature #13: Local Perspective Prism (Global News, Local Eyes)
  it('Feature #13: provides 5 regional foreign bureau perspectives for article', async () => {
    const res = await request(app)
      .get('/api/editorial/perspectives/201');

    expect(res.status).toBe(200);
    expect(res.body.articleId).toBe(201);
    expect(res.body.perspectives.length).toBe(5);
    const bureaus = res.body.perspectives.map((p: any) => p.bureau);
    expect(bureaus.some((b: string) => b.includes('Paris Bureau'))).toBe(true);
    expect(bureaus.some((b: string) => b.includes('Tokyo Bureau'))).toBe(true);
    expect(bureaus.some((b: string) => b.includes('New Delhi Bureau'))).toBe(true);
  });

  // Feature #14: Legislative Bill & Treaty Clause Explainer
  it('Feature #14: explains statutory clause and real-world impact in plain English', async () => {
    const res = await request(app)
      .post('/api/editorial/explain-legislation')
      .send({ query: 'Section 230' });

    expect(res.status).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.actName).toContain('Communications Decency Act');
    expect(res.body.plainExplanation).toContain('publisher');
    expect(res.body.realWorldImpact).toBeDefined();
  });

  // Feature #15: Narrative Arc / Story Lifespan Predictor
  it('Feature #15: forecasts story velocity and lifespan based on cluster metrics', async () => {
    const res = await request(app)
      .get('/api/editorial/narrative-arc/201');

    expect(res.status).toBe(200);
    expect(res.body.classification).toBeDefined();
    expect(res.body.velocityScore).toBeGreaterThan(0);
    expect(res.body.projectedLifespan).toBeDefined();
    expect(res.body.editorialAdvice).toBeDefined();
  });

  // Feature #16: Pre-Publication Fact-Checking Assistant for User Notes
  it('Feature #16: verifies user draft sentences against newsprint corpus', async () => {
    const res = await request(app)
      .post('/api/editorial/factcheck-draft')
      .send({
        text: 'Central banks have raised rates sharply. The government announced emergency economic measures today.',
      });

    expect(res.status).toBe(200);
    expect(res.body.totalSentencesChecked).toBeGreaterThan(0);
    expect(res.body.verifiedCount).toBeGreaterThan(0);
    expect(res.body.checkedSentences[0].status).toBe('verified');
  });

  // Feature #17: Jargon & Legalese Instant Demystifier
  it('Feature #17: demystifies complex financial and legal terminology with analogies', async () => {
    const res = await request(app)
      .get('/api/editorial/demystify')
      .query({ term: 'reverse repo' });

    expect(res.status).toBe(200);
    expect(res.body.term).toBe('reverse repo');
    expect(res.body.field).toBe('Central Banking');
    expect(res.body.plainMeaning).toContain('commercial banks');
    expect(res.body.everydayAnalogy).toContain('pawn shop');
  });

  // Feature #18: Sentiment Drift & Public Mood Monitor
  it('Feature #18: aggregates rolling sentiment data points across macro topics', async () => {
    const res = await request(app)
      .get('/api/editorial/sentiment-drift');

    expect(res.status).toBe(200);
    expect(res.body.topics.length).toBeGreaterThan(0);
    const inflation = res.body.topics.find((t: any) => t.topic.includes('Inflation'));
    expect(inflation).toBeDefined();
    expect(inflation.dataPoints.length).toBeGreaterThanOrEqual(3);
  });

  // Feature #19: Automated Weekly Executive Intelligence Dossier
  it('Feature #19: compiles latest Executive PDB briefing with risk matrix', async () => {
    const res = await request(app)
      .get('/api/editorial/executive-dossier/latest');

    expect(res.status).toBe(200);
    expect(res.body.title).toContain("President's Weekly Intelligence Briefing");
    expect(res.body.riskMatrix.length).toBeGreaterThanOrEqual(4);
    expect(res.body.corpusArticlesAnalyzed).toBeGreaterThanOrEqual(1);
    expect(res.body.strategicForecast).toBeDefined();
  });

  // Feature #20: AI Socratic News Tutor
  it('Feature #20: engages in multi-stage dialectical inquiry with follow-up options', async () => {
    const res1 = await request(app)
      .post('/api/editorial/socratic-tutor')
      .send({ articleId: 201, stage: 1 });

    expect(res1.status).toBe(200);
    expect(res1.body.currentStage).toBe(1);
    expect(res1.body.seniorEditorPersona).toBe('Foreign Bureau Chief (Geneva)');
    expect(res1.body.inquiry).toContain('leverage');
    expect(res1.body.followUpOptions.length).toBeGreaterThanOrEqual(2);

    const res2 = await request(app)
      .post('/api/editorial/socratic-tutor')
      .send({
        articleId: 201,
        userReply: 'Domestic inflation and looming parliamentary elections force compromise.',
        stage: 2,
      });

    expect(res2.status).toBe(200);
    expect(res2.body.currentStage).toBe(2);
    expect(res2.body.inquiry).toContain('counter-incentive');
  });
});
