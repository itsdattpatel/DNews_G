/**
 * frontend/src/hooks/useArticles.ts
 * Fetches articles based on active category, country, search query, and breaking filters.
 * Seamlessly falls back to autonomous on-device engine on mobile or during offline/port issues.
 */
import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAppStore } from '../store/useAppStore';
import { autonomousEngine } from '../lib/autonomousEngine';
import { getApiBaseUrl } from '../lib/api';
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
      let loaded = false;
      const baseUrl = getApiBaseUrl();

      // Only attempt remote HTTP fetch if baseUrl is explicitly set or when running in standard browser dev
      if (baseUrl || (!Capacitor.isNativePlatform() && window.location.protocol !== 'file:')) {
        try {
          const params = new URLSearchParams();
          params.set('limit', '60');
          params.set('status', 'done');

          if (selectedCategory) params.set('category', selectedCategory);
          if (selectedCountry) params.set('country', selectedCountry);
          if (isBreakingOnly) params.set('breaking', 'true');
          if (searchQuery.trim()) params.set('q', searchQuery.trim());

          const fetchUrl = `${baseUrl}/api/articles?${params.toString()}`;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);

          const res = await fetch(fetchUrl, { signal: controller.signal });
          clearTimeout(timer);

          if (res.ok) {
            const data = (await res.json()) as { total: number; items: Article[] };
            setArticles(data.items, data.total);
            loaded = true;
          }
        } catch (err) {
          console.warn('[useArticles] Remote fetch failed, falling back to autonomous engine:', err);
        }
      }

      if (!loaded) {
        // Autonomous On-Device Client Engine fallback
        const local = autonomousEngine.getArticles({
          category: selectedCategory,
          country: selectedCountry,
          breaking: isBreakingOnly,
          q: searchQuery.trim(),
          limit: 60,
        });
        setArticles(local.items, local.total);
      }

      useAppStore.getState().fetchCategoryCounts();
    };

    // Debounce search query changes by 350ms, run category/country changes immediately
    const delay = searchQuery ? 350 : 0;
    debounceTimerRef.current = setTimeout(fetchArticles, delay);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [selectedCategory, selectedCountry, searchQuery, isBreakingOnly, setArticles]);
}
