/**
 * backend/src/ai/mistral.ts  — Mistral adapter (OpenAI-compatible, fallback 2)
 */
import { FEATURES } from '../../../config/features';
import { SYSTEM_ENRICHMENT } from './prompts';
import { callOpenAICompat } from './openai-compat';

export async function callMistral(userPrompt: string): Promise<string> {
  if (!FEATURES.provider_mistral) throw new Error('Mistral provider disabled');
  const key = process.env['MISTRAL_API_KEY'];
  if (!key || key === 'your_mistral_api_key_here') throw new Error('MISTRAL_API_KEY not configured');
  return callOpenAICompat({
    apiKey: key,
    baseURL: process.env['MISTRAL_BASE_URL'] ?? 'https://api.mistral.ai/v1',
    model: process.env['MISTRAL_MODEL'] ?? 'mistral-small-latest',
    systemPrompt: SYSTEM_ENRICHMENT,
    timeoutMs: parseInt(process.env['AI_TIMEOUT_MS'] ?? '20000', 10),
  }, userPrompt);
}
