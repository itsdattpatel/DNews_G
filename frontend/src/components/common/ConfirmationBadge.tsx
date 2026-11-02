/**
 * frontend/src/components/common/ConfirmationBadge.tsx
 * Broadsheet ink-stamp confirmation and corroboration badge (PRD A Category 9).
 * Renders:
 *  - 1 outlet: "Single source" (neutral ink badge)
 *  - 2 outlets: "2 outlets" (slate badge)
 *  - 3+ outlets across 2+ nations: "Confirmed: N outlets in M countries" (forest green broadsheet stamp)
 *  - Breaking story upgrade: "Unconfirmed Breaking" (muted ochre) -> "Confirmed Breaking" (bold crimson)
 */
import React from 'react';
import type { Article, ArticleListItem, ArticleFull, Cluster, ConfirmationStatus } from '../../types';
import { computeConfirmationStatus, getArticleConfirmation } from '../../utils/confirmation';
import { CheckCheck, Layers, Radio, Flame, AlertTriangle } from 'lucide-react';

export interface ConfirmationBadgeProps {
  article?: Partial<Article | ArticleListItem | ArticleFull>;
  cluster?: Partial<Cluster>;
  confirmation?: ConfirmationStatus;
  outletCount?: number;
  countryCount?: number;
  breakingScore?: number;
  isBreakingCluster?: boolean;
  showBreakingUpgrade?: boolean;
  variant?: 'default' | 'compact' | 'stamp-only';
  className?: string;
}

export const ConfirmationBadge: React.FC<ConfirmationBadgeProps> = ({
  article,
  cluster,
  confirmation: explicitConfirmation,
  outletCount,
  countryCount,
  breakingScore,
  isBreakingCluster,
  showBreakingUpgrade = true,
  variant = 'default',
  className = '',
}) => {
  // Resolve confirmation status from props
  const status: ConfirmationStatus = React.useMemo(() => {
    if (explicitConfirmation) return explicitConfirmation;
    if (article) return getArticleConfirmation(article);
    if (cluster) {
      if (cluster.confirmation) return cluster.confirmation;
      return computeConfirmationStatus({
        outletCount: cluster.outlet_count,
        countryCount: cluster.country_count,
        isBreakingCluster: cluster.is_breaking,
      });
    }
    return computeConfirmationStatus({
      outletCount,
      countryCount,
      breakingScore,
      isBreakingCluster,
    });
  }, [explicitConfirmation, article, cluster, outletCount, countryCount, breakingScore, isBreakingCluster]);

  const isCompact = variant === 'compact';
  const showBreakingBadge = showBreakingUpgrade && status.isBreaking && Boolean(status.breakingLabel);

  // Styles per corroboration tier (broadsheet design tokens)
  let badgeStyle = 'border-paper-border bg-paper-alt text-ink-secondary';
  let badgeIcon = <Radio size={isCompact ? 9 : 11} className="shrink-0 text-ink-muted" />;

  if (status.tier === 'confirmed') {
    // Forest green broadsheet stamp
    badgeStyle =
      'border-emerald-700/50 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300 dark:border-emerald-500/40 font-bold';
    badgeIcon = <CheckCheck size={isCompact ? 10 : 12} className="shrink-0 text-emerald-700 dark:text-emerald-400" />;
  } else if (status.tier === 'two_outlets' || status.tier === 'multi_outlet_single_nation') {
    // Slate badge
    badgeStyle =
      'border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300 dark:border-slate-500/40 font-medium';
    badgeIcon = <Layers size={isCompact ? 9 : 11} className="shrink-0 text-slate-500 dark:text-slate-400" />;
  }

  // Label text formatting
  const displayText = isCompact && status.tier === 'confirmed'
    ? `${status.outletCount} outlets (${status.countryCount} nations)`
    : status.label;

  return (
    <div
      data-testid="confirmation-badge-container"
      className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}
    >
      {/* 1. Breaking News Confirmation Upgrade Tag */}
      {showBreakingBadge && variant !== 'stamp-only' && (
        <span
          data-testid="breaking-confirmation-tag"
          title={
            status.isConfirmed
              ? 'Confirmed Breaking: Corroborated by independent news agencies across multiple nations'
              : 'Unconfirmed Breaking: Single-source dispatch pending multi-outlet confirmation'
          }
          className={`inline-flex items-center gap-1 rounded-xs font-mono uppercase tracking-wider transition-all select-none ${
            isCompact ? 'text-[0.5625rem] px-1 py-0.2' : 'text-[0.625rem] px-1.5 py-0.5'
          } ${
            status.isConfirmed
              ? 'border border-accent bg-accent/10 text-accent font-extrabold shadow-xs'
              : 'border border-amber-600/50 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold'
          }`}
        >
          {status.isConfirmed ? (
            <Flame size={isCompact ? 9 : 11} fill="currentColor" className="shrink-0 text-accent" />
          ) : (
            <AlertTriangle size={isCompact ? 9 : 11} className="shrink-0 text-amber-700 dark:text-amber-400" />
          )}
          <span>{status.breakingLabel}</span>
        </span>
      )}

      {/* 2. Corroboration Depth Badge */}
      <span
        data-testid="corroboration-depth-stamp"
        title={`Corroboration: ${status.outletCount} outlet${status.outletCount > 1 ? 's' : ''} in ${status.countryCount} countr${status.countryCount > 1 ? 'ies' : 'y'}`}
        className={`inline-flex items-center gap-1 rounded-xs border uppercase tracking-wider transition-colors select-none ${
          isCompact ? 'font-mono text-[0.5625rem] px-1.5 py-0.2' : 'font-ui text-[0.625rem] px-2 py-0.5'
        } ${badgeStyle}`}
      >
        {badgeIcon}
        <span>{displayText}</span>
      </span>
    </div>
  );
};
