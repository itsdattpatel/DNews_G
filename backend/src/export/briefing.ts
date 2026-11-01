/**
 * backend/src/export/briefing.ts
 * Generates an executive 2-minute morning radio briefing text (P10-04).
 */
import { getDb } from '../db/db';
import { routeAIRequest } from '../ai/router';

interface ArticleBriefingRow {
  id: number;
  title_english: string;
  summary: string;
  breaking_score: number;
  source_name: string;
  source_country: string;
}

export async function generateMorningBriefing(): Promise<string> {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT a.id, a.title_english, a.summary, a.breaking_score,
             s.name as source_name, s.country as source_country
      FROM articles a
      JOIN sources s ON a.source_id = s.id
      ORDER BY a.breaking_score DESC, a.id DESC
      LIMIT 8
    `)
    .all() as ArticleBriefingRow[];

  if (rows.length === 0) {
    return 'Good morning. This is your AI World News Desk radar briefing. Monitored wire bureaus currently report calm frequencies with no critical anomalies. Stay tuned as our autonomous spiders continue tracking global dispatches throughout the day.';
  }

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Prepare structured stories text
  const storiesSummary = rows
    .map(
      (r, i) =>
        `${i + 1}. [${r.source_country} - ${r.source_name}] "${r.title_english}" (Breaking Score: ${r.breaking_score}%): ${r.summary || 'Summary pending.'}`,
    )
    .join('\n');

  const prompt = `You are a professional news anchor writing a 2-minute morning radio briefing.
Today is ${todayStr}. Here are the top ${rows.length} stories from around the world, ranked by breaking score:

${storiesSummary}

Write a 2-minute morning briefing (approximately 250 to 300 words) covering the most important stories.
Write in a warm, clear, neutral broadcast style. No markdown. Plain paragraphs. Group geographically where natural. End with a brief, optimistic closing line.`;

  try {
    const aiRes = await routeAIRequest(prompt);
    if (aiRes && aiRes.text && aiRes.text.trim().length > 50) {
      return aiRes.text.trim();
    }
  } catch (err) {
    console.warn('[Briefing] AI synthesis failed, generating editorial fallback:', err);
  }

  // Coherent editorial broadcast fallback
  const lead = rows[0]!;
  const secondary = rows.slice(1, 4);

  let fallback = `Good morning. It is ${todayStr}, and here is your autonomous morning briefing from the AI World News Desk.\n\n`;
  fallback += `Leading our global coverage today: in ${lead.source_country}, ${lead.source_name} reports that ${lead.title_english}. ${lead.summary}\n\n`;

  if (secondary.length > 0) {
    fallback += `Turning to other major developments across the wire: `;
    const highlights = secondary.map(
      (s) => `in ${s.source_country}, ${s.title_english.toLowerCase().replace(/\.$/, '')}`,
    );
    fallback += highlights.join('; while ') + '.\n\n';
  }

  fallback += `Our automated spiders remain on patrol across international bureaus. That concludes your morning briefing. Have a productive and safe day ahead.`;

  return fallback;
}

