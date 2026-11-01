/**
 * backend/src/ai/prompts.ts
 * All prompt templates in one place. No logic here — only strings.
 */

export const SYSTEM_ENRICHMENT = `You are a multilingual news analyst. You receive a JSON array of raw news articles.
For EACH article you must return a corresponding JSON object with exactly the fields defined below.
Do NOT produce any prose, markdown code fences, or executable code of any kind.
Return ONLY a valid JSON array — nothing before or after it.`;

export function buildEnrichmentPrompt(articles: EnrichmentInput[]): string {
  const count = articles.length;
  return `Analyse the following ${count} news articles and return a JSON array of exactly ${count} objects in the same order.
Each object must have these exact keys (no extras, no omissions):

{
  "article_index": <integer — same as input index>,
  "title_english": <string — translated headline in English>,
  "body_english":  <string — full article translated to English, preserve paragraphs>,
  "summary":       <string — 3-5 sentence neutral summary in English>,
  "keywords":      <string[] — 5 to 10 lowercase keywords, most important first>,
  "categories":    <string[] — one or more from exactly: ["World","Politics","Business","Tech","Science","Health","Sports","Entertainment","Environment","Crime","Animals"]>,
  "breaking_score": <integer 0-100 — urgency and novelty; 100 = unprecedented breaking news>,
  "species_tags":   <string[] — animal or plant species mentioned; empty array if none>,
  "location_tags":  <string[] — countries and cities mentioned>,
  "spider_type":    <string — exactly one of "Reader"|"Scout"|"Weaver"|"RedAlert"|"Archive"|"Swarm"
                    Selection rules (apply in order):
                    1. If breaking_score >= 75 → "RedAlert"
                    2. Else if location_tags has >= 2 different countries → "Weaver"
                    3. Else if categories includes "Animals" and breaking_score < 50 → "Swarm"
                    4. Otherwise → "Reader">
}

Input articles:
${JSON.stringify(articles, null, 2)}`;
}

export interface EnrichmentInput {
  article_index: number;
  title_original: string;
  body_original: string;
  language: string;
  source_country: string;
  source_name: string;
}

// ── Archive chat ──────────────────────────────────────────────────────────────

export const SYSTEM_ARCHIVE_CHAT = `You are a news archive assistant. You have been given a set of news articles
retrieved from a local database using full-text search. Answer the user question
using ONLY information from the provided articles. Do not fabricate facts.
If the answer is not in the articles, say so clearly. Return plain English prose.
No markdown, no JSON, no code.`;

export function buildArchiveChatPrompt(query: string, articles: ArchiveArticle[]): string {
  return `Question: ${query}

Retrieved articles (${articles.length} total):
${JSON.stringify(articles, null, 2)}

Answer the question using only information from the articles above.
Cite article titles where relevant (e.g., "According to [The Hindu, 2026-10-28]...").`;
}

export interface ArchiveArticle {
  id: number;
  title_english: string;
  summary: string;
  source_name: string;
  published_at: string | null;
}

// ── Morning briefing ─────────────────────────────────────────────────────────

export const SYSTEM_BRIEFING = `You are a professional news anchor writing a 2-minute morning radio briefing.
Write in a warm, clear, neutral broadcast style. Plain paragraphs only.
No markdown, no JSON, no code.`;

export function buildBriefingPrompt(date: string, stories: BriefingStory[]): string {
  return `Today is ${date}. Here are the top ${stories.length} stories from around the world, ranked by importance:

${JSON.stringify(stories, null, 2)}

Write a 2-minute morning briefing (approximately 300 words) covering the most important stories.
Group geographically where natural. End with a brief, optimistic closing line.`;
}

export interface BriefingStory {
  title_english: string;
  summary: string;
  country: string;
  breaking_score: number;
}
