/**
 * frontend/src/utils/confirmation.ts
 * Multi-source story corroboration and confirmation label evaluator (PRD A Category 9).
 * Operates purely deterministically from cluster data without any AI API dependency (Plain Mode compatible).
 */
import type { ConfirmationStatus, ConfirmationTier, Article, ArticleListItem, ArticleFull } from '../types';

export interface ConfirmationParams {
  outletCount?: number | null;
  countryCount?: number | null;
  breakingScore?: number | null;
  isBreakingCluster?: boolean | null;
}

/**
 * Computes corroboration depth and breaking alert upgrade status.
 *
 * Rules:
 *  - 1 outlet: "Single source" (neutral ink badge)
 *  - 2 outlets: "2 outlets" (slate badge)
 *  - 3+ outlets across 2+ nations: "Confirmed: N outlets in M countries" (forest green broadsheet stamp)
 *  - 3+ outlets in 1 nation: "N outlets" (slate badge)
 *
 * Breaking Alert Upgrades:
 *  - Single-outlet / < 3 outlets / < 2 countries: "Unconfirmed Breaking" (muted ochre)
 *  - Corroborated (3+ outlets across 2+ nations): automatically upgrades to "Confirmed Breaking" (bold crimson)
 */
export function computeConfirmationStatus(params: ConfirmationParams): ConfirmationStatus {
  const outlets = Math.max(1, params.outletCount ?? 1);
  const countries = Math.max(1, params.countryCount ?? 1);
  const isBreaking = Boolean(
    (params.breakingScore !== undefined && params.breakingScore !== null && params.breakingScore >= 75) ||
    params.isBreakingCluster
  );

  let tier: ConfirmationTier = 'single_source';
  let label = 'Single source';
  let isConfirmed = false;

  if (outlets >= 3 && countries >= 2) {
    tier = 'confirmed';
    label = `Confirmed: ${outlets} outlets in ${countries} countries`;
    isConfirmed = true;
  } else if (outlets === 2) {
    tier = 'two_outlets';
    label = '2 outlets';
  } else if (outlets >= 3 && countries === 1) {
    tier = 'multi_outlet_single_nation';
    label = `${outlets} outlets`;
  } else {
    tier = 'single_source';
    label = 'Single source';
  }

  const breakingLabel = isBreaking
    ? isConfirmed
      ? 'Confirmed Breaking'
      : 'Unconfirmed Breaking'
    : undefined;

  return {
    tier,
    label,
    outletCount: outlets,
    countryCount: countries,
    isConfirmed,
    isBreaking,
    breakingLabel,
  };
}

/**
 * Resolves ConfirmationStatus directly from an Article, ArticleListItem, or ArticleFull.
 * Uses existing backend-computed `confirmation` if present, or derives from cluster properties.
 */
export function getArticleConfirmation(
  article: Partial<Article | ArticleListItem | ArticleFull>
): ConfirmationStatus {
  if (article.confirmation) {
    return article.confirmation;
  }

  return computeConfirmationStatus({
    outletCount: article.cluster_outlet_count,
    countryCount: article.cluster_country_count,
    breakingScore: article.breaking_score,
    isBreakingCluster: article.cluster_is_breaking,
  });
}

