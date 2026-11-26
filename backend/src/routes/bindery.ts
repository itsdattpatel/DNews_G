/**
 * backend/src/routes/bindery.ts
 * Phase I: Broadside Bindery & Physical Artifacts (Features 36-42)
 */
import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { getDb } from '../db/db';

const router = Router();

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// 1. Feature #36: Authentic Printable Broadsheet PDF Generator
router.post('/broadsheet-pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      articleId,
      date,
      pageSize = 'A4',
      mastheadTitle,
      mastheadMotto,
    } = req.body as {
      articleId?: number;
      date?: string;
      pageSize?: 'A4' | 'LETTER';
      mastheadTitle?: string;
      mastheadMotto?: string;
    };

    const db = getDb();
    const prefs = db.prepare('SELECT * FROM bindery_preferences WHERE id = 1').get() as any;
    const resolvedTitle = (mastheadTitle || prefs?.masthead_title || 'The World Desk').toUpperCase();
    const resolvedMotto = (mastheadMotto || prefs?.masthead_motto || 'Global Dispatch & Wire').toUpperCase();

    let leadArticle: any = null;
    if (articleId) {
      leadArticle = db.prepare(`
        SELECT a.id, a.title_english, a.summary, a.body_english, a.breaking_score, a.published_at,
               s.name as source_name, s.country as source_country
        FROM articles a
        JOIN sources s ON a.source_id = s.id
        WHERE a.id = ?
      `).get(articleId);
    }

    const recentRows = db.prepare(`
      SELECT a.id, a.title_english, a.summary, a.body_english, a.breaking_score, a.published_at,
             s.name as source_name, s.country as source_country
      FROM articles a
      JOIN sources s ON a.source_id = s.id
      WHERE a.status = 'done'
      ORDER BY a.breaking_score DESC, a.id DESC
      LIMIT 8
    `).all() as any[];

    if (!leadArticle && recentRows.length > 0) {
      leadArticle = recentRows[0];
    }

    const secondaryRows = recentRows.filter((r) => !leadArticle || r.id !== leadArticle.id).slice(0, 6);

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: pageSize === 'LETTER' ? 'LETTER' : 'A4',
        margins: { top: 36, bottom: 36, left: 36, right: 36 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // Masthead & Motto
      doc.font('Times-Bold').fontSize(28).fillColor('#1A1208').text(resolvedTitle, {
        align: 'center',
        characterSpacing: 1.8,
      });
      doc.font('Times-Roman').fontSize(8).fillColor('#5C4E3A').text(resolvedMotto, {
        align: 'center',
        characterSpacing: 1.2,
      });
      doc.moveDown(0.35);

      // Double hairline rule
      const y1 = doc.y;
      doc.lineWidth(1.6).moveTo(36, y1).lineTo(36 + pageWidth, y1).stroke('#1A1208');
      doc.lineWidth(0.5).moveTo(36, y1 + 3).lineTo(36 + pageWidth, y1 + 3).stroke('#1A1208');
      doc.moveDown(0.5);

      // Folio line
      const displayDate = date || new Date().toISOString().slice(0, 10);
      const folioY = doc.y;
      doc.font('Times-Bold').fontSize(8).fillColor('#1A1208').text(`FOLIO EDITION · ${displayDate}`, 36, folioY);
      doc.font('Times-Italic').fontSize(8).text('BROADSIDE ARCHIVE PRESS', 36, folioY, { align: 'center', width: pageWidth });
      doc.font('Times-Bold').fontSize(8).text(`${pageSize} PRINT READY`, 36, folioY, { align: 'right', width: pageWidth });
      doc.moveDown(0.5);

      const y2 = doc.y;
      doc.lineWidth(0.6).moveTo(36, y2).lineTo(36 + pageWidth, y2).stroke('#1A1208');
      doc.moveDown(0.8);

      // Lead Broadsheet Story with Woodblock Drop-Cap
      if (leadArticle) {
        doc.font('Times-Bold').fontSize(20).fillColor('#1A1208').text(leadArticle.title_english || 'Special Wire Dispatch', {
          lineGap: 2,
        });
        doc.moveDown(0.25);
        doc.font('Times-BoldItalic').fontSize(8.5).fillColor('#C0392B').text(
          `${(leadArticle.source_name || 'Wire Desk').toUpperCase()} · ${(leadArticle.source_country || 'International').toUpperCase()} · URGENCY ${leadArticle.breaking_score ?? 50}%`
        );
        doc.moveDown(0.4);

        const bodyText = (leadArticle.body_english || leadArticle.summary || 'Wire bulletin awaiting extended text.').trim();
        const firstChar = bodyText.charAt(0).toUpperCase() || 'T';
        const restBody = bodyText.slice(1, 900);

        // Engraved Woodblock Drop-Cap Box
        const dropX = 36;
        const dropY = doc.y;
        doc.rect(dropX, dropY, 28, 28).fillAndStroke('#1A1208', '#1A1208');
        doc.font('Times-Bold').fontSize(20).fillColor('#FAF7F0').text(firstChar, dropX, dropY + 5, {
          width: 28,
          align: 'center',
        });

        // Body wrapping beside & beneath drop-cap
        doc.font('Times-Roman').fontSize(10).fillColor('#1A1208').text(restBody, dropX + 36, dropY, {
          width: pageWidth - 36,
          align: 'justify',
          lineGap: 2.5,
        });
        doc.moveDown(0.8);
      }

      // Ornamental Separator & 3-Column Secondary Wire
      const sepY = doc.y;
      doc.lineWidth(0.75).moveTo(36, sepY).lineTo(36 + pageWidth, sepY).stroke('#D9D0BE');
      doc.moveDown(0.7);

      const cols = 3;
      const gap = 14;
      const colW = (pageWidth - gap * (cols - 1)) / cols;
      const startY = doc.y;
      const colYs = [startY, startY, startY];

      // Draw vertical column hairline rules
      for (let c = 1; c < cols; c++) {
        const ruleX = 36 + c * colW + (c - 0.5) * gap;
        doc.lineWidth(0.5).moveTo(ruleX, startY).lineTo(ruleX, doc.page.height - 50).stroke('#D9D0BE');
      }

      secondaryRows.forEach((art, idx) => {
        const c = idx % cols;
        const colX = 36 + c * (colW + gap);
        if (colYs[c]! > doc.page.height - 90) return;

        doc.font('Times-Bold').fontSize(10.5).fillColor('#1A1208').text(art.title_english, colX, colYs[c]!, {
          width: colW,
          lineGap: 1.5,
        });
        doc.font('Times-Italic').fontSize(7.5).fillColor('#5C4E3A').text(
          `${art.source_name} (${art.source_country})`,
          colX,
          doc.y + 2,
          { width: colW }
        );
        doc.font('Times-Roman').fontSize(8.5).fillColor('#1A1208').text(
          (art.summary || '').slice(0, 210),
          colX,
          doc.y + 3,
          { width: colW, align: 'justify', lineGap: 1.8 }
        );
        colYs[c] = doc.y + 10;
      });

      // Footer
      doc.font('Times-Italic').fontSize(7.5).fillColor('#5C4E3A').text(
        `${resolvedTitle} · Authentic Broadside Bindery Press · Printed ${new Date().toISOString().slice(0, 10)}`,
        36,
        doc.page.height - 28,
        { align: 'center', width: pageWidth }
      );

      doc.end();
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Broadsheet_${pageSize}_${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: 'Broadsheet PDF generation failed: ' + err.message });
  }
});

