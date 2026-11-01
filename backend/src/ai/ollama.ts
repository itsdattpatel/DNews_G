/**
 * backend/src/ai/ollama.ts — Ollama adapter (OpenAI-compatible, local fallback)
 * Gated by FEATURES.ollama (disabled by default / when no local GPU).
 */
import { FEATURES } from '../../../config/features';
import { SYSTEM_ENRICHMENT } from './prompts';
import { callOpenAICompat } from './openai-compat';

export async function callOllama(userPrompt: string): Promise<string> {
  if (!FEATURES.ollama) throw new Error('Ollama provider disabled');
  return callOpenAICompat(
    {
      apiKey: 'ollama',
      baseURL: process.env['OLLAMA_BASE_URL'] ?? 'http://127.0.0.1:11434/v1',
      model: process.env['OLLAMA_MODEL'] ?? 'llama3',
      systemPrompt: SYSTEM_ENRICHMENT,
      timeoutMs: parseInt(process.env['AI_TIMEOUT_MS'] ?? '20000', 10),
    },
    userPrompt,
  );
}
