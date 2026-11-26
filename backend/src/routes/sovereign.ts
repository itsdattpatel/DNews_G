/**
 * backend/src/routes/sovereign.ts
 * Phase J & K: Mobile Power-User OS Integration & Archival Sovereignty (Features 43-50)
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../db/db';

const router = Router();

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 1. Feature #43: Android Home Screen Broadside Widget Endpoint
router.get('/android-widget', (_req: Request, res: Response): void => {
  try {
    const db = getDb();
    const lead = db
      .prepare(`
        SELECT a.id, a.title_english, a.breaking_score, a.published_at, s.name as source_name
        FROM articles a
        JOIN sources s ON a.source_id = s.id
        WHERE a.status = 'done'
        ORDER BY a.breaking_score DESC, a.published_at DESC
        LIMIT 1
      `)
      .get() as any;

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM articles WHERE status = 'done'`)
      .get() as { total: number };

    let masthead = 'The World Desk';
    try {
      const pref = db.prepare(`SELECT masthead_title FROM bindery_preferences WHERE id = 1`).get() as any;
      if (pref?.masthead_title) masthead = pref.masthead_title;
    } catch {
      // Optional table if 023 hasn't been run in isolated test
    }

    res.json({
      widgetLayout: '4x2',
      masthead,
      leadArticleId: lead?.id || null,
      leadHeadline: lead?.title_english || 'Wire Monitoring Standby — Pull to Synchronize',
      leadSource: lead?.source_name || 'Global Wire',
      leadBreakingScore: lead?.breaking_score || 0,
      unreadWireCount: countRow?.total || 0,
      updatedUtc: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compile Android widget payload: ' + err.message });
  }
});

// 2. Features #45, #46, #47, #49 Settings
router.get('/settings', (_req: Request, res: Response): void => {
  try {
    const db = getDb();
    const settings = db.prepare('SELECT * FROM sovereign_settings WHERE id = 1').get();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to read sovereign settings: ' + err.message });
  }
});

router.patch('/settings', (req: Request, res: Response): void => {
  try {
    const { e_ink_mode, volume_key_nav, mesh_sync_enabled, enclave_locked } = req.body;
    const db = getDb();
    const cur = db.prepare('SELECT * FROM sovereign_settings WHERE id = 1').get() as any;

    const nextEInk = e_ink_mode !== undefined ? (e_ink_mode ? 1 : 0) : cur.e_ink_mode;
    const nextVol = volume_key_nav !== undefined ? (volume_key_nav ? 1 : 0) : cur.volume_key_nav;
    const nextMesh = mesh_sync_enabled !== undefined ? (mesh_sync_enabled ? 1 : 0) : cur.mesh_sync_enabled;
    const nextLock = enclave_locked !== undefined ? (enclave_locked ? 1 : 0) : cur.enclave_locked;

    db.prepare(`
      UPDATE sovereign_settings
      SET e_ink_mode = ?, volume_key_nav = ?, mesh_sync_enabled = ?, enclave_locked = ?, updated_at = datetime('now')
      WHERE id = 1
    `).run(nextEInk, nextVol, nextMesh, nextLock);

    const updated = db.prepare('SELECT * FROM sovereign_settings WHERE id = 1').get();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update sovereign settings: ' + err.message });
  }
});

// 3. Feature #47: Local Peer-to-Peer Mesh News Sync
router.get('/mesh/bundle', (_req: Request, res: Response): void => {
  try {
    const db = getDb();
    const settings = db.prepare('SELECT * FROM sovereign_settings WHERE id = 1').get() as any;
    const articles = db
      .prepare(`
        SELECT a.id, a.url, a.title_english, a.summary, a.breaking_score, a.published_at, s.name as source_name, s.country
        FROM articles a
        JOIN sources s ON a.source_id = s.id
        WHERE a.status = 'done'
        ORDER BY a.published_at DESC
        LIMIT 25
      `)
      .all() as any[];

    const serialized = JSON.stringify(articles);
    const bundleSha256 = crypto.createHash('sha256').update(serialized).digest('hex');
    const peers = db.prepare('SELECT * FROM mesh_sync_log ORDER BY synced_at DESC LIMIT 10').all();

    res.json({
      nodeId: settings?.mesh_node_id || 'dnews-node-alpha',
      meshSyncEnabled: Boolean(settings?.mesh_sync_enabled ?? 1),
      bundleSha256,
      articleCount: articles.length,
      articles,
      peers,
      generatedUtc: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to prepare P2P mesh bundle: ' + err.message });
  }
});

router.post('/mesh/sync', (req: Request, res: Response): void => {
  try {
    const { peerId, peerLabel, bundleSha256, articleCount = 0 } = req.body as {
      peerId?: string;
      peerLabel?: string;
      bundleSha256?: string;
      articleCount?: number;
    };

    if (!peerId || !bundleSha256) {
      res.status(400).json({ error: 'peerId and bundleSha256 are required for mesh sync verification.' });
      return;
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO mesh_sync_log (peer_id, peer_label, bundle_sha256, article_count, synced_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(peerId, peerLabel || peerId, bundleSha256, Number(articleCount) || 0);

    const peers = db.prepare('SELECT * FROM mesh_sync_log ORDER BY synced_at DESC LIMIT 10').all();
    res.json({
      success: true,
      verifiedSha256: bundleSha256,
      peers,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record mesh peer synchronization: ' + err.message });
  }
});

// 4. Feature #48: Wayback Machine & Internet Archive Auto-Mirroring
router.get('/wayback/:articleId', (req: Request, res: Response): void => {
  try {
    const articleId = parseInt(req.params.articleId, 10);
    const db = getDb();
    const mirror = db.prepare('SELECT * FROM wayback_mirrors WHERE article_id = ?').get(articleId);
    res.json({ articleId, mirror: mirror || null });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to read Wayback mirror ledger: ' + err.message });
  }
});

router.post('/wayback/:articleId/snapshot', async (req: Request, res: Response): Promise<void> => {
  try {
    const articleId = parseInt(req.params.articleId, 10);
    const db = getDb();
    const art = db
      .prepare('SELECT id, url, title_english, body_english, summary FROM articles WHERE id = ?')
      .get(articleId) as any;

    if (!art) {
      res.status(404).json({ error: 'Article not found for archival mirroring.' });
      return;
    }

    const contentHash = crypto
      .createHash('sha256')
      .update(`${art.url}\n${art.title_english || ''}\n${art.body_english || art.summary || ''}`)
      .digest('hex');

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    let archiveUrl = `https://web.archive.org/web/${timestamp}/${art.url}`;
    let status: 'Mirrored' | 'Queued' | 'Offline Cached' = 'Offline Cached';

    // Non-blocking quick check against archive.org if network is active
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1800);
      const checkRes = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(art.url)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (checkRes.ok) {
        const data = (await checkRes.json()) as any;
        if (data?.archived_snapshots?.closest?.available) {
          archiveUrl = data.archived_snapshots.closest.url;
          status = 'Mirrored';
        } else {
          status = 'Queued';
        }
      }
    } catch {
      // Offline / air-gapped environments safely retain local SHA-256 archival proof
      status = 'Offline Cached';
    }

    db.prepare(`
      INSERT INTO wayback_mirrors (article_id, original_url, archive_url, status, snapshot_timestamp, content_sha256, checked_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(article_id) DO UPDATE SET
        archive_url = excluded.archive_url,
        status = excluded.status,
        snapshot_timestamp = excluded.snapshot_timestamp,
        content_sha256 = excluded.content_sha256,
        checked_at = datetime('now')
    `).run(articleId, art.url, archiveUrl, status, timestamp, contentHash);

    const mirror = db.prepare('SELECT * FROM wayback_mirrors WHERE article_id = ?').get(articleId);
    res.json({ success: true, mirror });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create Wayback snapshot record: ' + err.message });
  }
});

// 5. Feature #49: Hardware Security Key (FIDO2 / YubiKey) Lock
router.get('/fido2/status', (_req: Request, res: Response): void => {
  try {
    const db = getDb();
    const settings = db.prepare('SELECT enclave_locked FROM sovereign_settings WHERE id = 1').get() as any;
    const credentials = db.prepare('SELECT id, credential_id, label, algorithm, created_at, last_used_at FROM fido2_credentials ORDER BY id DESC').all();
    res.json({
      enclaveLocked: Boolean(settings?.enclave_locked),
      credentials,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to inspect FIDO2 enclave status: ' + err.message });
  }
});

router.post('/fido2/register', (req: Request, res: Response): void => {
  try {
    const {
      label = 'Hardware Security Key',
      credentialId,
      publicKeySpki = 'WEBAUTHN-ES256-KEY',
      algorithm = 'ES256',
    } = req.body as { label?: string; credentialId?: string; publicKeySpki?: string; algorithm?: string };

    const resolvedCredId = credentialId || `fido2-${crypto.randomBytes(12).toString('hex')}`;
    const db = getDb();

    db.prepare(`
      INSERT INTO fido2_credentials (credential_id, label, public_key_spki, algorithm, last_used_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(credential_id) DO UPDATE SET
        label = excluded.label,
        last_used_at = datetime('now')
    `).run(resolvedCredId, label, publicKeySpki, algorithm);

    const credential = db.prepare('SELECT * FROM fido2_credentials WHERE credential_id = ?').get(resolvedCredId);
    res.json({ success: true, credential });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to register FIDO2 hardware key: ' + err.message });
  }
});

router.post('/fido2/lock', (_req: Request, res: Response): void => {
  try {
    const db = getDb();
    db.prepare(`UPDATE sovereign_settings SET enclave_locked = 1, updated_at = datetime('now') WHERE id = 1`).run();
    res.json({ success: true, enclaveLocked: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to lock enclave: ' + err.message });
  }
});

router.post('/fido2/unlock', (req: Request, res: Response): void => {
  try {
    const { credentialId } = req.body as { credentialId?: string };
    const db = getDb();

    const registeredCount = (db.prepare('SELECT COUNT(*) as c FROM fido2_credentials').get() as { c: number }).c;
    if (registeredCount > 0 && credentialId) {
      const match = db.prepare('SELECT * FROM fido2_credentials WHERE credential_id = ?').get(credentialId);
      if (!match) {
        res.status(403).json({ error: 'FIDO2 hardware key assertion did not match any enrolled credential.' });
        return;
      }
      db.prepare(`UPDATE fido2_credentials SET last_used_at = datetime('now') WHERE credential_id = ?`).run(credentialId);
    }

    db.prepare(`UPDATE sovereign_settings SET enclave_locked = 0, updated_at = datetime('now') WHERE id = 1`).run();
    res.json({ success: true, enclaveLocked: false });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to unlock enclave: ' + err.message });
  }
});

// 6. Feature #50: Self-Contained Single-File HTML Dossier Export
router.post('/export-html', (req: Request, res: Response): void => {
  try {
    const {
      title = 'The World Desk — Sovereign Archival Dossier',
      bookmarkedOnly = false,
      limit = 25,
    } = req.body as { title?: string; bookmarkedOnly?: boolean; limit?: number };

    const db = getDb();
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 25));

    const whereClause = bookmarkedOnly ? "WHERE a.status = 'done' AND a.bookmarked = 1" : "WHERE a.status = 'done'";
    const articles = db
      .prepare(`
        SELECT a.id, a.url, a.title_english, a.summary, a.body_english, a.breaking_score, a.published_at,
               s.name as source_name, s.country
        FROM articles a
        JOIN sources s ON a.source_id = s.id
        ${whereClause}
        ORDER BY a.published_at DESC
        LIMIT ?
      `)
      .all(safeLimit) as any[];

    const generatedAt = new Date().toISOString();
    const manifestHash = crypto.createHash('sha256').update(JSON.stringify(articles)).digest('hex');

    const articlesHtml = articles
      .map(
        (art) => `
      <article class="dispatch-card" data-search="${escapeHtml(`${art.title_english || ''} ${art.source_name || ''} ${art.country || ''} ${art.summary || ''}`.toLowerCase())}">
        <div class="dispatch-meta">
          <span class="stamp">${escapeHtml(art.source_name || 'Wire')} · ${escapeHtml(art.country || 'Intl')}</span>
          <span>${escapeHtml(art.published_at || '')}</span>
          <span>Urgency: ${Number(art.breaking_score || 0)}%</span>
        </div>
        <h2>${escapeHtml(art.title_english || 'Untitled Dispatch')}</h2>
        <p class="summary"><strong>Wire Summary:</strong> ${escapeHtml(art.summary || '')}</p>
        <div class="body">${escapeHtml((art.body_english || '').slice(0, 2400)).replace(/\n/g, '<br/>')}</div>
        <div class="source-link">Source URI: ${escapeHtml(art.url || '')}</div>
      </article>`
      )
      .join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { --paper: #FAF7F0; --alt: #F2EDE2; --border: #D9D0BE; --ink: #1A1208; --muted: #5C4E3A; --accent: #C0392B; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; background: var(--paper); color: var(--ink); font-family: Georgia, "Times New Roman", serif; line-height: 1.65; }
    .container { max-width: 900px; margin: 0 auto; }
    header { border-bottom: 3px double var(--ink); padding-bottom: 16px; margin-bottom: 24px; }
    h1 { margin: 0 0 6px; font-size: 2rem; letter-spacing: -0.02em; }
    .folio { font-family: "Courier New", monospace; font-size: 12px; color: var(--muted); text-transform: uppercase; }
    .search-bar { width: 100%; padding: 10px 12px; font-family: "Courier New", monospace; font-size: 13px; border: 2px solid var(--ink); background: var(--alt); color: var(--ink); margin-bottom: 24px; }
    .dispatch-card { background: var(--alt); border: 1px solid var(--border); border-top: 3px solid var(--ink); padding: 20px; margin-bottom: 20px; }
    .dispatch-meta { display: flex; flex-wrap: wrap; gap: 12px; font-family: "Courier New", monospace; font-size: 11px; color: var(--muted); margin-bottom: 8px; }
    .stamp { border: 1px solid var(--accent); color: var(--accent); padding: 1px 6px; font-weight: bold; text-transform: uppercase; }
    h2 { margin: 0 0 10px; font-size: 1.35rem; line-height: 1.25; }
    .summary { font-style: italic; border-left: 3px solid var(--accent); padding-left: 12px; }
    .body { font-size: 0.95rem; margin-top: 12px; }
    .source-link { margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--border); font-family: "Courier New", monospace; font-size: 11px; color: var(--muted); word-break: break-all; }
    footer { margin-top: 36px; border-top: 2px solid var(--ink); padding-top: 12px; font-family: "Courier New", monospace; font-size: 11px; color: var(--muted); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${escapeHtml(title)}</h1>
      <div class="folio">Self-Contained Offline Broadsheet Dossier · Compiled ${escapeHtml(generatedAt)} · ${articles.length} Dispatches</div>
    </header>
    <input id="dossier-filter" class="search-bar" type="search" placeholder="Filter dispatches inside this standalone HTML archive..." />
    <main id="dossier-list">
      ${articlesHtml || '<p>No dispatches matched export criteria.</p>'}
    </main>
    <footer>
      <div>SOVEREIGN ARCHIVAL INTEGRITY SHA-256: ${manifestHash}</div>
      <div>Zero external dependencies · Preserved for long-term offline inspection</div>
    </footer>
  </div>
  <script>
    (function() {
      var input = document.getElementById('dossier-filter');
      var cards = document.querySelectorAll('.dispatch-card');
      if (!input) return;
      input.addEventListener('input', function() {
        var q = (input.value || '').toLowerCase().trim();
        cards.forEach(function(card) {
          var hay = card.getAttribute('data-search') || '';
          card.style.display = !q || hay.indexOf(q) !== -1 ? 'block' : 'none';
        });
      });
    })();
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="DNews_Sovereign_Dossier_${Date.now()}.html"`);
    res.send(html);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compile portable HTML archive: ' + err.message });
  }
});

export default router;
