/**
 * backend/src/ai/groq.ts  — Groq adapter (OpenAI-compatible, fallback 1)
 */
import { FEATURES } from '../../../config/features';
import { SYSTEM_ENRICHMENT } from './prompts';
import { callOpenAICompat } from './openai-compat';

export async function callGroq(userPrompt: string): Promise<string> {
  if (!FEATURES.provider_groq) throw new Error('Groq provider disabled');
  const key = process.env['GROQ_API_KEY'];
  if (!key || key === 'your_groq_api_key_here') throw new Error('GROQ_API_KEY not configured');
  return callOpenAICompat({
    apiKey: key,
    baseURL: process.env['GROQ_BASE_URL'] ?? 'https://api.groq.com/openai/v1',
    model: process.env['GROQ_MODEL'] ?? 'llama-3.1-8b-instant',
    systemPrompt: SYSTEM_ENRICHMENT,
    timeoutMs: parseInt(process.env['AI_TIMEOUT_MS'] ?? '20000', 10),
  }, userPrompt);
}
