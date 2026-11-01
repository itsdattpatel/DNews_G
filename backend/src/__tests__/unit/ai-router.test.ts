import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../ai/gemini', () => ({
  callGemini: vi.fn(),
}));

vi.mock('../../ai/groq', () => ({
  callGroq: vi.fn(),
}));

vi.mock('../../ai/mistral', () => ({
  callMistral: vi.fn(),
}));

vi.mock('../../ai/cerebras', () => ({
  callCerebras: vi.fn(),
}));

vi.mock('../../ai/quota', () => ({
  recordCall: vi.fn(),
}));

vi.mock('../../routes/sse', () => ({
  emitSseEvent: vi.fn(),
}));

import { routeAIRequest, getCurrentProvider } from '../../ai/router';
import { callGemini } from '../../ai/gemini';
import { callGroq } from '../../ai/groq';
import { emitSseEvent } from '../../routes/sse';
import { recordCall } from '../../ai/quota';

describe('AI Router Fallback (T1-03, T1-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses primary provider (Gemini) when it succeeds', async () => {
    vi.mocked(callGemini).mockResolvedValueOnce('{"summary":"Test summary"}');

    const result = await routeAIRequest('Summarize this');

    expect(result.provider).toBe('gemini');
    expect(result.text).toBe('{"summary":"Test summary"}');
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(callGroq).not.toHaveBeenCalled();
    expect(recordCall).toHaveBeenCalledWith(
      'gemini',
      expect.any(String),
      expect.any(Number),
      expect.any(Number),
      true,
    );
  });

  it('falls back to Groq when Gemini returns 429 rate limit (T1-03)', async () => {
    vi.mocked(callGemini).mockRejectedValueOnce(new Error('429 Too Many Requests - rate limit exceeded'));
    vi.mocked(callGroq).mockResolvedValueOnce('{"summary":"Fallback summary"}');

    const result = await routeAIRequest('Summarize this');

    expect(result.provider).toBe('groq');
    expect(result.text).toBe('{"summary":"Fallback summary"}');
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(callGroq).toHaveBeenCalledTimes(1);
    expect(emitSseEvent).toHaveBeenCalledWith(
      'provider_switch',
      expect.objectContaining({ reason: 'rate_limit' }),
    );
  });

  it('falls back to Groq when Gemini times out (T1-04)', async () => {
    vi.mocked(callGemini).mockRejectedValueOnce(new Error('Timeout after 20000ms'));
    vi.mocked(callGroq).mockResolvedValueOnce('{"summary":"Timeout fallback summary"}');

    const result = await routeAIRequest('Summarize this');

    expect(result.provider).toBe('groq');
    expect(result.text).toBe('{"summary":"Timeout fallback summary"}');
  });
});
