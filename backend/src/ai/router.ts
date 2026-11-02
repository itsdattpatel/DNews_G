/**
 * backend/src/ai/router.ts
 * Provider fallback chain. Tries each provider in order.
 * Emits provider_switch SSE events when switching.
 * Records quota. Detects retriable vs fatal errors.
 */
import { PROVIDER_CHAIN, type ProviderName } from '../../../config/ai-providers';
import { callGemini } from './gemini';
import { callGroq } from './groq';
import { callMistral } from './mistral';
import { callCerebras } from './cerebras';
import { recordCall } from './quota';
import { emitSseEvent } from '../routes/sse';

export interface RouterResult {
  text: string;
  provider: ProviderName;
}

let _currentProvider: ProviderName = 'gemini';
let _throttledUntil: Partial<Record<ProviderName, number>> = {};

/** Main entry point — call with any prompt, get back the AI response text */
export async function routeAIRequest(prompt: string): Promise<RouterResult> {
  const enabledChain = PROVIDER_CHAIN.filter((p) => p.enabled);

  for (const providerConfig of enabledChain) {
    const { name, timeoutMs } = providerConfig;

    // Skip if throttled
    const throttledUntil = _throttledUntil[name] ?? 0;
    if (Date.now() < throttledUntil) {
      console.log(`[Router] Skipping ${name} (throttled for ${Math.ceil((throttledUntil - Date.now()) / 1000)}s)`);
      continue;
    }

    try {
      const text = await callProvider(name, prompt, timeoutMs);
      recordCall(name, getModelName(name), estimateTokens(prompt), estimateTokens(text), true);

      if (_currentProvider !== name) {
        const prev = _currentProvider;
        _currentProvider = name;
        emitSseEvent('provider_switch', { from: prev, to: name, reason: 'recovered' });
      }
      return { text, provider: name };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      recordCall(name, getModelName(name), estimateTokens(prompt), 0, false);
      console.warn(`[Router] ${name} failed: ${msg}`);

      if (isRateLimit(msg)) {
        // Throttle for 60 s before trying again
        _throttledUntil[name] = Date.now() + 60_000;
        const prev = _currentProvider;
        emitSseEvent('provider_switch', { from: prev, to: 'next', reason: 'rate_limit' });
        console.log(`[Router] ${name} rate-limited — switching provider`);
      }
    }
  }

  throw new Error('All AI providers exhausted or disabled');
}

function callProvider(name: ProviderName, prompt: string, _timeoutMs: number): Promise<string> {
  switch (name) {
    case 'gemini':   return callGemini(prompt);
    case 'groq':     return callGroq(prompt);
    case 'mistral':  return callMistral(prompt);
    case 'cerebras': return callCerebras(prompt);
    default:         throw new Error(`Unknown provider: ${name as string}`);
  }
}

function isRateLimit(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes('429') || m.includes('rate limit') || m.includes('too many requests');
}

export function getModelName(name: ProviderName): string {
  switch (name) {
    case 'gemini':   return process.env['GEMINI_MODEL'] ?? 'gemini-2.5-flash';
    case 'groq':     return process.env['GROQ_MODEL'] ?? 'llama-3.1-8b-instant';
    case 'mistral':  return process.env['MISTRAL_MODEL'] ?? 'mistral-small-latest';
    case 'cerebras': return process.env['CEREBRAS_MODEL'] ?? 'llama3.1-8b';
  }
}

/** Very rough token estimator: ~4 chars per token */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function getCurrentProvider(): ProviderName {
  return _currentProvider;
}

export function getThrottledStatus(): Record<string, { throttled: boolean; remainingSec: number }> {
  const result: Record<string, { throttled: boolean; remainingSec: number }> = {};
  const now = Date.now();
  for (const p of ['gemini', 'groq', 'mistral', 'cerebras'] as ProviderName[]) {
    const until = _throttledUntil[p] ?? 0;
    const remainingSec = Math.max(0, Math.ceil((until - now) / 1000));
    result[p] = { throttled: remainingSec > 0, remainingSec };
  }
  return result;
}

export function resetThrottledStatus(provider?: ProviderName): void {
  if (provider) {
    delete _throttledUntil[provider];
  } else {
    _throttledUntil = {};
  }
}
