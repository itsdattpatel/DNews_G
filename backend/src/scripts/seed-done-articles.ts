/**
 * backend/src/scripts/seed-done-articles.ts
 * Seeds realistic 'done' articles with summaries, keywords, and categories.
 */
import { getDb } from '../db/db';

const db = getDb();

const sampleStories = [
  {
    url: 'https://www.reuters.com/business/global-green-tech-investment-soars-2026',
    title_english: 'Global Clean Energy Investment Reaches Historic High Across Key Markets',
    summary: 'Worldwide investments in renewable solar grids and wind storage have surpassed annual records. Major economies in North America, Europe, and Asia report accelerated deployment of high-capacity battery storage systems, reducing reliance on fossil generation.',
    source_id: 1,
    breaking_score: 45,
    categories: ['Business', 'Tech', 'Environment'],
    keywords: ['clean-energy', 'renewable-grid', 'battery-storage', 'solar-power', 'climate-tech'],
  },
  {
    url: 'https://apnews.com/article/wildlife-protection-corridors-established-2026',
    title_english: 'Transboundary Wildlife Corridors Established to Protect Endangered Snow Leopards',
    summary: 'Conservation biologists and forestry ministers from four Himalayan nations signed a landmark agreement establishing contiguous wildlife corridors. Satellite telemetry tracking will monitor predator migrations and prevent poaching across high-altitude mountain ranges.',
    source_id: 2,
    breaking_score: 82,
    categories: ['Animals', 'Environment', 'World'],
    keywords: ['snow-leopards', 'wildlife-corridors', 'himalayas', 'conservation', 'anti-poaching'],
  },
  {
    url: 'https://scmp.com/news/asia/supercomputing-breakthrough-quantum-chips-2026',
    title_english: 'Researchers Unveil Fault-Tolerant Optical Quantum Processing Architecture',
    summary: 'A multinational research consortium announced a scalable photonic quantum computing chip capable of operating at room temperature. The breakthrough promises to accelerate molecular simulations and drug discovery workflows by several orders of magnitude.',
    source_id: 3,
    breaking_score: 68,
    categories: ['Tech', 'Science'],
    keywords: ['quantum-chips', 'photonics', 'computing', 'breakthrough', 'nanotechnology'],
  },
  {
    url: 'https://thehindu.com/news/national/monsoon-radar-network-deployment-2026',
    title_english: 'Advanced Doppler Radar Network Deployed Across Coastal Weather Stations',
    summary: 'Meteorological agencies have completed installation of dual-polarization Doppler radar systems along vulnerable coastlines. The high-resolution sensor network provides real-time early warning capabilities for cyclones and extreme precipitation events.',
    source_id: 4,
    breaking_score: 76,
    categories: ['Science', 'World'],
    keywords: ['radar-network', 'cyclone-warning', 'monsoon', 'meteorology', 'early-alert'],
  },
];

const insertArticle = db.prepare(`
  INSERT INTO articles (source_id, url, title_english, summary, status, breaking_score, published_at, fetched_at, ai_processed_at)
  VALUES (@source_id, @url, @title_english, @summary, 'done', @breaking_score, datetime('now'), datetime('now'), datetime('now'))
  ON CONFLICT(url) DO UPDATE SET
    title_english = excluded.title_english,
    summary = excluded.summary,
    status = 'done',
    breaking_score = excluded.breaking_score
`);

const insertCat = db.prepare(`
  INSERT OR IGNORE INTO article_categories (article_id, category) VALUES (?, ?)
`);

const insertKw = db.prepare(`
  INSERT OR IGNORE INTO keywords (article_id, keyword, position) VALUES (?, ?, ?)
`);

db.transaction(() => {
  for (const story of sampleStories) {
    insertArticle.run(story);
    const row = db.prepare('SELECT id FROM articles WHERE url = ?').get(story.url) as { id: number };
    const articleId = row.id;

    for (const cat of story.categories) {
      insertCat.run(articleId, cat);
    }

    story.keywords.forEach((kw, idx) => {
      insertKw.run(articleId, kw, idx);
    });
  }
})();

console.log('Seeded 4 rich articles with keywords and categories.');
