/**
 * frontend/src/hooks/useArticles.ts
 * Fetches articles based on active category, country, search query, and breaking filters.
 */
import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Article } from '../types';

export function useArticles(): void {
  const setArticles = useAppStore((s) => s.setArticles);
  const selectedCategory = useAppStore((s) => s.selectedCategory);
  const selectedCountry = useAppStore((s) => s.selectedCountry);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const isBreakingOnly = useAppStore((s) => s.isBreakingOnly);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const fetchArticles = async () => {
      try {
        const params = new URLSearchParams();
        params.set('limit', '60');
        params.set('status', 'done');

        if (selectedCategory) params.set('category', selectedCategory);
        if (selectedCountry) params.set('country', selectedCountry);
        if (isBreakingOnly) params.set('breaking', 'true');
        if (searchQuery.trim()) params.set('q', searchQuery.trim());

        const res = await fetch(`/api/articles?${params.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as { total: number; items: Article[] };
          setArticles(data.items, data.total);
        }
        useAppStore.getState().fetchCategoryCounts();
      } catch (err) {
        console.warn('[useArticles] Failed to fetch articles:', err);
      }
    };

    // Debounce search query changes by 350ms, run category/country changes immediately
    const delay = searchQuery ? 350 : 0;
    debounceTimerRef.current = setTimeout(fetchArticles, delay);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [selectedCategory, selectedCountry, searchQuery, isBreakingOnly, setArticles]);
}
