/**
 * backend/src/services/secretsManager.ts
 * In-App Secrets Manager for DNews (PRD E Category 11).
 * Safely persists and loads AI provider keys from %APPDATA%\DNews\user.env.
 */
import fs from 'fs';
import path from 'path';
import { getUserEnvPath } from '../utils/appPaths';

export interface ProviderKeyStatus {
  is_configured: boolean;
  masked_key: string;
}

export type SupportedProvider = 'gemini' | 'groq' | 'mistral' | 'cerebras';

export const PROVIDER_ENV_MAP: Record<SupportedProvider, string> = {
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  cerebras: 'CEREBRAS_API_KEY',
};

export const PROVIDER_PORTAL_LINKS: Record<SupportedProvider, string> = {
  gemini: 'https://aistudio.google.com/app/apikey',
  groq: 'https://console.groq.com/keys',
  mistral: 'https://console.mistral.ai/api-keys/',
  cerebras: 'https://cloud.cerebras.ai/',
};

export function maskApiKey(key: string | undefined): string {
  if (!key || key.length < 6 || key.includes('your_') || key.includes('placeholder')) {
    return '';
  }
  const prefix = key.slice(0, 4);
  const suffix = key.slice(-2);
  return `${prefix}••••••••••••••••${suffix}`;
}

export function loadUserEnvIntoProcess(): void {
  const envPath = getUserEnvPath();
  if (!fs.existsSync(envPath)) return;
  try {
    const raw = fs.readFileSync(envPath, 'utf-8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const k = trimmed.slice(0, idx).trim();
          const v = trimmed.slice(idx + 1).trim();
          if (k && v && !process.env[k]) {
            process.env[k] = v;
          }
        }
      }
    });
  } catch (err) {
    console.warn('[SecretsManager] Failed to read user.env:', err);
  }
}

export function getProviderKeyStatuses(): Record<SupportedProvider, ProviderKeyStatus> {
  const result: Partial<Record<SupportedProvider, ProviderKeyStatus>> = {};
  for (const [provider, envVar] of Object.entries(PROVIDER_ENV_MAP) as [SupportedProvider, string][]) {
    const val = process.env[envVar];
    const isConfigured = Boolean(val && !val.includes('your_') && !val.includes('placeholder') && val.length > 5);
    result[provider] = {
      is_configured: isConfigured,
      masked_key: isConfigured ? maskApiKey(val) : '',
    };
  }
  return result as Record<SupportedProvider, ProviderKeyStatus>;
}

export function saveProviderKeys(keys: Partial<Record<SupportedProvider, string>>): string[] {
  const envPath = getUserEnvPath();
  const dir = path.dirname(envPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Read existing user.env entries
  const currentEntries: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    try {
      const raw = fs.readFileSync(envPath, 'utf-8');
      raw.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const k = trimmed.slice(0, idx).trim();
            const v = trimmed.slice(idx + 1).trim();
            if (k) currentEntries[k] = v;
          }
        }
      });
    } catch {
      // ignore read error
    }
  }

  const updated: string[] = [];
  for (const [provider, newKey] of Object.entries(keys) as [SupportedProvider, string | undefined][]) {
    if (typeof newKey === 'string' && newKey.trim()) {
      const envVar = PROVIDER_ENV_MAP[provider];
      const trimmedKey = newKey.trim();
      currentEntries[envVar] = trimmedKey;
      process.env[envVar] = trimmedKey;
      updated.push(provider);
    }
  }

  // Format and write back to user.env
  const lines: string[] = [
    '# DNews User Secrets Configuration',
    '# Generated securely by DNews In-App Secrets Manager',
    `# Updated: ${new Date().toISOString()}`,
    '',
  ];
  for (const [k, v] of Object.entries(currentEntries)) {
    lines.push(`${k}=${v}`);
  }
  lines.push('');

  fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');
  return updated;
}

export async function testProviderKey(
  provider: SupportedProvider,
  keyOverride?: string,
): Promise<{ valid: boolean; message: string }> {
  const envVar = PROVIDER_ENV_MAP[provider];
  const key = keyOverride?.trim() || process.env[envVar];

  if (!key || key.includes('your_') || key.includes('placeholder') || key.length < 6) {
    return { valid: false, message: 'API key is missing or not configured' };
  }

  try {
    if (provider === 'gemini') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const res = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
      });
      if (res.response) {
        return { valid: true, message: 'Gemini API key is valid and working.' };
      }
    } else if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        return { valid: true, message: 'Groq API key is valid and working.' };
      }
      return { valid: false, message: `Groq error: ${res.statusText} (${res.status})` };
    } else if (provider === 'mistral') {
      const res = await fetch('https://api.mistral.ai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        return { valid: true, message: 'Mistral API key is valid and working.' };
      }
      return { valid: false, message: `Mistral error: ${res.statusText} (${res.status})` };
    } else if (provider === 'cerebras') {
      const res = await fetch('https://api.cerebras.ai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        return { valid: true, message: 'Cerebras API key is valid and working.' };
      }
      return { valid: false, message: `Cerebras error: ${res.statusText} (${res.status})` };
    }
    return { valid: true, message: 'Key verification complete.' };
  } catch (err: any) {
    return { valid: false, message: err.message || 'Key verification failed' };
  }
}
