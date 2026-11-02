/**
 * backend/src/utils/confirmation.ts
 * Multi-source story corroboration and confirmation label evaluator (PRD A Category 9).
 * Evaluates article clusters strictly and deterministically without AI API dependencies (Plain Mode compatible).
 */

export type ConfirmationTier = 'single_source' | 'two_outlets' | 'multi_outlet_single_nation' | 'confirmed';

export interface ConfirmationStatus {
  tier: ConfirmationTier;
  label: string; // "Single source" | "2 outlets" | "N outlets" | "Confirmed: N outlets in M countries"
  outletCount: number;
  countryCount: number;
  isConfirmed: boolean; // true when outlets >= 3 && countries >= 2
  isBreaking: boolean;
  breakingLabel?: 'Unconfirmed Breaking' | 'Confirmed Breaking' | undefined;
}

export interface ConfirmationParams {
  outletCount?: number | null | undefined;
  countryCount?: number | null | undefined;
  breakingScore?: number | null | undefined;
  isBreakingCluster?: boolean | number | null | undefined;
}

/**
 * Computes corroboration depth and breaking alert upgrade status.
 * Deterministic: 1 outlet -> Single source
 *                2 outlets -> 2 outlets
 *                >= 3 outlets in 1 country -> N outlets
 *                >= 3 outlets in >= 2 countries -> Confirmed: N outlets in M countries
 * Breaking upgrade: Unconfirmed Breaking (< 3 outlets or < 2 countries) -> Confirmed Breaking (>= 3 outlets in >= 2 countries)
 */
export function computeConfirmationStatus(params: ConfirmationParams): ConfirmationStatus {
  const outlets = Math.max(1, params.outletCount ?? 1);
  const countries = Math.max(1, params.countryCount ?? 1);
  const isBreaking = Boolean(
    (params.breakingScore !== undefined && params.breakingScore !== null && params.breakingScore >= 75) ||
    Boolean(params.isBreakingCluster)
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

