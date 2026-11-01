/**
 * frontend/src/components/modal/MissedNewsModal.tsx
 * "Show missed news?" modal per Phase 5 Task P5-05.
 * Offers options: Yes (backfill via GDELT) / Skip / Settings.
 * Adheres strictly to DESIGN_SYSTEM.md editorial newspaper guidelines.
 */
import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { BackfillResponse } from '../../types';
import './MissedNewsModal.css';

export const MissedNewsModal: React.FC = () => {
  const isMissedNewsModalOpen = useAppStore((s) => s.isMissedNewsModalOpen);
  const setMissedNewsModalOpen = useAppStore((s) => s.setMissedNewsModalOpen);
  const startupStatus = useAppStore((s) => s.startupStatus);
  const triggerBackfill = useAppStore((s) => s.triggerBackfill);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BackfillResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isMissedNewsModalOpen || !startupStatus) {
    return null;
  }

  const missedMinutes = startupStatus.missed_minutes;

  const handleBackfill = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await triggerBackfill();
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backfill failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setMissedNewsModalOpen(false);
  };

  const handleOpenSettings = () => {
    setMissedNewsModalOpen(false);
    setSettingsOpen(true);
  };

  const formatTimestamp = (iso?: string | null) => {
    if (!iso) return 'N/A';
    try {
      const d = new Date(iso);
      return isNaN(d.getTime()) ? iso : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div
      className="missed-news-overlay"
      id="missed-news-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="missed-news-title"
    >
      <div className="missed-news-modal" id="missed-news-modal">
        {/* Header */}
        <div className="missed-news-header">
          <div className="missed-news-title-wrap">
            {/* Custom SVG Editorial Dispatch Quill Emblem */}
            <svg
              className="missed-news-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              <line x1="12" y1="7" x2="12" y2="13" />
              <line x1="9" y1="10" x2="15" y2="10" />
            </svg>
            <h2 className="missed-news-title" id="missed-news-title">
              Catch-Up Dispatches
            </h2>
          </div>
          <button
            type="button"
            className="missed-news-close-btn"
            onClick={handleSkip}
            aria-label="Dismiss catch up modal"
            id="btn-missed-news-close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="missed-news-body">
          {/* Downtime Notice Box */}
          <div className="missed-news-downtime-box">
            <svg
              className="missed-news-downtime-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div className="missed-news-downtime-info">
              <div className="missed-news-downtime-headline">
                Desk was offline for {missedMinutes} minutes
              </div>
              <div className="missed-news-downtime-sub">
                Window: {formatTimestamp(startupStatus.window_start)} – {formatTimestamp(startupStatus.window_end)}
              </div>
            </div>
          </div>

          {/* Explanation */}
          {!result && !loading && !error && (
            <p className="missed-news-explanation">
              Would you like to run a backfill pass to retrieve major world dispatches filed during this downtime window?
            </p>
          )}

          {/* Transparent Honest Disclosure */}
          {!result && !loading && (
            <div className="missed-news-disclosure">
              <svg
                className="missed-news-disclosure-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="missed-news-disclosure-text">
                <strong>Feed Disclosure:</strong> Standard RSS feeds only offer current items. GDELT global news archives will backfill the gap where recorded.
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="missed-news-loading-box" id="missed-news-loading">
              <svg className="missed-news-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              <div className="missed-news-loading-text">
                Querying GDELT wire archives across international outlets...
              </div>
            </div>
          )}

          {/* Success State */}
          {result && (
            <div className="missed-news-success-box" id="missed-news-success">
              <div className="missed-news-success-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Backfill Synchronized Successfully</span>
              </div>
              <div className="missed-news-success-stat">
                Recovered <strong>{result.articles_inserted}</strong> new dispatches across {result.covered_minutes} minutes.
              </div>
              {result.warning && (
                <div className="missed-news-success-warning" id="missed-news-gap-warning">
                  <svg
                    className="missed-news-warning-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{result.warning}</span>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="missed-news-error-box" id="missed-news-error">
              <strong>Synchronization Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="missed-news-footer">
          {/* Settings Option (Option 3) */}
          <button
            type="button"
            className="missed-news-btn-settings"
            onClick={handleOpenSettings}
            id="btn-missed-news-settings"
            title="Configure auto-cleanup and fetch intervals"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
          </button>

          {/* Action Group */}
          <div className="missed-news-btn-group">
            {/* Skip Option (Option 2) */}
            <button
              type="button"
              className="missed-news-btn-secondary"
              onClick={handleSkip}
              id="btn-missed-news-skip"
            >
              {result ? 'Close' : 'Skip'}
            </button>

            {/* Yes / Backfill Option (Option 1) */}
            {!result && (
              <button
                type="button"
                className="missed-news-btn-primary"
                onClick={handleBackfill}
                disabled={loading}
                id="btn-missed-news-backfill"
              >
                {loading ? 'Backfilling...' : 'Yes, Backfill'}
              </button>
            )}

            {result && (
              <button
                type="button"
                className="missed-news-btn-primary"
                onClick={handleSkip}
                id="btn-missed-news-done"
              >
                View News Desk
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
