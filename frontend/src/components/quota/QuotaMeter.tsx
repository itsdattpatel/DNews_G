/**
 * frontend/src/components/quota/QuotaMeter.tsx
 * Visual quota and provider usage meter per provider in the fallback chain (P6-07).
 * Live-updates in real-time on SSE `quota_update` events.
 */
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import './QuotaMeter.css';

export const QuotaMeter: React.FC = () => {
  const quota = useAppStore((s) => s.quota);
  const currentProvider = useAppStore((s) => s.currentProvider);

  if (!quota) {
    return (
      <div className="quota-meter-container" id="quota-meter-loading">
        <div className="quota-meter-loading">Connecting to quota monitor...</div>
      </div>
    );
  }

  const providers = Object.entries(quota.providers);
  if (providers.length === 0) {
    return (
      <div className="quota-meter-container" id="quota-meter-empty">
        <div className="quota-meter-empty">No provider activity logged today.</div>
      </div>
    );
  }

  // Calculate highest call count for relative percentage scaling
  const maxCalls = Math.max(...providers.map(([, p]) => p.calls_today), 10);

  return (
    <div className="quota-meter-container" id="quota-meter-panel">
      <div className="quota-meter-header">
        <div className="quota-meter-title-wrap">
          {/* Custom SVG telemetry gauge */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
          </svg>
          <span className="quota-meter-title">AI Quota Telemetry</span>
        </div>
        <div className="quota-meter-badge-active" title="Primary dispatch provider">
          <span className="quota-meter-pulse-dot" />
          <span>{currentProvider}</span>
        </div>
      </div>

      <div className="quota-meter-list">
        {providers.map(([providerName, stats]) => {
          const isActive = providerName === currentProvider;
          const percentage = Math.min(Math.round((stats.calls_today / maxCalls) * 100), 100);

          return (
            <div key={providerName} className="quota-meter-row" id={`quota-row-${providerName}`}>
              <div className="quota-meter-row-header">
                <span className={`quota-meter-provider-name ${isActive ? 'is-active' : ''}`}>
                  {providerName} {isActive ? '• Active' : ''}
                </span>
                <span className="quota-meter-stats">
                  {stats.calls_today} calls ({stats.tokens_today.toLocaleString()} tok)
                  {stats.errors_today > 0 ? ` • ${stats.errors_today} err` : ''}
                </span>
              </div>
              <div className="quota-meter-bar-track">
                <div
                  className={`quota-meter-bar-fill ${providerName}`}
                  style={{ width: `${Math.max(percentage, 4)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

