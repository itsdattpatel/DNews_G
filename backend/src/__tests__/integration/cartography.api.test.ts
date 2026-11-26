/**
 * backend/src/__tests__/integration/cartography.api.test.ts
 * Integration tests for Phase H: Cartography, Chokepoints & Data Markets (Features 29-35).
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
  const mig001 = fs.readFileSync(path.resolve(__dirname, '../../db/migrations/001_initial.sql'), 'utf8');
  db.exec(mig001);
  const mig022 = fs.readFileSync(path.resolve(__dirname, '../../db/migrations/022_cartography_markets.sql'), 'utf8');
  db.exec(mig022);
}

describe('Cartography, Chokepoints & Data Markets (Phase H, Features 29-35)', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    testDb = new Database(':memory:');
    setupSchema(testDb);
    app = createApp();

    testDb.prepare(`
      INSERT INTO sources (id, slug, name, country, url, fetch_type)
      VALUES (1, 'reuters', 'Reuters', 'UK', 'https://reuters.com/rss', 'rss')
    `).run();

    testDb.prepare(`
      INSERT INTO articles (id, source_id, url, title_english, summary, body_english, status, published_at)
      VALUES (401, 1, 'https://test.com/red-sea-oil',
              'Red Sea tanker diversions spike freight rates through Suez corridor',
              'Maritime shipping lines reroute oil tankers away from Bab-el-Mandeb Strait amid elevated naval risk.',
              'Semiconductor supply chains and crude shipments face 14-day Cape of Good Hope transit delays.',
              'done',
              '2026-11-24T09:00:00Z')
    `).run();
  });

  // Feature #29: Masthead Commodity & Currency Ticker Tape
  it('Feature #29: serves seeded commodities and currency ticker items with optional refresh tick', async () => {
    const res = await request(app).get('/api/cartography/markets');
    expect(res.status).toBe(200);
    expect(res.body.tickers.length).toBeGreaterThanOrEqual(8);
    const gold = res.body.tickers.find((t: any) => t.symbol === 'XAU/USD');
    expect(gold).toBeDefined();
    expect(gold.category).toBe('Commodity');

    const refreshed = await request(app).get('/api/cartography/markets?refresh=1');
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.tickers.length).toBeGreaterThanOrEqual(8);
  });

  // Feature #30: Maritime Chokepoint & Sea-Lane Map
  it('Feature #30: returns global maritime chokepoints and matches relevant dispatches', async () => {
    const res = await request(app).get('/api/cartography/chokepoints');
    expect(res.status).toBe(200);
    expect(res.body.chokepoints.length).toBeGreaterThanOrEqual(6);
    const babElMandeb = res.body.chokepoints.find((c: any) => c.slug === 'bab_el_mandeb');
    expect(babElMandeb).toBeDefined();
    expect(babElMandeb.status).toBe('Disrupted');
    expect(babElMandeb.matchedDispatches).toBeGreaterThanOrEqual(1);
  });

  // Feature #31: Climate Anomaly & Extreme Weather Overlay
  it('Feature #31: serves NOAA/Copernicus climate anomaly overlays', async () => {
    const res = await request(app).get('/api/cartography/climate');
    expect(res.status).toBe(200);
    expect(res.body.anomalies.length).toBeGreaterThanOrEqual(4);
    expect(res.body.anomalies[0].delta_celsius).toBeDefined();
    expect(res.body.anomalies[0].severity).toBeDefined();
  });

  // Feature #32: Supply Chain Disruption Flowchart
  it('Feature #32: builds a directed acyclic graph (DAG) of supply chain tiers from article or sector', async () => {
    const res = await request(app)
      .post('/api/cartography/supply-chain')
      .send({ articleId: 401 });

    expect(res.status).toBe(200);
    expect(res.body.sector).toBeDefined();
    expect(res.body.nodes.length).toBeGreaterThanOrEqual(4);
    expect(res.body.edges.length).toBeGreaterThanOrEqual(3);
    expect(res.body.criticalBottleneck).toBeDefined();
  });

  // Feature #33: Epidemiological & Global Health Tracker
  it('Feature #33: returns WHO DON & CDC epidemiological surveillance bulletins', async () => {
    const res = await request(app).get('/api/cartography/epidemics');
    expect(res.status).toBe(200);
    expect(res.body.bulletins.length).toBeGreaterThanOrEqual(4);
    const emergency = res.body.bulletins.find((b: any) => b.alert_level === 'Emergency');
    expect(emergency).toBeDefined();
  });

  // Feature #34: Interactive Electoral & Parliament Seat Simulator
  it('Feature #34: simulates D Hondt and Sainte-Lague seat apportionment accurately with threshold enforcement', async () => {
    const presetsRes = await request(app).get('/api/cartography/elections');
    expect(presetsRes.status).toBe(200);
    expect(presetsRes.body.presets.length).toBeGreaterThanOrEqual(3);

    const parties = [
      { id: 'a', name: 'Party Alpha', color: '#C0392B', votePct: 40 },
      { id: 'b', name: 'Party Beta', color: '#2C4A7C', votePct: 35 },
      { id: 'c', name: 'Party Gamma', color: '#1D6B38', votePct: 21 },
      { id: 'd', name: 'Minor Party', color: '#5C4E3A', votePct: 4 },
    ];

    const dhondtRes = await request(app)
      .post('/api/cartography/elections/simulate')
      .send({ totalSeats: 100, thresholdPct: 5.0, method: 'dhondt', parties });

    expect(dhondtRes.status).toBe(200);
    expect(dhondtRes.body.method).toBe('dhondt');
    expect(dhondtRes.body.majorityRequired).toBe(51);
    const totalAllocated = dhondtRes.body.results.reduce((acc: number, p: any) => acc + p.seats, 0);
    expect(totalAllocated).toBe(100);
    const minorParty = dhondtRes.body.results.find((p: any) => p.id === 'd');
    expect(minorParty.seats).toBe(0); // Excluded below 5% threshold

    const sainteRes = await request(app)
      .post('/api/cartography/elections/simulate')
      .send({ totalSeats: 100, thresholdPct: 5.0, method: 'sainte_lague', parties });

    expect(sainteRes.status).toBe(200);
    expect(sainteRes.body.method).toBe('sainte_lague');
    const totalSainte = sainteRes.body.results.reduce((acc: number, p: any) => acc + p.seats, 0);
    expect(totalSainte).toBe(100);
  });

  // Feature #35: VIP Air Traffic & Diplomatic Flight Tracker
  it('Feature #35: lists diplomatic and humanitarian transport flight vectors', async () => {
    const res = await request(app).get('/api/cartography/flights');
    expect(res.status).toBe(200);
    expect(res.body.flights.length).toBeGreaterThanOrEqual(5);
    const sam = res.body.flights.find((f: any) => f.callsign === 'SAM280');
    expect(sam).toBeDefined();
    expect(sam.mission_type).toBe('Diplomatic Envoy');
  });
});