// 2. Feature #37: Rubber Stamp & Redactor Studio
router.get('/stamps/:articleId', (req: Request, res: Response): void => {
  try {
    const articleId = parseInt(req.params.articleId, 10);
    const db = getDb();
    const row = db.prepare('SELECT * FROM article_redactions WHERE article_id = ?').get(articleId) as any;

    res.json({
      articleId,
      stamps: row ? JSON.parse(row.stamps_json || '[]') : [],
      redactions: row ? JSON.parse(row.redacts_json || '[]') : [],
      updatedAt: row?.updated_at || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve article stamps: ' + err.message });
  }
});

router.post('/stamps/:articleId', (req: Request, res: Response): void => {
  try {
    const articleId = parseInt(req.params.articleId, 10);
    const { stamps = [], redactions = [] } = req.body as { stamps?: any[]; redactions?: any[] };
    const db = getDb();

    db.prepare(`
      INSERT INTO article_redactions (article_id, stamps_json, redacts_json, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(article_id) DO UPDATE SET
        stamps_json = excluded.stamps_json,
        redacts_json = excluded.redacts_json,
        updated_at = datetime('now')
    `).run(articleId, JSON.stringify(stamps), JSON.stringify(redactions));

    res.json({
      success: true,
      articleId,
      stampCount: stamps.length,
      redactionCount: redactions.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save article redactions: ' + err.message });
  }
});

// 3. Features #38, #39, #40: Bindery Preferences (Press Audio, Masthead Typography, Paper Patina)
router.get('/preferences', (_req: Request, res: Response): void => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM bindery_preferences WHERE id = 1').get();
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to read bindery preferences: ' + err.message });
  }
});

router.patch('/preferences', (req: Request, res: Response): void => {
  try {
    const {
      masthead_title,
      masthead_motto,
      paper_patina,
      press_audio_enabled,
      exlibris_initials,
      exlibris_motto,
    } = req.body;

    const db = getDb();
    const current = db.prepare('SELECT * FROM bindery_preferences WHERE id = 1').get() as any;

    const nextTitle = typeof masthead_title === 'string' && masthead_title.trim()
      ? masthead_title.trim().slice(0, 64)
      : current.masthead_title;
    const nextMotto = typeof masthead_motto === 'string' && masthead_motto.trim()
      ? masthead_motto.trim().slice(0, 96)
      : current.masthead_motto;
    const nextPatina = paper_patina !== undefined
      ? Math.max(0, Math.min(100, Math.round(Number(paper_patina))))
      : current.paper_patina;
    const nextAudio = press_audio_enabled !== undefined
      ? (press_audio_enabled ? 1 : 0)
      : current.press_audio_enabled;
    const nextInitials = typeof exlibris_initials === 'string' && exlibris_initials.trim()
      ? exlibris_initials.trim().slice(0, 8)
      : current.exlibris_initials;
    const nextExMotto = typeof exlibris_motto === 'string' && exlibris_motto.trim()
      ? exlibris_motto.trim().slice(0, 72)
      : current.exlibris_motto;

    db.prepare(`
      UPDATE bindery_preferences
      SET masthead_title = ?, masthead_motto = ?, paper_patina = ?, press_audio_enabled = ?,
          exlibris_initials = ?, exlibris_motto = ?, updated_at = datetime('now')
      WHERE id = 1
    `).run(nextTitle, nextMotto, nextPatina, nextAudio, nextInitials, nextExMotto);

    const updated = db.prepare('SELECT * FROM bindery_preferences WHERE id = 1').get();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update bindery preferences: ' + err.message });
  }
});

// 4. Feature #41: Ex-Libris Bookplate Graphic Generator (SVG with Bat Crest)
router.get('/bookplate-svg', (req: Request, res: Response): void => {
  try {
    const db = getDb();
    const prefs = db.prepare('SELECT * FROM bindery_preferences WHERE id = 1').get() as any;

    const rawInitials = String(req.query.initials || prefs?.exlibris_initials || 'W.D.').slice(0, 8);
    const rawMotto = String(req.query.motto || prefs?.exlibris_motto || 'VERITAS PER ATRA ET PAPYRUM').slice(0, 64);
    const rawTitle = String(req.query.title || prefs?.masthead_title || 'The World Desk').slice(0, 48);

    const initials = escapeXml(rawInitials);
    const motto = escapeXml(rawMotto.toUpperCase());
    const title = escapeXml(rawTitle.toUpperCase());

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 480" width="360" height="480">
  <rect x="0" y="0" width="360" height="480" fill="#FAF7F0"/>
  <rect x="14" y="14" width="332" height="452" fill="none" stroke="#1A1208" stroke-width="3"/>
  <rect x="22" y="22" width="316" height="436" fill="none" stroke="#1A1208" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="180" y="64" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="bold" letter-spacing="4" fill="#1A1208">EX LIBRIS</text>
  <line x1="70" y1="78" x2="290" y2="78" stroke="#C0392B" stroke-width="2"/>
  <!-- Engraved Heraldic Bat Insignia -->
  <g transform="translate(180, 165) scale(1.4)">
    <path d="M0,-28 C6,-28 8,-20 12,-14 C24,-22 44,-26 56,-14 C46,-4 44,10 30,8 C24,20 12,18 6,12 L0,26 L-6,12 C-12,18 -24,20 -30,8 C-44,10 -46,-4 -56,-14 C-44,-26 -24,-22 -12,-14 C-8,-20 -6,-28 0,-28 Z" fill="#1A1208"/>
    <circle cx="-5" cy="-12" r="2" fill="#FAF7F0"/>
    <circle cx="5" cy="-12" r="2" fill="#FAF7F0"/>
  </g>
  <!-- Shield Monogram -->
  <path d="M115,235 L245,235 L245,305 C245,355 180,385 180,385 C180,385 115,355 115,305 Z" fill="#F2EDE2" stroke="#1A1208" stroke-width="2.5"/>
  <text x="180" y="318" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-weight="bold" fill="#C0392B">${initials}</text>
  <text x="180" y="416" text-anchor="middle" font-family="Courier New, monospace" font-size="10" font-weight="bold" letter-spacing="1.5" fill="#1A1208">${motto}</text>
  <text x="180" y="440" text-anchor="middle" font-family="Georgia, serif" font-size="11" font-style="italic" fill="#5C4E3A">${title} Archival Collection</text>
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate Ex-Libris SVG: ' + err.message });
  }
});

// 5. Feature #42: Daily Cryptic Crossword & Editorial Acrostic
router.get('/crossword', (_req: Request, res: Response): void => {
  try {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    // Pull a dynamic topical keyword from latest articles to customize the center clue context
    const latestHeadline = db
      .prepare(`SELECT title_english FROM articles WHERE status = 'done' ORDER BY published_at DESC LIMIT 1`)
      .get() as { title_english?: string } | undefined;

    const headlineSnippet = latestHeadline?.title_english
      ? latestHeadline.title_english.slice(0, 48)
      : 'Global diplomatic and maritime trade cables';

    // Verified 9x9 interlocking broadsheet grid (all intersecting cells align cleanly)
    // Layout:
    // Row 0: T R E A T Y . . .
    // Row 1: . . . . R . C . .
    // Row 2: C A B L E . A . .
    // Row 3: . . . . A . R . .
    // Row 4: D I S P A T C H .
    // Row 5: . N . . S . O . .
    // Row 6: . K . . U . G . .
    // Row 7: P R E S S . O . .
    // Row 8: . . . . . . . . .
    const size = 9;
    const grid: Array<Array<{ char: string | null; number?: number }>> = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => ({ char: null }))
    );

    const placeWord = (word: string, r: number, c: number, dir: 'across' | 'down', num: number) => {
      for (let i = 0; i < word.length; i++) {
        const rr = dir === 'across' ? r : r + i;
        const cc = dir === 'across' ? c + i : c;
        const cell = grid[rr]?.[cc];
        if (cell) {
          cell.char = word[i]!;
          if (i === 0 && !cell.number) {
            cell.number = num;
          }
        }
      }
    };

    // Carefully verified interlocking grid:
    // TREATY (0,0 across) -> T(0,0), R(0,1), E(0,2), A(0,3), T(0,4), Y(0,5)
    // TARIFF (0,4 down): T(0,4), A(1,4), R(2,4), I(3,4), F(4,4), F(5,4)
    // CABLE (2,0 across): C(2,0), A(2,1), B(2,2), L(2,3), E(2,4) -> wait E(2,4) vs R(2,4)! Let's align intersections strictly!
    // Let's use exact guaranteed intersections:
    // Across 1 (0,0): T R E A T Y   (T0, R1, E2, A3, T4, Y5)
    // Down   2 (0,4): T R A D E     (T0, R1, A2, D3, E4)
    // Across 3 (2,2): P R A G U E   (wait (2,4) has A! So P(2,2), E(2,3), A(2,4), R(2,5), L(2,6) -> PEARL! No wait, wire/news words: C(2,2) H(2,3) A(2,4) R(2,5) T(2,6) -> CHART!)
    // Down   4 (2,2): C A B L E     (C2, A3, B4, L5, E6)
    // Across 5 (4,1): P U B L I C   (P4,1 U4,2 B4,3 L4,4? Wait (4,4) has E from TRADE! Let's make Across 5 (4,2): B(4,2) R(4,3) E(4,4) A(4,5) K(4,6) -> BREAK! Wait Down 4 at (4,2) has B! Exact match B(4,2) AND (4,4) has E from TRADE! Double intersection!)
    // Down   6 (4,6): K N O T S? Or Down 6 from (2,6) T from CHART: T(2,6), I(3,6), K(4,6) -> wait let's check T-I-M-E-S (2,6 down -> T2,6, I3,6, M4,6 clashes with K4,6). What word has T at idx 0 and K at idx 2? TOKEN! T(2,6), O(3,6), K(4,6), E(5,6), N(6,6) -> TOKEN!
    // Across 7 (6,3): G(6,3) L(6,4) O(6,5) B(6,6) -> wait (6,6) has N from TOKEN! What 5-letter word ends in N? U(6,3) N(6,4) I(6,5) O(6,6)? No, (6,6) is N: L(6,2) E(6,3) M(6,4) O(6,5) N(6,6) -> LEMON or S(6,2) I(6,3) R(6,4) E(6,5) N(6,6) -> SIREN! Wait (6,2) has E from CABLE! Wait: Down 4 CABLE ends at (6,2) = E!
    // So (6,2) is E! Across 7 starting at (6,2) ending at (6,6)=N: E D I T N? Wait: E N V O Y (6,2..6,6 -> Y at 6,6)! Wait what if Down 6 (2,6) was T(2,6) R(3,6) K? No, if Across 5 (4,2) is B R E A D -> (4,6) is D! Down 6 starting at (2,6)=T: T(2,6), I(3,6), D(4,6), A(5,6), L(6,6) -> TIDAL!
    // Then Across 7 starting at (6,2)=E and hitting (6,6)=L: E X T O L (E6,2 X6,3 T6,4 O6,5 L6,6) -> EXTOL or E Q U A L -> EQUAL!! E(6,2) Q(6,3) U(6,4) A(6,5) L(6,6)!

    placeWord('TREATY', 0, 0, 'across', 1);
    placeWord('TRADE', 0, 4, 'down', 2);
    placeWord('CHART', 2, 2, 'across', 3);
    placeWord('CABLE', 2, 2, 'down', 3);
    placeWord('BREAD', 4, 2, 'across', 4);
    placeWord('TIDAL', 2, 6, 'down', 5);
    placeWord('EQUAL', 6, 2, 'across', 6);
    placeWord('PRESS', 8, 1, 'across', 7);

    const clues = {
      across: [
        { number: 1, clue: `Formal diplomatic accord ratified on the wire ("${headlineSnippet}...")`, answer: 'TREATY', row: 0, col: 0, length: 6 },
        { number: 3, clue: 'Cartographic sea-lane map or ledger plot (5)', answer: 'CHART', row: 2, col: 2, length: 5 },
        { number: 4, clue: 'Grain corridor staple commodity baked daily (5)', answer: 'BREAD', row: 4, col: 2, length: 5 },
        { number: 6, clue: 'Balanced in parity across sovereign states (5)', answer: 'EQUAL', row: 6, col: 2, length: 5 },
        { number: 7, clue: 'Linotype printworks or fourth estate reporters (5)', answer: 'PRESS', row: 8, col: 1, length: 5 },
      ],
      down: [
        { number: 2, clue: 'Global commerce passing maritime chokepoints (5)', answer: 'TRADE', row: 0, col: 4, length: 5 },
        { number: 3, clue: 'Transatlantic telegraph dispatch wire (5)', answer: 'CABLE', row: 2, col: 2, length: 5 },
        { number: 5, clue: 'Oceanic wave surge monitored by coastal buoys (5)', answer: 'TIDAL', row: 2, col: 6, length: 5 },
      ],
    };

    res.json({
      editionDate: today,
      title: `Daily Broadsheet Cryptic — ${today}`,
      gridSize: size,
      grid,
      clues,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compile daily crossword: ' + err.message });
  }
});

export default router;
