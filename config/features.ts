/**
 * config/features.ts
 * Master feature-flag registry. Set any flag to false to disable that module.
 * Every module checks its own flag at runtime — disabled modules are no-ops.
 */
export const FEATURES = {
  // --- News pipeline ---
  rss: true,
  gdelt: true,
  scraper: true,

  // --- AI ---
  ai_translation: true,
  ai_clustering: false, // use cosine similarity by default; set true for AI-powered clustering

  // --- AI Providers (fallback chain order is: gemini > groq > mistral > cerebras) ---
  provider_gemini: true,
  provider_groq: true,
  provider_mistral: true,
  provider_cerebras: true,
  ollama: false, // disabled — no local GPU

  // --- UI ---
  alerts: true,
  globe_view: true,
  tv_view: true,
  compare_coverage: true,
  story_timeline: true,
  archive_chat: true,

  // --- Export ---
  pdf_export: true,
  read_aloud: true,

  // --- Data management ---
  auto_cleanup: false, // disabled by default; user must opt in
  watchlist: true,
} as const;

export type FeatureKey = keyof typeof FEATURES;
