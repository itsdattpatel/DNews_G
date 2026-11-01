/**
 * backend/src/routes/quota.ts
 * GET /api/quota — per-provider usage statistics for today.
 */
import { Router, type Request, type Response } from 'express';
import { getAllProviderStats } from '../ai/quota';
import { getCurrentProvider } from '../ai/router';

export const quotaRouter = Router();

quotaRouter.get('/', (_req: Request, res: Response) => {
  const stats = getAllProviderStats();
  const currentProvider = getCurrentProvider();

  res.json({
    current_provider: currentProvider,
    providers: {
      gemini: {
        calls_today: stats['gemini']?.callsToday ?? 0,
        tokens_today: stats['gemini']?.tokensToday ?? 0,
        errors_today: stats['gemini']?.errorsToday ?? 0,
      },
      groq: {
        calls_today: stats['groq']?.callsToday ?? 0,
        tokens_today: stats['groq']?.tokensToday ?? 0,
        errors_today: stats['groq']?.errorsToday ?? 0,
      },
      mistral: {
        calls_today: stats['mistral']?.callsToday ?? 0,
        tokens_today: stats['mistral']?.tokensToday ?? 0,
        errors_today: stats['mistral']?.errorsToday ?? 0,
      },
      cerebras: {
        calls_today: stats['cerebras']?.callsToday ?? 0,
        tokens_today: stats['cerebras']?.tokensToday ?? 0,
        errors_today: stats['cerebras']?.errorsToday ?? 0,
      },
    },
  });
});
