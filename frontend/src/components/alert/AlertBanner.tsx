/**
 * frontend/src/components/alert/AlertBanner.tsx
 * Top-sliding notification banner stack for breaking dispatches and AI provider switches (P6-06, P6-08).
 * Supports 30s auto-dismiss, deeplink to view story/cluster, and dismiss actions.
 */
import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { formatExactLocal } from '../../utils/dateFormatter';
import './AlertBanner.css';

export const AlertBanner: React.FC = () => {
  const alerts = useAppStore((s) => s.alerts);
  const dismissAlert = useAppStore((s) => s.dismissAlert);
  const selectArticleById = useAppStore((s) => s.selectArticleById);
  const setSelectedCountry = useAppStore((s) => s.setSelectedCountry);

  if (alerts.length === 0) return null;

  const handleViewStory = async (articleId?: number, clusterId?: number) => {
    if (articleId) {
      await selectArticleById(articleId);
    } else if (clusterId) {
      // Clear country filter to view the cross-country cluster story
      setSelectedCountry(null);
    }
  };

  return (
    <div id="alert-banner-stack" role="region" aria-label="System notifications stack">
      {alerts.map((alert) => {
        const isBreaking = alert.type === 'breaking';
        const isSwitch = alert.type === 'provider_switch';
        const isWarning = alert.type === 'warning';
        const canDeeplink = Boolean(alert.article_id || alert.cluster_id);

        return (
          <div
            key={alert.id}
            id={`alert-banner-${alert.id}`}
            className={`alert-banner-item ${alert.type}`}
            role="alert"
          >
            <div className="alert-banner-content-row">
              <div className="alert-banner-main">
                <div className="alert-banner-icon-wrap">
                  {isBreaking && (
                    /* Custom procedural breaking dispatch fire emblem */
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-danger, #ef4444)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                    </svg>
                  )}
                  {isSwitch && (
                    /* Custom procedural dual-cog synchronization emblem */
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-warning, #f59e0b)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                  )}
                  {(isWarning || (!isBreaking && !isSwitch)) && (
                    /* Custom procedural alert triangle emblem */
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-warning, #f59e0b)" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  )}
                </div>

                <div className="alert-banner-text-wrap">
                  <p className="alert-banner-message">{alert.message}</p>
                  <div className="alert-banner-meta">
                    <span title={formatExactLocal(alert.timestamp)} className="cursor-help">
                      {alert.timestamp}
                    </span>
                    {alert.breaking_score !== undefined && (
                      <span>• Score: {alert.breaking_score}%</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="alert-banner-close-btn"
                onClick={() => dismissAlert(alert.id)}
                aria-label="Dismiss alert"
                title="Dismiss"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Bottom action controls */}
            <div className="alert-banner-actions">
              <button
                type="button"
                className="alert-banner-btn-dismiss"
                onClick={() => dismissAlert(alert.id)}
              >
                Dismiss
              </button>
              {canDeeplink && (
                <button
                  type="button"
                  className="alert-banner-btn-action"
                  onClick={() => {
                    handleViewStory(alert.article_id, alert.cluster_id);
                    dismissAlert(alert.id);
                  }}
                >
                  View Story
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
