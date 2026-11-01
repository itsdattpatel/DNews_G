/**
 * frontend/src/components/layout/NewsTicker.tsx
 * Continuous horizontal marquee ticker for breaking world dispatches.
 * Pauses on hover; clicking a dispatch focuses that story in the Main Reader.
 */
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Radio } from 'lucide-react';

export const NewsTicker: React.FC = () => {
  const articles = useAppStore((s) => s.articles);
  const setSelectedArticle = useAppStore((s) => s.setSelectedArticle);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  // Take the latest 10 articles for the ticker wire
  const tickerItems = articles.slice(0, 12);

  if (!tickerItems.length) return null;

  const handleClickArticle = (article: typeof tickerItems[0]) => {
    setSelectedArticle(article);
    setCurrentView('reader');
  };

  return (
    <div
      id="news-ticker-bar"
      className="h-8 min-h-8 w-full bg-paper border-t border-paper-border flex items-center z-30 overflow-hidden select-none text-ink text-xs font-ui"
    >
      {/* Ticker Lead-in Badge */}
      <div className="flex items-center gap-1.5 px-3 h-full bg-paper-alt border-r border-paper-border shrink-0 z-10 shadow-xs">
        <Radio size={12} className="text-accent animate-pulse" />
        <span className="font-mono text-[0.6875rem] font-bold uppercase tracking-wider text-ink">
          WIRE DISPATCH
        </span>
      </div>

      {/* Marquee Content */}
      <div className="flex-1 overflow-hidden relative group">
        <div className="inline-flex gap-8 whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused] py-1 cursor-pointer">
          {/* Duplicate loop to allow seamless CSS marquee */}
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              onClick={() => handleClickArticle(item)}
              className="inline-flex items-center gap-2 hover:text-accent transition-colors text-left"
            >
              <span className="text-[0.625rem] font-mono text-ink-muted">
                [{item.source?.country || 'World'}]
              </span>
              <span className="font-headline text-xs font-semibold text-ink hover:underline">
                {item.title_english}
              </span>
              {item.breaking_score >= 75 && (
                <span className="font-mono text-[0.5625rem] font-bold uppercase bg-accent/15 text-accent px-1.5 py-0.2 rounded-xs">
                  Urgent
                </span>
              )}
              <span className="text-paper-border">·</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsTicker;
