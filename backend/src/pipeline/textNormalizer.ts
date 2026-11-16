/**
 * backend/src/pipeline/textNormalizer.ts
 * Automatic Zero-AI Text Normalization & Readability Pipeline (PRD E Category 4).
 * Pure deterministic algorithms for cleaning messy RSS/web scrapings, stripping boilerplate,
 * fixing mojibake and sentence structures, and generating readable lead summaries without AI costs.
 */

export interface NormalizedArticleResult {
  titleEnglish: string;
  bodyEnglishNormalized: string;
  summary: string;
  quality: 'good' | 'poor';
  readabilityScore: number;
  sourceLanguage: string;
}

const HTML_ENTITY_MAP: Record<string, string> = {
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
  '&#160;': ' ',
  '&lsquo;': "'",
  '&rsquo;': "'",
  '&#8216;': "'",
  '&#8217;': "'",
  '&ldquo;': '"',
  '&rdquo;': '"',
  '&#8220;': '"',
  '&#8221;': '"',
  '&ndash;': '–',
  '&mdash;': '—',
  '&#8211;': '–',
  '&#8212;': '—',
  '&hellip;': '…',
  '&#8230;': '…',
  '&trade;': '™',
  '&copy;': '©',
  '&reg;': '®',
  '&eacute;': 'é',
  '&Eacute;': 'É',
  '&egrave;': 'è',
  '&agrave;': 'à',
  '&aacute;': 'á',
  '&iacute;': 'í',
  '&oacute;': 'ó',
  '&uacute;': 'ú',
  '&ntilde;': 'ñ',
  '&uuml;': 'ü',
  '&ouml;': 'ö',
  '&auml;': 'ä',
  '&ccedil;': 'ç',
};

const MOJIBAKE_MAP: Array<[RegExp, string]> = [
  [/â€™/g, "'"],
  [/â€˜/g, "'"],
  [/â€œ/g, '"'],
  [/â€/g, '"'],
  [/â€”/g, '—'],
  [/â€“/g, '–'],
  [/â€¦/g, '…'],
  [/Ã©/g, 'é'],
  [/Ã¨/g, 'è'],
  [/Ã¡/g, 'á'],
  [/Ã /g, 'à'],
  [/Ã­/g, 'í'],
  [/Ã³/g, 'ó'],
  [/Ãº/g, 'ú'],
  [/Ã±/g, 'ñ'],
  [/Ã¼/g, 'ü'],
  [/Ã¶/g, 'ö'],
  [/Ã¤/g, 'ä'],
  [/Â/g, ''],
];

const BOILERPLATE_PATTERNS: RegExp[] = [
  /\b(read\s+(?:more|full\s+story|further)\s+(?:at|on|here)?)\b[\s\S]*$/i,
  /\b(continue\s+reading\s+(?:on|at|here)?)\b[\s\S]*$/i,
  /\b(click\s+here\s+to\s+subscribe|subscribe\s+to\s+our\s+newsletter|sign\s+up\s+for\s+the\s+daily)\b[\s\S]*$/i,
  /\b(all\s+rights\s+reserved|terms\s+(?:and|&)\s+conditions\s+apply)\b[\s\S]*$/i,
  /\b(follow\s+us\s+on\s+(?:twitter|x|facebook|instagram|telegram))\b[\s\S]*$/i,
  /\b(photo\s+credit|image\s+source|image\s+credit):\s*[^\n\.]+/gi,
  /\b(ad(?:vertisement)?\s*:\s*[^\n\.]+)/gi,
  /\bADVERTISEMENT\b/g,
  /\bCopyright\s+©?\s*\d{4}[^\n\.]*/gi,
];

/**
 * Decodes all HTML entities and fixes common UTF-8 mojibake patterns.
 */
export function decodeEntitiesAndMojibake(text: string): string {
  if (!text) return '';

  let out = text;

  // Numeric decimal entities: &#1234;
  out = out.replace(/&#(\d+);/g, (_, dec) => {
    try {
      return String.fromCharCode(parseInt(dec, 10));
    } catch {
      return '';
    }
  });

  // Numeric hex entities: &#x1a2b;
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return '';
    }
  });

  // Named entities
  for (const [entity, replacement] of Object.entries(HTML_ENTITY_MAP)) {
    out = out.replaceAll(entity, replacement);
  }

  // Mojibake patterns
  for (const [regex, replacement] of MOJIBAKE_MAP) {
    out = out.replace(regex, replacement);
  }

  return out;
}

/**
 * Strips journalist datelines, promotional boilerplate, and scraper noise.
 */
export function stripBoilerplate(text: string): string {
  if (!text) return '';

  let out = text;

  // Leading dateline patterns, e.g.:
  // "NEW DELHI (Reuters) —" or "WASHINGTON (AP) -" or "BEIJING, Oct 24 (Xinhua) --"
  out = out.replace(
    /^\s*(?:[A-Z\s]{2,20}\s*)?(?:\([A-Za-z0-9\s,\.]+\)\s*)?(?:[-–—]{1,2}|:)\s*/,
    '',
  );

  // Common boilerplate sections
  for (const pattern of BOILERPLATE_PATTERNS) {
    out = out.replace(pattern, '');
  }

  return out.trim();
}

/**
 * Normalizes sentence boundaries, spacing, punctuation, and capitalization.
 */
