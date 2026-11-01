/**
 * backend/src/ai/gemini.ts
 * Gemini adapter using the official @google/generative-ai SDK.
 * Primary provider.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FEATURES } from '../../../config/features';
import { SYSTEM_ENRICHMENT } from './prompts';

let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (_client) return _client;
  const key = process.env['GEMINI_API_KEY'];
  if (!key) throw new Error('GEMINI_API_KEY is not set in .env');
  _client = new GoogleGenerativeAI(key);
  return _client;
}

export async function callGemini(userPrompt: string): Promise<string> {
  if (!FEATURES.provider_gemini) throw new Error('Gemini provider disabled');

  const primaryModel = process.env['GEMINI_MODEL'] ?? 'gemini-2.5-flash';
  const fallbackModel = process.env['GEMINI_FALLBACK_MODEL'] ?? 'gemini-1.5-pro';
  const timeoutMs = parseInt(process.env['AI_TIMEOUT_MS'] ?? '20000', 10);

  const client = getClient();

  for (const modelName of [primaryModel, fallbackModel]) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_ENRICHMENT,
      });

      const result = await Promise.race([
        model.generateContent(userPrompt),
        timeout(timeoutMs),
      ]) as Awaited<ReturnType<typeof model.generateContent>>;

      const text = result.response.text();
      if (!text) throw new Error('Empty response from Gemini');
      return text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // If model not found, try fallback model
      if (msg.includes('not found') || msg.includes('404')) {
        console.warn(`[Gemini] Model ${modelName} not available, trying fallback`);
        continue;
      }
      throw err; // rethrow 429 / network / other errors so router handles them
    }
  }

  throw new Error('All Gemini models unavailable');
}

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms),
  );
}
