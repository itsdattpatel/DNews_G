/**
 * frontend/src/components/cartography/MastheadMarketTicker.tsx
 * Feature #29: Masthead Commodity & Currency Ticker Tape.
 * Sits cleanly in normal layout flow directly below StatusStrip without overlapping controls.
 */
import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { TrendingUp, TrendingDown, RefreshCw, X } from 'lucide-react';
import { triggerHaptic } from '../../lib/haptics';

export const MastheadMarketTicker: React.FC = () => {
  const showMastheadTicker = useAppStore((s) => s.showMastheadTicker);
  const toggleMastheadTicker = useAppStore((s) => s.toggleMastheadTicker);
  const marketTickers = useAppStore((s) => s.marketTickers);
  const fetchMarketTickers = useAppStore((s) => s.fetchMarketTickers);
  const setCartographyDeskOpen = useAppStore((s) => s.setCartographyDeskOpen);
  const setCartographyInitialTab = useAppStore((s) => s.setCartographyInitialTab);

  useEffect(() => {
    if (showMastheadTicker && marketTickers.length === 0) {
      fetchMarketTickers(false);
    }
  }, [showMastheadTicker, marketTickers.length, fetchMarketTickers]);

  if (!showMastheadTicker || marketTickers.length === 0) {
    return null;
  }

  const handleOpenMarketsDesk = () => {
    triggerHaptic('selection');
    setCartographyInitialTab('markets');
    setCartographyDeskOpen(true);
  };

  return (
    <div
      id="masthead-market-ticker"
      aria-label="Masthead Commodity and Currency Ticker Tape"
      className="h-7 min-h-7 w-full bg-paper-alt border-b border-paper-border flex items-center justify-between text-[11px] font-mono select-none overflow-hidden z-30"
    >
      {/* Left Brass / Ink Label */}
      <button
        type="button"
        onClick={handleOpenMarketsDesk}
        className="h-full px-2.5 bg-paper border-r border-paper-border flex items-center gap-1.5 font-bold uppercase tracking-wider text-ink hover:text-accent transition-colors shrink-0 cursor-pointer"
        title="Open Commodity & Currency Desk"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
        <span className="text-[10px]">WIRE TAPE</span>
      </button>

      {/* Scrolling / Swipeable Ticker Items */}
      <div
        data-lenis-prevent="true"
        className="flex-1 flex items-center overflow-x-auto no-scrollbar divide-x divide-paper-border/60 px-1"
      >
        {marketTickers.map((t) => {
          const isPositive = t.change_pct >= 0;
          return (
            <button
              key={t.symbol}
              type="button"
              onClick={handleOpenMarketsDesk}
              className="flex items-center gap-1.5 px-2.5 h-full whitespace-nowrap hover:bg-paper transition-colors cursor-pointer shrink-0"
              title={`${t.name} (${t.unit}) — Click to open Markets War Room`}
            >
              <span className="font-bold text-ink">{t.symbol}</span>
              <span className="tabular-nums text-ink-secondary">
                {t.price >= 100 ? t.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : t.price.toFixed(t.price < 10 ? 4 : 2)}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums ${
                  isPositive ? 'text-positive' : 'text-accent'
                }`}
              >
                {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {isPositive ? '+' : ''}
                {t.change_pct.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Right Micro Controls: Refresh & Hide */}
      <div className="flex items-center h-full border-l border-paper-border bg-paper shrink-0">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            fetchMarketTickers(true);
          }}
          className="h-full px-2 text-ink-muted hover:text-ink transition-colors cursor-pointer"
          title="Tick Live Market Quotes"
          aria-label="Refresh Market Quotes"
        >
          <RefreshCw size={11} />
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('selection');
            toggleMastheadTicker();
          }}
          className="h-full px-1.5 text-ink-muted hover:text-accent transition-colors border-l border-paper-border cursor-pointer"
          title="Hide Masthead Ticker Tape"
          aria-label="Hide Ticker Tape"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
};

export default MastheadMarketTicker;
