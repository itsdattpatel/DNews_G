const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.resolve('backend/data/news.sqlite');
console.log('Connecting to database:', dbPath);
const db = new Database(dbPath);

const configPath = path.resolve('config/channels-top5.json');
const rawConfig = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(rawConfig);

console.log(`Loaded ${config.channels.length} channels from config/channels-top5.json`);

// 1. Purge dead mock example.com rows and duplicate legacy rows
const deletedMock = db.prepare(`
  DELETE FROM tv_channels 
  WHERE (stream_url LIKE '%example.com%' AND id < 105)
     OR slug = 'us_pbsnewshour'
`).run();
console.log(`Purged ${deletedMock.changes} legacy/mock rows`);

// 2. Prepare statements - prioritize unique slug matching
const findStmt = db.prepare(`
  SELECT id, slug, is_top5 FROM tv_channels
  WHERE slug = ?
     OR (slug IS NULL AND (stream_url = ? OR LOWER(name) = LOWER(?)))
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
    evidence = ?, is_alive = 1, last_checked_at = datetime('now')
  WHERE id = ?
`);

let inserted = 0;
let updated = 0;

db.transaction(() => {
  for (const ch of config.channels) {
    const existing = findStmt.get(ch.slug, ch.stream_url, ch.name);
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
      inserted++;
    }
  }
})();

console.log(`Sync completed: ${inserted} inserted, ${updated} updated`);

// Query summary of synchronized channels
const channels = db.prepare(`
  SELECT id, slug, name, country, category, is_alive, is_top5, status, stream_url, youtube_live_url 
  FROM tv_channels
  ORDER BY id ASC
`).all();

console.log(`\nCurrent Database TV Channels (${channels.length} total):`);
console.table(channels.map(c => ({
  id: c.id,
  name: c.name,
  country: c.country,
  cat: c.category,
  alive: c.is_alive,
  top5: c.is_top5,
  status: c.status
})));
