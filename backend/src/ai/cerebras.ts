/**
 * backend/src/ai/cerebras.ts  — Cerebras adapter (OpenAI-compatible, fallback 3)
 */
import { FEATURES } from '../../../config/features';
import { SYSTEM_ENRICHMENT } from './prompts';
import { callOpenAICompat } from './openai-compat';

export async function callCerebras(userPrompt: string): Promise<string> {
  if (!FEATURES.provider_cerebras) throw new Error('Cerebras provider disabled');
  const key = process.env['CEREBRAS_API_KEY'];
  if (!key || key === 'your_cerebras_api_key_here') throw new Error('CEREBRAS_API_KEY not configured');
  return callOpenAICompat({
    apiKey: key,
    baseURL: process.env['CEREBRAS_BASE_URL'] ?? 'https://api.cerebras.ai/v1',
    model: process.env['CEREBRAS_MODEL'] ?? 'llama3.1-8b',
    systemPrompt: SYSTEM_ENRICHMENT,
    timeoutMs: parseInt(process.env['AI_TIMEOUT_MS'] ?? '20000', 10),
  }, userPrompt);
}
