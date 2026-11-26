/**
 * backend/src/routes/cartography.ts
 * Phase H: Cartography, Chokepoints & Data Markets (Features 29-35)
 */
import { Router, Request, Response } from 'express';
import { getDb } from '../db/db';

const router = Router();

interface ElectionPartyInput {
  id: string;
  name: string;
  color: string;
  votePct: number;
}

/**
 * Allocates seats using Highest Averages method (D'Hondt or Sainte-Laguë).
 * Respects statutory thresholdPct.
 */
function allocateSeats(
  parties: ElectionPartyInput[],
  totalSeats: number,
  thresholdPct: number,
  method: 'dhondt' | 'sainte_lague'
): Array<ElectionPartyInput & { seats: number; qualified: boolean }> {
  const qualified = parties.map((p) => ({
    ...p,
    seats: 0,
    qualified: Number(p.votePct) >= thresholdPct,
  }));

  const eligible = qualified.filter((p) => p.qualified && p.votePct > 0);
  if (eligible.length === 0 || totalSeats <= 0) {
    return qualified;
  }

  for (let s = 0; s < totalSeats; s++) {
    let bestParty = eligible[0]!;
    let bestQuotient = -1;

    for (const p of eligible) {
      const divisor = method === 'sainte_lague' ? 2 * p.seats + 1 : p.seats + 1;
      const quotient = p.votePct / divisor;
      if (quotient > bestQuotient) {
        bestQuotient = quotient;
        bestParty = p;
      }
    }

    bestParty.seats += 1;
  }

  return qualified;
}

// 1. Feature #29: Masthead Commodity & Currency Ticker Tape
router.get('/markets', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const shouldRefresh = req.query.refresh === '1';

    let tickers = db
      .prepare('SELECT * FROM market_tickers ORDER BY id ASC')
      .all() as Array<{
        id: number;
        symbol: string;
        name: string;
        category: string;
        price: number;
        unit: string;
        change_24h: number;
        change_pct: number;
        updated_at: string;
      }>;

    if (shouldRefresh && tickers.length > 0) {
      const updateStmt = db.prepare(`
        UPDATE market_tickers
        SET price = ?, change_24h = ?, change_pct = ?, updated_at = datetime('now')
        WHERE id = ?
      `);
      const tx = db.transaction(() => {
        for (const t of tickers) {
          const jitter = (Math.random() - 0.5) * 0.004; // ±0.2% realistic micro-tick
          const delta = Number((t.price * jitter).toFixed(t.price < 10 ? 4 : 2));
          const newPrice = Number((t.price + delta).toFixed(t.price < 10 ? 4 : 2));
          const newChange = Number((t.change_24h + delta).toFixed(t.price < 10 ? 4 : 2));
          const base = Math.max(0.0001, newPrice - newChange);
          const newPct = Number(((newChange / base) * 100).toFixed(2));
          updateStmt.run(newPrice, newChange, newPct, t.id);
        }
      });
      tx();
      tickers = db.prepare('SELECT * FROM market_tickers ORDER BY id ASC').all() as typeof tickers;
    }

    res.json({
      tickers,
      lastUpdatedUtc: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load market tickers: ' + err.message });
  }
});

