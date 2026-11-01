/**
 * backend/src/export/pdf.ts
 * Generates an authentic broadsheet newspaper layout PDF using PDFKit (P10-01).
 */
import PDFDocument from 'pdfkit';
import { getDb } from '../db/db';

interface ArticleRecord {
  id: number;
  title_english: string;
  summary: string;
  breaking_score: number;
  published_at: string | null;
  source_name: string;
  source_country: string;
}

export async function generateNewspaperPdf(targetDate?: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const db = getDb();
      let queryDate = targetDate;
      if (!queryDate) {
        queryDate = new Date().toISOString().slice(0, 10);
      }

      // Query top articles for target date or latest available
      let rows = db
        .prepare(`
          SELECT a.id, a.title_english, a.summary, a.breaking_score, a.published_at,
                 s.name as source_name, s.country as source_country
          FROM articles a
          JOIN sources s ON a.source_id = s.id
          WHERE date(a.published_at) = ? OR date(a.fetched_at) = ?
          ORDER BY a.breaking_score DESC, a.id DESC
          LIMIT 10
        `)
        .all(queryDate, queryDate) as ArticleRecord[];

      // Fallback: If no articles strictly on query date, retrieve latest 10
      if (rows.length === 0) {
        rows = db
          .prepare(`
            SELECT a.id, a.title_english, a.summary, a.breaking_score, a.published_at,
                   s.name as source_name, s.country as source_country
            FROM articles a
            JOIN sources s ON a.source_id = s.id
            ORDER BY a.breaking_score DESC, a.id DESC
            LIMIT 10
          `)
          .all() as ArticleRecord[];
      }

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 36, bottom: 36, left: 36, right: 36 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // ── MASTHEAD ─────────────────────────────────────────────────────────────
      doc
        .font('Times-Bold')
        .fontSize(28)
        .text('THE AI WORLD NEWS DESK', { align: 'center', characterSpacing: 1.5 });

      doc
        .font('Times-Roman')
        .fontSize(8)
        .text('AN AUTONOMOUS SYNTHETIC CHRONICLE OF GLOBAL DISPATCHES & WILDLIFE RADAR', {
          align: 'center',
          characterSpacing: 1,
        });

      doc.moveDown(0.4);

      // Top decorative double rule
      const ruleY1 = doc.y;
      doc.lineWidth(1.5).moveTo(36, ruleY1).lineTo(36 + pageWidth, ruleY1).stroke('#111827');
      doc.lineWidth(0.5).moveTo(36, ruleY1 + 3).lineTo(36 + pageWidth, ruleY1 + 3).stroke('#111827');

      doc.moveDown(0.6);

      // Dateline & Metadata Bar
      const displayDate = new Date(queryDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const metaY = doc.y;
      doc.font('Times-Bold').fontSize(8.5).text(displayDate.toUpperCase(), 36, metaY);
      doc
        .font('Times-Italic')
        .fontSize(8.5)
        .text('INTERNATIONAL TELEGRAPH EDITION', 36, metaY, { align: 'center', width: pageWidth });
      doc
        .font('Times-Bold')
        .fontSize(8.5)
        .text('VOL. CLXXVI No. 42 • GRATIS', 36, metaY, { align: 'right', width: pageWidth });

      doc.moveDown(0.5);

      // Bottom rule
      const ruleY2 = doc.y;
      doc.lineWidth(0.5).moveTo(36, ruleY2).lineTo(36 + pageWidth, ruleY2).stroke('#111827');

      doc.moveDown(0.8);

      // ── LEAD STORY ───────────────────────────────────────────────────────────
      const lead = rows[0];
      if (lead) {
        doc.font('Times-Bold').fontSize(18).text(lead.title_english, { lineGap: 2 });
        doc.moveDown(0.2);

        const byline = `${lead.source_name.toUpperCase()} (${lead.source_country.toUpperCase()}) — IMPACT SCORE: ${lead.breaking_score}%`;
        doc.font('Times-BoldItalic').fontSize(8.5).fillColor('#ef4444').text(byline);
        doc.moveDown(0.3);

        doc
          .font('Times-Roman')
          .fontSize(10)
          .fillColor('#000000')
          .text(lead.summary || 'Summary pending transmission from bureau dispatch.', {
            align: 'justify',
            lineGap: 3,
          });

        doc.moveDown(0.8);
        doc.lineWidth(0.5).moveTo(36, doc.y).lineTo(36 + pageWidth, doc.y).stroke('#94a3b8');
        doc.moveDown(0.8);
      }

      // ── SECONDARY COLUMNS (2-COLUMN GRID) ────────────────────────────────────
      const rest = rows.slice(1);
      const colGap = 16;
      const colWidth = (pageWidth - colGap) / 2;
      const leftColX = 36;
      const rightColX = 36 + colWidth + colGap;

      let leftY = doc.y;
      let rightY = doc.y;

      rest.forEach((art, index) => {
        const isLeft = index % 2 === 0;
        const colX = isLeft ? leftColX : rightColX;
        let currentY = isLeft ? leftY : rightY;

        // Auto new page if running out of vertical room
        if (currentY > doc.page.height - 80) {
          doc.addPage();
          leftY = 36;
          rightY = 36;
          currentY = 36;
        }

        doc.y = currentY;
        doc.x = colX;

        doc
          .font('Times-Bold')
          .fontSize(12)
          .fillColor('#000000')
          .text(art.title_english, colX, currentY, { width: colWidth, lineGap: 1.5 });

        const sub = `${art.source_name} (${art.source_country}) • Breaking: ${art.breaking_score}%`;
        doc
          .font('Times-Italic')
          .fontSize(7.5)
          .fillColor('#475569')
          .text(sub, colX, doc.y + 2, { width: colWidth });

        doc
          .font('Times-Roman')
          .fontSize(9)
          .fillColor('#111827')
          .text(art.summary || 'Detailed coverage filed in central archive.', colX, doc.y + 4, {
            width: colWidth,
            align: 'justify',
            lineGap: 2,
          });

        const newBottomY = doc.y + 12;
        if (isLeft) {
          leftY = newBottomY;
        } else {
          rightY = newBottomY;
        }
      });

      // ── FOOTER ───────────────────────────────────────────────────────────────
      const footerY = doc.page.height - 28;
      doc
        .font('Times-Italic')
        .fontSize(7.5)
        .fillColor('#64748b')
        .text(
          'Printed from AI World News Desk • Powered by SQLite FTS5 Engine • Autonomous Multi-Provider Chain',
          36,
          footerY,
          { align: 'center', width: pageWidth },
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

