/**
 * backend/src/routes/feedCounter.ts
 * Live Feed Counter API route (PRD A Category 8).
 * Surfaces rolling 24-hour, 7-day, 30-day, lifetime totals, hourly sparkline, and session stats.
 */
import { Router } from 'express';
import { getFeedCounterMetrics } from '../services/feedCounter';

export const feedCounterRouter: Router = Router();

feedCounterRouter.get('/', (_req, res) => {
  try {
    const metrics = getFeedCounterMetrics();
    res.json({
      success: true,
      ...metrics,
    });
  } catch (err: any) {
    console.error('[FeedCounter] Failed to retrieve metrics:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve feed counter metrics',
      message: err.message,
    });
  }
});

export default feedCounterRouter;
