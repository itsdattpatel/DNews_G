/**
 * frontend/src/components/sources/CustomRssStudio.tsx
 * Custom RSS / Atom Feed Studio (PRD Master Expansion #32).
 * Enables readers to add, validate, and syndicate their own custom RSS feeds.
 */
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { autonomousEngine } from '../../lib/autonomousEngine';
import { apiFetch, shouldAttemptRemote } from '../../lib/api';
import { triggerHaptic } from '../../lib/haptics';
import { Rss, Plus, Trash2, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import type { Category } from '../../types';

export interface CustomUserFeed {
  id: string;
  name: string;
  url: string;
  country: string;
  category: Category;
  addedAt: string;
}

const CATEGORIES: Category[] = [
  'World',
  'Politics',
  'Business',
  'Tech',
  'Science',
  'Health',
  'Sports',
  'Entertainment',
  'Environment',
  'Crime',
  'Animals',
];

export const CustomRssStudio: React.FC = () => {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [customFeeds, setCustomFeeds] = useState<CustomUserFeed[]>([]);
  const [feedUrl, setFeedUrl] = useState('');
  const [feedName, setFeedName] = useState('');
  const [feedCountry, setFeedCountry] = useState('Global');
  const [feedCategory, setFeedCategory] = useState<Category>('World');
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [validationMessage, setValidationMessage] = useState('');

  // Load persisted custom feeds from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dnews_custom_user_feeds');
      if (saved) {
        setCustomFeeds(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const handleValidateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedUrl.trim() || !feedName.trim()) return;

    setIsValidating(true);
    setValidationStatus('idle');
    const cleanUrl = feedUrl.trim();
    const cleanName = feedName.trim();
    const cleanCountry = feedCountry.trim() || 'Global';

    try {
      // 1. Validate URL syntax
      new URL(cleanUrl);

      // 2. Real feed verification via backend or autonomous native/CORS probe
      let verifiedRemote = false;
      if (shouldAttemptRemote()) {
        try {
          const testRes = await apiFetch('/api/sources/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: cleanUrl }),
          });
          if (!testRes.ok) {
            const errData = await testRes.json().catch(() => ({}));
            throw new Error(errData.error || `Feed test failed (${testRes.status})`);
          }
          await apiFetch('/api/sources', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: cleanName,
              url: cleanUrl,
              country: cleanCountry,
              fetch_type: 'rss',
              region: cleanCountry,
            }),
          });
          verifiedRemote = true;
        } catch (err) {
          throw err instanceof Error ? err : new Error('Failed to validate RSS feed.');
        }
      } else {
        const probe = await autonomousEngine.validateFeedUrl(cleanUrl);
        if (!probe.ok) {
          throw new Error(probe.error || 'Could not reach a valid RSS/Atom XML feed.');
        }
      }

      const newFeed: CustomUserFeed = {
        id: `custom-feed-${Date.now()}`,
        name: cleanName,
        url: cleanUrl,
        country: cleanCountry,
        category: feedCategory,
        addedAt: new Date().toISOString(),
      };

      const updated = [newFeed, ...customFeeds];
      setCustomFeeds(updated);
      try {
        localStorage.setItem('dnews_custom_user_feeds', JSON.stringify(updated));
      } catch {}

      triggerHaptic('bookmark');
      setValidationStatus('success');
      setValidationMessage(`Syndicated feed “${cleanName}” verified and connected!`);
      setFeedUrl('');
      setFeedName('');

      // Immediately pull fresh dispatches from the newly added syndicate
      if (verifiedRemote) {
        void useAppStore.getState().performFullResync('custom_rss_added');
      } else {
        void autonomousEngine.pollLiveFeeds().then((added) => {
          if (added.length > 0) {
            const s = useAppStore.getState();
            const local = autonomousEngine.getArticles({
              category: s.selectedCategory,
              country: s.selectedCountry,
              breaking: s.isBreakingOnly,
              q: s.searchQuery.trim(),
              limit: 60,
            });
            s.setArticles(local.items, local.total);
          }
        });
      }
    } catch (err) {
      triggerHaptic('heavy');
      setValidationStatus('error');
      setValidationMessage(
        err instanceof Error
          ? err.message
          : 'Invalid URL format. Please provide a valid http:// or https:// RSS/Atom endpoint.',
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleDeleteFeed = (id: string) => {
    triggerHaptic('light');
    const updated = customFeeds.filter((f) => f.id !== id);
    setCustomFeeds(updated);
    try {
      localStorage.setItem('dnews_custom_user_feeds', JSON.stringify(updated));
    } catch {}
  };

  return (
    <div
      id="custom-rss-studio"
      className="w-full h-full min-h-0 min-w-0 overflow-y-auto bg-paper text-ink p-4 sm:p-8 lg:p-12 select-none"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-2 border-ink mb-6">
        <div>
          <button
            onClick={() => {
              triggerHaptic('light');
              setCurrentView('reader');
            }}
            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-ink-secondary hover:text-ink mb-2 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Return to Dispatch Reader</span>
          </button>
          <div className="flex items-center gap-2">
            <Rss size={22} className="text-accent" />
            <h1 className="font-masthead text-2xl sm:text-3xl font-bold uppercase tracking-tight text-ink">
              Custom RSS &amp; Atom Syndicate Studio
            </h1>
          </div>
          <p className="font-serif italic text-xs sm:text-sm text-ink-secondary mt-1">
            Connect personal blogs, regional gazettes, or Substack dispatches to your telegraph wire.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Left Column: Feed Connection Form */}
        <div className="lg:col-span-5">
          <div className="p-5 border-2 border-ink bg-paper-alt rounded-xs shadow-xs">
            <h2 className="font-masthead text-sm font-bold uppercase tracking-wider text-ink pb-2 border-b border-paper-border mb-4 flex items-center gap-1.5">
              <Plus size={14} className="text-accent" />
              <span>Syndicate New Feed</span>
            </h2>

            <form onSubmit={handleValidateAndAdd} className="space-y-3.5">
              <div>
                <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Feed Endpoint URL (RSS / Atom / XML)
                </label>
                <input
                  id="input-feed-url"
                  type="url"
                  required
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  className="w-full p-2 bg-paper border border-paper-border focus:border-ink rounded-xs font-mono text-xs text-ink outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Publication Bureau Name
                </label>
                <input
                  id="input-feed-name"
                  type="text"
                  required
                  value={feedName}
                  onChange={(e) => setFeedName(e.target.value)}
                  placeholder="e.g. Kyoto Chronicle"
                  className="w-full p-2 bg-paper border border-paper-border focus:border-ink rounded-xs font-serif text-xs text-ink outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                    Country / Region
                  </label>
                  <input
                    id="input-feed-country"
                    type="text"
                    value={feedCountry}
                    onChange={(e) => setFeedCountry(e.target.value)}
                    placeholder="e.g. Japan"
                    className="w-full p-2 bg-paper border border-paper-border focus:border-ink rounded-xs font-serif text-xs text-ink outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                    Primary Section
                  </label>
                  <select
                    id="select-feed-category"
                    value={feedCategory}
                    onChange={(e) => setFeedCategory(e.target.value as Category)}
                    className="w-full p-2 bg-paper border border-paper-border focus:border-ink rounded-xs font-serif text-xs text-ink outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Banner */}
              {validationStatus === 'success' && (
                <div className="p-2.5 border border-positive bg-positive/10 text-positive text-xs font-serif flex items-center gap-2 rounded-xs">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{validationMessage}</span>
                </div>
              )}
              {validationStatus === 'error' && (
                <div className="p-2.5 border border-accent bg-accent/10 text-accent text-xs font-serif flex items-center gap-2 rounded-xs">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{validationMessage}</span>
                </div>
              )}

              <button
                id="btn-syndicate-feed"
                type="submit"
                disabled={isValidating || !feedUrl.trim() || !feedName.trim()}
                className="w-full py-2.5 border-2 border-ink bg-ink text-paper font-mono text-xs font-bold uppercase tracking-wider rounded-xs hover:bg-paper hover:text-ink transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
              >
                {isValidating ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Validating Feed...</span>
                  </>
                ) : (
                  <>
                    <Plus size={13} />
                    <span>Syndicate Feed</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Active Custom Syndicates */}
        <div className="lg:col-span-7">
          <div className="p-5 border-2 border-ink bg-paper rounded-xs shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-paper-border mb-4">
              <h2 className="font-masthead text-sm font-bold uppercase tracking-wider text-ink">
                Active Custom Syndicates ({customFeeds.length})
              </h2>
              <span className="font-mono text-[10px] text-ink-muted">Saved to Local Newsprint Storage</span>
            </div>

            {customFeeds.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-paper-border rounded-xs text-ink-muted font-serif italic text-xs">
                No custom RSS/Atom feeds added yet. Inscribe a feed URL to begin syndicating private dispatches.
              </div>
            ) : (
              <div className="space-y-3">
                {customFeeds.map((feed) => (
                  <div
                    key={feed.id}
                    className="p-3.5 border border-paper-border bg-paper-alt/50 rounded-xs flex items-center justify-between gap-3 hover:border-ink transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-ink text-sm">{feed.name}</span>
                        <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-xs border border-ink/30 bg-paper text-ink-secondary">
                          {feed.category}
                        </span>
                        <span className="text-ink-muted text-xs">·</span>
                        <span className="font-serif text-xs text-ink-secondary">{feed.country}</span>
                      </div>
                      <div className="font-mono text-[11px] text-ink-muted truncate max-w-sm mt-0.5">
                        {feed.url}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteFeed(feed.id)}
                      className="p-1.5 text-ink-muted hover:text-red-700 transition-colors rounded-xs hover:bg-paper cursor-pointer"
                      title="Remove custom feed"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
