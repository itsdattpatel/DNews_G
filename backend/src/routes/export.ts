/**
 * backend/src/routes/export.ts
 * REST endpoints for PDF broadsheet export and morning radio briefing (P10-02, P10-05).
 */
import { Router, type Request, type Response } from 'express';
import { generateNewspaperPdf } from '../export/pdf';
import { generateMorningBriefing } from '../export/briefing';

export const exportRouter = Router();

// POST /api/export/pdf
exportRouter.post('/pdf', async (req: Request, res: Response) => {
  try {
    const { date } = req.body || {};
    const pdfBuffer = await generateNewspaperPdf(date);

    const safeDate = date || new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="AI_World_News_Desk_${safeDate}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (err) {
    console.error('[Export:PDF] Generation failed:', err);
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

// GET /api/export/briefing
exportRouter.get('/briefing', async (_req: Request, res: Response) => {
  try {
    const briefingText = await generateMorningBriefing();
    res.json({
      text: briefingText,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Export:Briefing] Generation failed:', err);
    res.status(500).json({ error: String(err), code: 'INTERNAL_ERROR' });
  }
});

