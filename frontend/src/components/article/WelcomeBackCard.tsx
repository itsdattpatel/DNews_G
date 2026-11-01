/**
 * frontend/src/components/article/WelcomeBackCard.tsx
 * Broadsheet Welcome-Back dismissible banner adhering strictly to PRD A Category 1B.
 * Appears at the top of the reader if the backend detected a downtime gap > 5 minutes
 * and new/catch-up articles arrived.
 */
import { useState, useEffect, memo } from 'react';
import { Newspaper, X, ArrowRight } from 'lucide-react';

export interface WelcomeBackCardProps {
  onViewDispatches?: () => void;
  className?: string;
  initialMissedMinutes?: number;
  initialArticlesCount?: number;
}

export const WelcomeBackCard = memo<WelcomeBackCardProps>(({
  onViewDispatches,
  className = '',
  initialMissedMinutes,
  initialArticlesCount,
}) => {
  const isInitiallyActive =
    Boolean(initialMissedMinutes && initialMissedMinutes >= 5 && initialArticlesCount && initialArticlesCount >= 1);

  const [visible, setVisible] = useState(() => {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('dismissed_welcome_back') === '1') {
      return false;
    }
    return isInitiallyActive;
  });
  const [missedMinutes, setMissedMinutes] = useState(initialMissedMinutes ?? 0);
  const [articlesCount, setArticlesCount] = useState(initialArticlesCount ?? 0);

  useEffect(() => {
    if (initialMissedMinutes !== undefined) return;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('dismissed_welcome_back') === '1') {
      return;
    }

    // Fetch session and downtime gap status from backend
    fetch('/api/session/current')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !data.downtime) return;
        const { detected, missed_minutes } = data.downtime;
        const count = data.session?.articles_ingested_in_session ?? 0;

        if (detected && missed_minutes >= 5 && count >= 1) {
          setMissedMinutes(missed_minutes);
          setArticlesCount(count);
          setVisible(true);
        }
      })
      .catch((err) => {
        console.warn('[WelcomeBackCard] Failed to fetch session downtime:', err);
      });
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem('dismissed_welcome_back', '1');
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Welcome Back Notice"
      data-testid="welcome-back-card"
      className={`mb-6 p-4 sm:p-5 rounded-xs border border-paper-border bg-paper-alt text-ink shadow-xs transition-all duration-200 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xs border border-paper-border bg-paper text-accent shrink-0 mt-0.5">
            <Newspaper size={18} />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-ui text-[0.625rem] font-bold uppercase tracking-widest px-1.5 py-0.5 border border-ink/20 text-ink bg-paper rounded-xs">
                Desk Reconnected
              </span>
              <span className="font-mono text-xs text-ink-muted">
                {missedMinutes}m hiatus resolved
              </span>
            </div>

            <h4 className="font-serif font-bold text-base sm:text-lg text-ink leading-snug">
              Welcome back.
            </h4>

            <p className="font-serif text-sm text-ink-secondary mt-1 leading-relaxed">
              During the {missedMinutes}-minute break,{' '}
              <strong className="text-ink font-semibold">{articlesCount} new dispatches</strong>{' '}
              arrived and were cataloged to the desk.
            </p>

            {onViewDispatches && (
              <button
                type="button"
                onClick={onViewDispatches}
                className="mt-3 inline-flex items-center gap-1.5 font-ui text-xs font-bold uppercase tracking-wider text-ink hover:text-accent transition-colors underline decoration-paper-border underline-offset-4 hover:decoration-accent"
              >
                <span>View latest wire dispatches</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss welcome back notice"
          className="p-1 text-ink-muted hover:text-ink hover:bg-paper rounded-xs transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
});

WelcomeBackCard.displayName = 'WelcomeBackCard';
