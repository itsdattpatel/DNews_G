/**
 * frontend/src/components/watchlist/WatchlistDesk.tsx
 * Screen (g): Editorial Watchlist & Automated Keyword Tracking Desk (Step 10).
 * Broadsheet newspaper styling, priority ink stamps, keyword chips, live match counter,
 * inline topic editor/creator, and full empty/loading/error states.
 */
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { WatchlistItem } from '../../types';
import {
  calculateWatchlistMatches,
  getPriorityStamp,
  WATCHLIST_PRESETS,
} from '../../utils/watchlist';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  Eye,
  ArrowRight,
  RotateCcw,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export const WatchlistDesk: React.FC = () => {
  const {
    isWatchlistOpen,
    setWatchlistOpen,
    articles,
    setSearchQuery,
    setCurrentView,
  } = useAppStore();

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editor Modal / Inline form state
  const [editingItem, setEditingItem] = useState<Partial<WatchlistItem> | null>(null);
  const [formTopic, setFormTopic] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [formPriority, setFormPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch watchlist from API
  const fetchWatchlist = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/watchlist');
      if (!res.ok) {
        throw new Error(`Failed to load watchlist: HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isWatchlistOpen) {
      fetchWatchlist();
    }
  }, [isWatchlistOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isWatchlistOpen && !editingItem) {
        setWatchlistOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWatchlistOpen, editingItem, setWatchlistOpen]);

  // Open editor for a new topic
  const handleOpenCreate = () => {
    setEditingItem({ id: 0 });
    setFormTopic('');
    setFormKeywords('');
    setFormPriority('normal');
  };

  // Open editor for an existing topic
  const handleOpenEdit = (item: WatchlistItem) => {
    setEditingItem(item);
    setFormTopic(item.topic);
    setFormKeywords(item.keywords.join(', '));
    setFormPriority(item.priority);
  };

  // Quick preset adder
  const handleAddPreset = async (preset: (typeof WATCHLIST_PRESETS)[0]) => {
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: preset.topic,
          keywords: preset.keywords,
          priority: preset.priority,
        }),
      });
      if (!res.ok) throw new Error('Failed to create topic preset');
      toast.success(`Added monitor: ${preset.topic}`);
      fetchWatchlist();
    } catch (err) {
      toast.error(String(err));
    }
  };

  // Save topic (create or update)
  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTopic.trim()) return;

    setIsSubmitting(true);
    const kwList = formKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    try {
      if (editingItem?.id && editingItem.id > 0) {
        // Update existing
        const res = await fetch(`/api/watchlist/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: formTopic.trim(),
            keywords: kwList.length ? kwList : [formTopic.trim()],
            priority: formPriority,
          }),
        });
        if (!res.ok) throw new Error('Failed to update watchlist topic');
        toast.success(`Updated monitor: ${formTopic}`);
      } else {
        // Create new
        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: formTopic.trim(),
            keywords: kwList.length ? kwList : [formTopic.trim()],
            priority: formPriority,
          }),
        });
        if (!res.ok) throw new Error('Failed to create watchlist topic');
        toast.success(`Created monitor: ${formTopic}`);
      }

      setEditingItem(null);
      fetchWatchlist();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle enable/disable
  const handleToggle = async (item: WatchlistItem) => {
    try {
      const res = await fetch(`/api/watchlist/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !item.enabled }),
      });
      if (!res.ok) throw new Error('Failed to toggle topic status');
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, enabled: !item.enabled } : i)),
      );
      toast.success(`${item.topic} is now ${!item.enabled ? 'active' : 'paused'}`);
    } catch (err) {
      toast.error(String(err));
    }
  };

  // Delete topic
  const handleDelete = async (id: number, topic: string) => {
    if (!window.confirm(`Delete watchlist monitor for "${topic}"?`)) return;

    try {
      const res = await fetch(`/api/watchlist/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove topic');
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success(`Removed monitor: ${topic}`);
    } catch (err) {
      toast.error(String(err));
    }
  };

  // Jump to Main Wire filtered by this topic
  const handleFilterWire = (item: WatchlistItem) => {
    setSearchQuery(item.keywords[0] || item.topic);
    setWatchlistOpen(false);
    setCurrentView('category');
  };

  if (!isWatchlistOpen) return null;

  const activeCount = items.filter((i) => i.enabled).length;

  return (
    <div
      id="watchlist-desk-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="watchlist-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:p-7 bg-ink/75 backdrop-blur-xs select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !editingItem) setWatchlistOpen(false);
      }}
    >
      <div
        className="w-full max-w-5xl h-[88vh] bg-paper text-ink border-2 border-ink rounded-xs shadow-overlay flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Broadsheet Masthead Header */}
        <header className="p-4 sm:p-5 border-b-2 border-ink bg-paper-alt flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-ui text-[0.6875rem] font-bold uppercase tracking-widest text-ink-secondary">
                Topic Wire Monitor &amp; Automated Tracking · Vol. XCII No. 41
              </span>
              <span className="text-ink-muted text-xs">/</span>
              <span className="font-mono text-xs font-bold text-accent">
                {activeCount} Active Watchers
              </span>
            </div>

            <h2
              id="watchlist-heading"
              className="font-headline text-xl sm:text-2xl font-bold tracking-tight text-ink"
            >
              Editorial Watchlist Desk
            </h2>

            <div className="font-ui text-xs text-ink-secondary">
              Continuous keyword scanning over incoming international dispatches with priority alerts
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Add Topic Button */}
            <button
              id="btn-open-add-topic"
              type="button"
              onClick={handleOpenCreate}
              className="px-3.5 py-1.5 bg-ink text-paper font-ui font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-ink/90 inline-flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus size={14} />
              <span>Add Topic</span>
            </button>

            {/* Close Button */}
            <button
              id="btn-close-watchlist"
              type="button"
              onClick={() => setWatchlistOpen(false)}
              className="p-1.5 border border-paper-border hover:border-ink bg-paper hover:bg-ink hover:text-paper rounded-xs transition-colors shrink-0"
              title="Close Watchlist (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* 2. Subheader Bar & Quick Presets */}
        <div className="p-3.5 border-b border-paper-border bg-paper flex items-center justify-between gap-4 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-ui text-[0.625rem] uppercase font-bold text-ink-muted shrink-0">
              Quick Add Presets:
            </span>
            {WATCHLIST_PRESETS.map((preset) => {
              const alreadyAdded = items.some((i) => i.topic === preset.topic);
              return (
                <button
                  key={preset.topic}
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => handleAddPreset(preset)}
                  className={`font-mono text-[0.6875rem] border px-2 py-0.5 rounded-xs transition-colors shrink-0 whitespace-nowrap ${
                    alreadyAdded
                      ? 'border-paper-border/60 text-ink-muted opacity-50 cursor-not-allowed bg-paper-alt'
                      : 'border-paper-border hover:border-ink bg-paper-alt hover:bg-paper text-ink-secondary hover:text-ink'
                  }`}
                  title={alreadyAdded ? 'Already in Watchlist' : `Add ${preset.topic}`}
                >
                  + {preset.topic.split(' ')[0]}
                </button>
              );
            })}
          </div>

          <div className="font-mono text-[0.6875rem] text-ink-secondary shrink-0 hidden md:block">
            <strong>{items.length}</strong> Configured Topics
          </div>
        </div>

        {/* 3. Main Topic Ledger Body */}
        <div
          id="watchlist-body"
          className="flex-1 overflow-y-auto p-4 sm:p-6 bg-paper relative space-y-3.5"
        >
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="p-4 border-2 border-paper-border bg-paper-alt/50 rounded-xs animate-pulse space-y-2.5"
                >
                  <div className="h-4 bg-paper-border/60 rounded w-1/3" />
                  <div className="h-3 bg-paper-border/40 rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div
              role="alert"
              className="p-6 border-2 border-accent bg-accent/5 rounded-xs text-center space-y-3"
            >
              <AlertCircle size={28} className="text-accent mx-auto" />
              <h3 className="font-headline text-lg font-bold text-accent">
                Watchlist Data Unavailable
              </h3>
              <p className="font-body text-xs text-ink-secondary max-w-md mx-auto">{error}</p>
              <button
                type="button"
                onClick={fetchWatchlist}
                className="px-3.5 py-1.5 border border-accent bg-paper text-accent font-ui font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-accent hover:text-paper inline-flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={12} />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && items.length === 0 && (
            <div
              id="watchlist-empty-state"
              className="py-14 px-6 border-2 border-dashed border-paper-border bg-paper-alt/30 rounded-xs text-center space-y-4"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 border-2 border-ink bg-paper rounded-xs">
                <Eye size={24} className="text-ink" />
              </div>
              <div className="space-y-1">
                <h3 className="font-headline text-xl font-bold text-ink">
                  No Watchlist Topics Configured
                </h3>
                <p className="font-body text-xs text-ink-secondary max-w-md mx-auto">
                  Add custom conservation or geopolitical topics above to scan all incoming news feeds in real-time.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-ink text-paper font-ui font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-ink/90 inline-flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus size={14} />
                <span>Add Your First Topic</span>
              </button>
            </div>
          )}

          {/* Topic Ledger Cards */}
          {!isLoading && !error && items.length > 0 && (
            <div className="space-y-3">
              {items.map((item) => {
                const stamp = getPriorityStamp(item.priority);
                const matches = calculateWatchlistMatches(item.keywords, articles);

                return (
                  <div
                    key={item.id}
                    className={`p-4 border-2 rounded-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs ${
                      item.enabled
                        ? 'border-ink bg-paper-alt hover:bg-paper'
                        : 'border-paper-border bg-paper-alt/40 opacity-70'
                    }`}
                  >
                    {/* Topic Information */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Active / Paused Indicator Dot */}
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            item.enabled ? 'bg-positive animate-pulse' : 'bg-ink-muted/60'
                          }`}
                          title={item.enabled ? 'Monitoring active' : 'Monitoring paused'}
                        />

                        {/* Topic Headline */}
                        <h4 className="font-headline text-base font-bold text-ink">
                          {item.topic}
                        </h4>

                        {/* Priority Ink Stamp */}
                        <span className={`text-[0.625rem] px-2 py-0.5 rounded-xs ${stamp.className}`}>
                          {stamp.label}
                        </span>

                        {/* Status Label */}
                        <span className="font-mono text-[0.625rem] text-ink-muted">
                          {item.enabled ? '[MONITORING]' : '[PAUSED]'}
                        </span>
                      </div>

                      {/* Keyword Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <Tag size={11} className="text-ink-muted" />
                        <span className="font-ui text-[0.625rem] uppercase font-bold text-ink-muted">
                          Keywords:
                        </span>
                        {item.keywords.map((kw) => (
                          <span
                            key={kw}
                            className="font-mono text-[0.6875rem] border border-paper-border/80 bg-paper px-2 py-0.2 rounded-xs text-ink-secondary"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>

                      {/* Live Matches Indicator */}
                      <div className="font-ui text-xs flex items-center gap-2">
                        <span
                          className={`font-mono font-bold ${
                            matches > 0 ? 'text-accent' : 'text-ink-muted'
                          }`}
                        >
                          ● {matches} matching {matches === 1 ? 'dispatch' : 'dispatches'} in current edition
                        </span>
                        {matches > 0 && (
                          <button
                            type="button"
                            onClick={() => handleFilterWire(item)}
                            className="font-ui text-[0.6875rem] font-bold text-accent hover:underline flex items-center gap-0.5"
                          >
                            <span>Inspect Wire</span>
                            <ArrowRight size={10} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Topic Actions */}
                    <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-paper-border">
                      {/* Enable / Disable Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggle(item)}
                        className={`px-2.5 py-1 text-xs font-ui font-semibold rounded-xs border transition-colors ${
                          item.enabled
                            ? 'border-positive text-positive bg-positive/10 hover:bg-positive/20'
                            : 'border-paper-border text-ink-muted bg-paper hover:text-ink'
                        }`}
                      >
                        {item.enabled ? 'Enabled ✓' : 'Paused'}
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 border border-paper-border hover:border-ink bg-paper rounded-xs text-ink-secondary hover:text-ink transition-colors"
                        title="Edit Topic & Keywords"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.topic)}
                        className="p-1.5 border border-paper-border hover:border-accent bg-paper rounded-xs text-ink-muted hover:text-accent transition-colors"
                        title="Delete Monitor"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Topic Editor Modal Sub-dialog */}
        {editingItem && (
          <div
            id="watchlist-edit-modal"
            className="absolute inset-0 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 z-20"
          >
            <div className="w-full max-w-lg bg-paper text-ink border-2 border-ink rounded-xs p-5 shadow-overlay space-y-4">
              <div className="flex items-center justify-between border-b-2 border-ink pb-2">
                <h3 className="font-headline text-lg font-bold text-ink">
                  {editingItem.id && editingItem.id > 0 ? 'Edit Watchlist Topic' : 'Add Watchlist Topic'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="p-1 text-ink-muted hover:text-ink"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveTopic} className="space-y-3.5">
                {/* Topic Name */}
                <div className="space-y-1">
                  <label
                    htmlFor="watchlist-topic-input"
                    className="font-ui text-xs font-bold uppercase tracking-wider text-ink-secondary block"
                  >
                    Topic Headline:
                  </label>
                  <input
                    id="watchlist-topic-input"
                    type="text"
                    required
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="e.g. Bear bile trade in Southeast Asia"
                    className="w-full px-3 py-2 bg-paper-alt border border-paper-border focus:border-ink rounded-xs font-ui text-xs sm:text-sm text-ink placeholder:text-ink-muted focus:outline-none"
                    autoFocus
                  />
                </div>

                {/* Keywords (Comma-separated) */}
                <div className="space-y-1">
                  <label
                    htmlFor="watchlist-keywords-input"
                    className="font-ui text-xs font-bold uppercase tracking-wider text-ink-secondary block"
                  >
                    Keywords (comma-separated):
                  </label>
                  <input
                    id="watchlist-keywords-input"
                    type="text"
                    value={formKeywords}
                    onChange={(e) => setFormKeywords(e.target.value)}
                    placeholder="e.g. bear, bile, trade, Asia, trafficking"
                    className="w-full px-3 py-2 bg-paper-alt border border-paper-border focus:border-ink rounded-xs font-mono text-xs text-ink placeholder:text-ink-muted focus:outline-none"
                  />
                  <span className="font-ui text-[0.625rem] text-ink-muted">
                    If left blank, keywords will be automatically extracted from the topic title.
                  </span>
                </div>

                {/* Priority Selection */}
                <div className="space-y-1">
                  <label
                    htmlFor="watchlist-priority-select"
                    className="font-ui text-xs font-bold uppercase tracking-wider text-ink-secondary block"
                  >
                    Priority Wire Rating:
                  </label>
                  <select
                    id="watchlist-priority-select"
                    value={formPriority}
                    onChange={(e) =>
                      setFormPriority(e.target.value as 'low' | 'normal' | 'high')
                    }
                    className="w-full px-3 py-2 bg-paper-alt border border-paper-border focus:border-ink rounded-xs font-ui text-xs text-ink focus:outline-none"
                  >
                    <option value="high">Urgent Wire (High priority alert)</option>
                    <option value="normal">Active Radar (Standard monitoring)</option>
                    <option value="low">Routine Log (Low priority background)</option>
                  </select>
                </div>

                {/* Modal Buttons */}
                <div className="pt-3 border-t border-paper-border flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-3.5 py-1.5 border border-paper-border hover:border-ink bg-paper text-ink-secondary hover:text-ink font-ui font-semibold text-xs rounded-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-save-watchlist-topic"
                    type="submit"
                    disabled={isSubmitting || !formTopic.trim()}
                    className="px-4 py-1.5 bg-ink text-paper font-ui font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-ink/90 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Check size={13} />
                    <span>{isSubmitting ? 'Saving...' : 'Save Monitor'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 5. Footer Status Bar */}
        <footer className="p-3 border-t-2 border-ink bg-paper-alt flex flex-wrap items-center justify-between gap-3 text-xs font-ui text-ink-secondary shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[0.6875rem]">Engine:</span>
            <span>Local SQLite Watcher · SSE Live Dispatches Stream</span>
          </div>
          <span className="font-mono text-[0.625rem] text-ink-muted">
            Press ESC to return to desk
          </span>
        </footer>
      </div>
    </div>
  );
};

export default WatchlistDesk;