export function normalizeSentencesAndPunctuation(text: string): string {
  if (!text) return '';

  let out = text;

  // Normalize line endings
  out = out.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Collapse HTML tags if any slipped through
  out = out.replace(/<[^>]+>/g, ' ');

  // Fix words glued across sentence boundaries, e.g. "economy.The" -> "economy. The" or "Tuesday.investors"
  out = out.replace(/([a-z0-9])\.([a-zA-Z])/g, '$1. $2');

  // Fix space before punctuation, e.g. "hello , world" -> "hello, world"
  out = out.replace(/\s+([,.:;!?])/g, '$1');

  // Fix missing space after punctuation, e.g. "hello,world" -> "hello, world"
  out = out.replace(/([,;:])([A-Za-z0-9])/g, '$1 $2');

  // Collapse multiple consecutive periods (except intentional ellipsis)
  out = out.replace(/\.{4,}/g, '…');
  out = out.replace(/\.{2}/g, '.');

  // Fix duplicate question/exclamation marks
  out = out.replace(/\?{2,}/g, '?');
  out = out.replace(/!{2,}/g, '!');

  // Collapse horizontal spaces
  out = out.replace(/[ \t]+/g, ' ');

  // Capitalize sentence beginnings
  out = out.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());

  // Collapse excessive blank lines
  out = out.replace(/\n{3,}/g, '\n\n');

  return out.trim();
}

/**
 * Normalizes and cleans a news headline, removing trailing outlet branding.
 * E.g. "Global Market Rally Continues | Reuters" -> "Global Market Rally Continues"
 */
export function cleanHeadline(title: string): string {
  if (!title) return 'World News Dispatch';

  let cleaned = decodeEntitiesAndMojibake(title).trim();

  // Strip trailing branding delimiters: " - BBC News", " | Reuters", " -- The Hindu"
  cleaned = cleaned.replace(/\s*(?:[-–—|:]\s*|\s+[-–—|]\s+)[A-Za-z0-9\s.]{2,30}$/, '');

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Remove trailing period if present in headline
  cleaned = cleaned.replace(/\.\s*$/, '');

  return cleaned.trim() || 'World News Dispatch';
}

/**
 * Extracts a coherent 2-3 sentence lead summary without calling AI.
 */
export function extractLeadSummary(cleanBody: string, maxSentences: number = 3): string {
  if (!cleanBody) return '';

  // Match sentences ending in ., !, or ?
  const rawSentences = cleanBody.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [];
  const validSentences: string[] = [];

  for (const s of rawSentences) {
    const trimmed = s.trim();
    // Filter out very short fragments (< 5 words)
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length >= 5) {
      validSentences.push(trimmed);
      if (validSentences.length >= maxSentences) break;
    }
  }

  if (validSentences.length === 0) {
    // If no sentence delimiters found, use the first 250 characters ending gracefully
    const words = cleanBody.split(/\s+/).slice(0, 40);
    return words.join(' ') + (words.length >= 40 ? '…' : '.');
  }

  return validSentences.join(' ').trim();
}

function estimateSyllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  w = w.replace(/^y/, '');
  const matches = w.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

/**
 * Computes deterministic readability metrics and determines quality tier.
 */
export function computeReadability(text: string): {
  score: number;
  quality: 'good' | 'poor';
  wordCount: number;
  sentenceCount: number;
} {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const sentences = (text || '').match(/[^.!?]+[.!?]+(?:\s|$)/g) || [];
  const sentenceCount = Math.max(1, sentences.length);

  if (wordCount < 15) {
    return { score: 10, quality: 'poor', wordCount, sentenceCount };
  }

  // Flesch Reading Ease calculation
  const wordsPerSentence = wordCount / sentenceCount;
  let totalSyllables = 0;
  for (const w of words) {
    totalSyllables += estimateSyllables(w);
  }
  const syllablesPerWord = totalSyllables / wordCount;

  // Standard Flesch Reading Ease equation: 206.835 - (1.015 * ASL) - (84.6 * ASW)
  const rawScore = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
  const score = Math.max(1, Math.min(100, Math.round(rawScore)));

  const quality: 'good' | 'poor' = wordCount >= 20 ? 'good' : 'poor';

  return {
    score,
    quality,
    wordCount,
    sentenceCount,
  };
}

/**
 * Complete automatic normalization pipeline for an article.
 * Runs locally, in-process, with 0 AI API dependencies.
 */
export function normalizeArticleText(rawTitle: string, rawBody: string): NormalizedArticleResult {
  // Step 1: Clean headline
  const titleEnglish = cleanHeadline(rawTitle);

  // Step 2: Decode HTML entities & mojibake on body
  let body = decodeEntitiesAndMojibake(rawBody || rawTitle || '');

  // Step 3: Strip promotional boilerplate and datelines
  body = stripBoilerplate(body);

  // Step 4: Normalize sentence boundaries and punctuation
  const bodyEnglishNormalized = normalizeSentencesAndPunctuation(body);

  // Step 5: Extract clean lead summary
  const summary = extractLeadSummary(bodyEnglishNormalized, 2);

  // Step 6: Compute readability score and quality classification
  const { score: readabilityScore, quality } = computeReadability(bodyEnglishNormalized);

  return {
    titleEnglish,
    bodyEnglishNormalized,
    summary,
    quality,
    readabilityScore,
    sourceLanguage: 'en',
  };
}
