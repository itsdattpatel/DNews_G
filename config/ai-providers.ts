/**
 * config/ai-providers.ts
 * Fallback chain configuration. Order determines priority.
 * Base URLs and model names are read from .env so changing a provider
 * requires no code edits — only .env changes.
 */

export interface ProviderConfig {
  name: ProviderName;
  enabled: boolean;
  /** articles per batch — tuned to free-tier token limits */
  batchSize: number;
  /** ms before giving up on a request */
  timeoutMs: number;
}

export type ProviderName = 'gemini' | 'groq' | 'mistral' | 'cerebras';

/** Ordered fallback chain — index 0 is tried first */
export const PROVIDER_CHAIN: ProviderConfig[] = [
  {
    name: 'gemini',
    enabled: true,
    batchSize: 20,
    timeoutMs: parseInt(process.env['AI_TIMEOUT_MS'] ?? '20000', 10),
  },
  {
    name: 'groq',
    enabled: true,
    batchSize: 5, // free tier: 14,400 tokens/min
    timeoutMs: parseInt(process.env['AI_TIMEOUT_MS'] ?? '20000', 10),
  },
  {
    name: 'mistral',
    enabled: true,
    batchSize: 10,
    timeoutMs: parseInt(process.env['AI_TIMEOUT_MS'] ?? '20000', 10),
  },
  {
    name: 'cerebras',
    enabled: true,
    batchSize: 10,
    timeoutMs: parseInt(process.env['AI_TIMEOUT_MS'] ?? '20000', 10),
  },
];
