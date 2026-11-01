/**
 * backend/src/ai/schema.ts
 * Zod schemas for validating and sanitising AI JSON responses.
 */
import { z } from 'zod';

const SPIDER_TYPES = ['Reader', 'Scout', 'Weaver', 'RedAlert', 'Archive', 'Swarm'] as const;
const CATEGORIES = [
  'World', 'Politics', 'Business', 'Tech', 'Science',
  'Health', 'Sports', 'Entertainment', 'Environment', 'Crime', 'Animals',
] as const;

export const EnrichmentResultSchema = z.object({
  article_index: z.number().int().nonnegative(),
  title_english: z.string().min(1),
  body_english: z.string(),
  summary: z.string().min(1),
  keywords: z
    .array(z.string().min(1))
    .min(1)
    .max(15)
    .transform((kws) => kws.map((k) => k.toLowerCase().trim())),
  categories: z
    .array(z.enum(CATEGORIES))
    .min(1)
    .catch(['World']), // default if AI sends unknown values
  breaking_score: z
    .number()
    .int()
    .transform((n) => Math.min(100, Math.max(0, n))),
  species_tags: z.array(z.string()).default([]),
  location_tags: z.array(z.string()).default([]),
  spider_type: z
    .enum(SPIDER_TYPES)
    .catch('Reader'), // default if AI sends garbage
});

export type EnrichmentResult = z.infer<typeof EnrichmentResultSchema>;

export const EnrichmentBatchSchema = z.array(EnrichmentResultSchema);

/** Parse raw AI text → validated array, partial on failure */
export function parseEnrichmentResponse(
  rawText: string,
  expectedCount: number,
): { results: EnrichmentResult[]; errors: string[] } {
  // Strip markdown fences if the model adds them despite instructions
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { results: [], errors: [`JSON parse failed: ${cleaned.slice(0, 200)}`] };
  }

  if (!Array.isArray(parsed)) {
    return { results: [], errors: ['AI response was not a JSON array'] };
  }

  const results: EnrichmentResult[] = [];
  const errors: string[] = [];

  for (const item of parsed) {
    const result = EnrichmentResultSchema.safeParse(item);
    if (result.success) {
      if (result.data.article_index < expectedCount) {
        results.push(result.data);
      }
    } else {
      errors.push(`Item validation failed: ${result.error.message}`);
    }
  }

  return { results, errors };
}
