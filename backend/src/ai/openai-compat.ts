/**
 * backend/src/ai/openai-compat.ts
 * Shared helper for OpenAI-compatible providers (Groq, Mistral, Cerebras).
 * Uses the openai npm package with a custom baseURL.
 */
import OpenAI from 'openai';

export interface OAIProviderConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  systemPrompt: string;
  timeoutMs: number;
}

/** Creates an OpenAI-compat client and calls chat completions */
export async function callOpenAICompat(
  config: OAIProviderConfig,
  userPrompt: string,
): Promise<string> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: config.timeoutMs,
    maxRetries: 0, // router handles retries
  });

  const completion = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: config.systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1, // low temperature for deterministic JSON
    response_format: { type: 'json_object' }, // request JSON mode where supported
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error('Empty response from provider');
  return text;
}