// 2. Feature #30: Maritime Chokepoint & Sea-Lane Map
router.get('/chokepoints', (_req: Request, res: Response): void => {
  try {
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM maritime_chokepoints ORDER BY risk_level DESC')
      .all() as Array<{
        id: number;
        slug: string;
        name: string;
        region: string;
        lat: number;
        lng: number;
        status: string;
        risk_level: number;
        daily_transits: number;
        global_trade_pct: number;
        incident_summary: string;
        keywords_json: string;
        updated_at: string;
      }>;

    const recentArticles = db
      .prepare(`
        SELECT id, title_english, summary
        FROM articles
        WHERE status = 'done'
        ORDER BY published_at DESC
        LIMIT 120
      `)
      .all() as Array<{ id: number; title_english: string | null; summary: string | null }>;

    const chokepoints = rows.map((row) => {
      let keywords: string[] = [];
      try {
        keywords = JSON.parse(row.keywords_json || '[]');
      } catch {
        keywords = [];
      }

      const matchedIds: number[] = [];
      for (const art of recentArticles) {
        const haystack = `${art.title_english || ''} ${art.summary || ''}`.toLowerCase();
        if (keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
          matchedIds.push(art.id);
        }
      }

      return {
        ...row,
        keywords,
        matchedDispatches: matchedIds.length,
        matchedArticleIds: matchedIds.slice(0, 5),
      };
    });

    res.json({
      chokepoints,
      totalGlobalTradePctMonitored: Number(
        chokepoints.reduce((sum, c) => sum + c.global_trade_pct, 0).toFixed(1)
      ),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load maritime chokepoints: ' + err.message });
  }
});

// 3. Feature #31: Climate Anomaly & Extreme Weather Overlay
router.get('/climate', (_req: Request, res: Response): void => {
  try {
    const db = getDb();
    const anomalies = db
      .prepare('SELECT * FROM climate_anomalies ORDER BY delta_celsius DESC')
      .all();

    res.json({
      anomalies,
      layerSource: 'NOAA NCEI / Copernicus Climate Change Service',
      updatedUtc: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load climate anomalies: ' + err.message });
  }
});

// 4. Feature #32: Supply Chain Disruption Flowchart (DAG)
router.post('/supply-chain', (req: Request, res: Response): void => {
  try {
    const { articleId, sector, commodity } = req.body as {
      articleId?: number;
      sector?: string;
      commodity?: string;
    };
    const db = getDb();

    let combinedText = `${sector || ''} ${commodity || ''}`.toLowerCase();
    let headline = '';

    if (articleId) {
      const art = db
        .prepare('SELECT title_english, summary, body_english FROM articles WHERE id = ?')
        .get(articleId) as { title_english?: string; summary?: string; body_english?: string } | undefined;
      if (art) {
        headline = art.title_english || '';
        combinedText += ` ${art.title_english || ''} ${art.summary || ''} ${art.body_english || ''}`.toLowerCase();
      }
    }

    // Match domain profile dynamically from text or explicit sector
    let resolvedSector = 'Maritime Container Freight';
    let criticalBottleneck = 'Bab-el-Mandeb & Suez Rerouting (+14 Days Transit)';
    let estimatedRetailLagWeeks = 4;
    let nodes = [
      { id: 'n1', tier: 1, label: 'East Asian Manufacturing Hubs', detail: 'Shenzhen, Busan, Kaohsiung Exports', risk: 'Medium' },
      { id: 'n2', tier: 2, label: 'Strait of Malacca & Red Sea', detail: 'Primary Sea-Lane & Bunker Terminals', risk: 'Critical' },
      { id: 'n3', tier: 3, label: 'Rotterdam & Savannah Ports', detail: 'Container Berth & Intermodal Rail', risk: 'High' },
      { id: 'n4', tier: 4, label: 'Consumer Electronics & Retail', detail: 'Spot Freight Insurance & Inventory Costs', risk: 'Medium' },
    ];
    let edges = [
      { from: 'n1', to: 'n2', label: 'VLCC / 24k TEU Container Feeders' },
      { from: 'n2', to: 'n3', label: 'Cape of Good Hope Diversion' },
      { from: 'n3', to: 'n4', label: 'Port-to-Shelf Distribution (+18% Cost)' },
    ];

    if (/oil|crude|gas|energy|hormuz|tanker|petroleum/.test(combinedText)) {
      resolvedSector = 'Global Crude Oil & Petrochemicals';
      criticalBottleneck = 'Strait of Hormuz VLCC Insurance & Tanker Escort Queue';
      estimatedRetailLagWeeks = 2;
      nodes = [
        { id: 'n1', tier: 1, label: 'Upstream Hydrocarbon Fields', detail: 'Basra, Ghawar, Ras Tanura Terminals', risk: 'Medium' },
        { id: 'n2', tier: 2, label: 'Strait of Hormuz Chokepoint', detail: '21% Global Petroleum Liquid Flow', risk: 'Critical' },
        { id: 'n3', tier: 3, label: 'Refining & Cracking Hubs', detail: 'Jurong Island, Jamnagar, Antwerp', risk: 'High' },
        { id: 'n4', tier: 4, label: 'Diesel, Aviation Fuel & Plastics', detail: 'Transport & Consumer Packaging Costs', risk: 'High' },
      ];
      edges = [
        { from: 'n1', to: 'n2', label: 'Export Pipeline & Tanker Loading' },
        { from: 'n2', to: 'n3', label: 'Naval Convoy & War-Risk Surcharge' },
        { from: 'n3', to: 'n4', label: 'Distillate Crack Spread Pass-Through' },
      ];
    } else if (/chip|semiconductor|lithium|neon|tech|ai|wafer|tsmc/.test(combinedText)) {
      resolvedSector = 'Advanced Semiconductors & Critical Minerals';
      criticalBottleneck = 'Extreme Ultraviolet (EUV) Lithography & Neon Gas Purification';
      estimatedRetailLagWeeks = 8;
      nodes = [
        { id: 'n1', tier: 1, label: 'Ultra-Pure Neon & Gallium', detail: 'Specialty Gas & Rare-Earth Refineries', risk: 'High' },
        { id: 'n2', tier: 2, label: 'Foundry Fabrication (3nm/5nm)', detail: 'Taiwan & South Korea Cleanrooms', risk: 'Critical' },
        { id: 'n3', tier: 3, label: 'Packaging & Testing (OSAT)', detail: 'Malaysia & Vietnam Assembly Plants', risk: 'Medium' },
        { id: 'n4', tier: 4, label: 'Automotive ECUs & Data Centers', detail: 'OEM Allocation & Lead-Time Extension', risk: 'High' },
      ];
      edges = [
        { from: 'n1', to: 'n2', label: 'Cryogenic Air-Cargo Logistics' },
        { from: 'n2', to: 'n3', label: 'Wafer-Level Air Freight' },
        { from: 'n3', to: 'n4', label: 'Tier-1 OEM Module Delivery' },
      ];
    } else if (/wheat|grain|food|fertilizer|ukraine|bosporus|drought|crop/.test(combinedText)) {
      resolvedSector = 'Agri-Commodities, Grain & Potash';
      criticalBottleneck = 'Bosporus Inspection Protocol & Panama Canal Draft Limits';
      estimatedRetailLagWeeks = 5;
      nodes = [
        { id: 'n1', tier: 1, label: 'Black Sea & Midwest Harvest', detail: 'Wheat, Maize & Ammonia Fertilizers', risk: 'High' },
        { id: 'n2', tier: 2, label: 'Bosporus & Panama Transits', detail: 'Panamax Bulk Carrier Queues', risk: 'Critical' },
        { id: 'n3', tier: 3, label: 'Coastal Grain Silos & Mills', detail: 'Alexandria, Mombasa & Jakarta Terminals', risk: 'Medium' },
        { id: 'n4', tier: 4, label: 'Staple Flour & Livestock Feed', detail: 'Municipal Food Price Index Impact', risk: 'High' },
      ];
      edges = [
        { from: 'n1', to: 'n2', label: 'River Barge to Deepwater Port' },
        { from: 'n2', to: 'n3', label: 'Bulk Maritime Transit' },
        { from: 'n3', to: 'n4', label: 'Milling & Domestic Supply Distribution' },
      ];
    }

    res.json({
      articleId: articleId || null,
      headline: headline || `${resolvedSector} Impact Model`,
      sector: resolvedSector,
      criticalBottleneck,
      estimatedRetailLagWeeks,
      nodes,
      edges,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate supply chain DAG: ' + err.message });
  }
});

// 5. Feature #33: Epidemiological & Global Health Tracker
router.get('/epidemics', (_req: Request, res: Response): void => {
  try {
    const db = getDb();
    const bulletins = db
      .prepare('SELECT * FROM epidemiological_bulletins ORDER BY confirmed_cases DESC')
      .all();

    res.json({
      bulletins,
      network: 'WHO Disease Outbreak News (DON) & Regional CDC',
      updatedUtc: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load epidemiological bulletins: ' + err.message });
  }
});

// 6. Feature #34: Interactive Electoral & Parliament Seat Simulator
router.get('/elections', (_req: Request, res: Response): void => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM electoral_presets ORDER BY id ASC').all() as Array<{
      id: number;
      slug: string;
      name: string;
      country: string;
      total_seats: number;
      threshold_pct: number;
      parties_json: string;
    }>;

    const presets = rows.map((r) => ({
      ...r,
      parties: JSON.parse(r.parties_json || '[]'),
    }));

    res.json({ presets });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load electoral presets: ' + err.message });
  }
});

router.post('/elections/simulate', (req: Request, res: Response): void => {
  try {
    const {
      totalSeats = 100,
      thresholdPct = 5.0,
      method = 'dhondt',
      parties = [],
    } = req.body as {
      totalSeats?: number;
      thresholdPct?: number;
      method?: 'dhondt' | 'sainte_lague';
      parties?: ElectionPartyInput[];
    };

    if (!Array.isArray(parties) || parties.length === 0) {
      res.status(400).json({ error: 'At least one party must be supplied for seat simulation.' });
      return;
    }

    const sanitizedSeats = Math.max(10, Math.min(1000, Math.floor(Number(totalSeats) || 100)));
    const sanitizedThreshold = Math.max(0, Math.min(25, Number(thresholdPct) || 0));
    const resolvedMethod = method === 'sainte_lague' ? 'sainte_lague' : 'dhondt';

    const results = allocateSeats(parties, sanitizedSeats, sanitizedThreshold, resolvedMethod);
    const majorityRequired = Math.floor(sanitizedSeats / 2) + 1;

    res.json({
      totalSeats: sanitizedSeats,
      thresholdPct: sanitizedThreshold,
      method: resolvedMethod,
      majorityRequired,
      results,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to simulate parliamentary seats: ' + err.message });
  }
});

// 7. Feature #35: VIP Air Traffic & Diplomatic Flight Tracker
router.get('/flights', (_req: Request, res: Response): void => {
  try {
    const db = getDb();
    const flights = db
      .prepare('SELECT * FROM diplomatic_flights ORDER BY updated_at DESC')
      .all();

    res.json({
      flights,
      source: 'OpenSky Network Diplomatic & Relief Transponder Cache',
      updatedUtc: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load diplomatic flight vectors: ' + err.message });
  }
});

export default router;
