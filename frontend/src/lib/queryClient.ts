/**
 * frontend/src/lib/queryClient.ts
 * TanStack Query Client instance configured per FRONTEND_BACKEND_CONTRACT.md
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,          // 1 minute default freshness
      gcTime: 5 * 60_000,         // 5 minutes garbage collection time
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

