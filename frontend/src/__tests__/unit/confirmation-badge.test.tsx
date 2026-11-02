/**
 * frontend/src/__tests__/unit/confirmation-badge.test.tsx
 * Unit tests for ConfirmationBadge & Story Corroboration (PRD A Category 9).
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConfirmationBadge } from '../../components/common/ConfirmationBadge';
import { computeConfirmationStatus, getArticleConfirmation } from '../../utils/confirmation';
import type { Article } from '../../types';

describe('Story Corroboration & Confirmation Labels (PRD A Category 9)', () => {
  describe('computeConfirmationStatus & getArticleConfirmation', () => {
    it('evaluates single outlet as "Single source"', () => {
      const status = computeConfirmationStatus({ outletCount: 1, countryCount: 1 });
      expect(status.tier).toBe('single_source');
      expect(status.label).toBe('Single source');
      expect(status.isConfirmed).toBe(false);
      expect(status.breakingLabel).toBeUndefined();
    });

    it('evaluates 2 outlets as "2 outlets"', () => {
      const status = computeConfirmationStatus({ outletCount: 2, countryCount: 2 });
      expect(status.tier).toBe('two_outlets');
      expect(status.label).toBe('2 outlets');
      expect(status.isConfirmed).toBe(false);
    });

    it('evaluates 3+ outlets in 1 nation as "N outlets"', () => {
      const status = computeConfirmationStatus({ outletCount: 5, countryCount: 1 });
      expect(status.tier).toBe('multi_outlet_single_nation');
      expect(status.label).toBe('5 outlets');
      expect(status.isConfirmed).toBe(false);
    });

    it('evaluates 3+ outlets across 2+ nations as "Confirmed: N outlets in M countries"', () => {
      const status = computeConfirmationStatus({ outletCount: 4, countryCount: 3 });
      expect(status.tier).toBe('confirmed');
      expect(status.label).toBe('Confirmed: 4 outlets in 3 countries');
      expect(status.isConfirmed).toBe(true);
    });

    it('upgrades breaking dispatch from "Unconfirmed Breaking" to "Confirmed Breaking"', () => {
      const unconfirmed = computeConfirmationStatus({ outletCount: 1, countryCount: 1, breakingScore: 88 });
      expect(unconfirmed.isBreaking).toBe(true);
      expect(unconfirmed.isConfirmed).toBe(false);
      expect(unconfirmed.breakingLabel).toBe('Unconfirmed Breaking');

      const confirmed = computeConfirmationStatus({ outletCount: 3, countryCount: 2, breakingScore: 88 });
      expect(confirmed.isBreaking).toBe(true);
      expect(confirmed.isConfirmed).toBe(true);
      expect(confirmed.breakingLabel).toBe('Confirmed Breaking');
    });

    it('extracts confirmation from article object cleanly', () => {
      const mockArticle: Partial<Article> = {
        id: 1,
        breaking_score: 82,
        cluster_outlet_count: 4,
        cluster_country_count: 2,
      };
      const status = getArticleConfirmation(mockArticle);
      expect(status.isConfirmed).toBe(true);
      expect(status.label).toBe('Confirmed: 4 outlets in 2 countries');
      expect(status.breakingLabel).toBe('Confirmed Breaking');
    });
  });

  describe('<ConfirmationBadge /> Component Rendering', () => {
    it('renders "Single source" neutral ink badge', () => {
      const html = renderToStaticMarkup(
        <ConfirmationBadge outletCount={1} countryCount={1} />
      );
      expect(html).toContain('Single source');
      expect(html).toContain('border-paper-border');
    });

    it('renders "2 outlets" slate badge', () => {
      const html = renderToStaticMarkup(
        <ConfirmationBadge outletCount={2} countryCount={1} />
      );
      expect(html).toContain('2 outlets');
      expect(html).toContain('border-slate-500/40');
    });

    it('renders "Confirmed: N outlets in M countries" forest green broadsheet stamp', () => {
      const html = renderToStaticMarkup(
        <ConfirmationBadge outletCount={4} countryCount={3} />
      );
      expect(html).toContain('Confirmed: 4 outlets in 3 countries');
      expect(html).toContain('border-emerald-700/50');
      expect(html).toContain('text-emerald-800');
    });

    it('renders "Unconfirmed Breaking" amber tag on single source breaking story', () => {
      const html = renderToStaticMarkup(
        <ConfirmationBadge outletCount={1} countryCount={1} breakingScore={85} />
      );
      expect(html).toContain('Unconfirmed Breaking');
      expect(html).toContain('border-amber-600/50');
      expect(html).toContain('Single source');
    });

    it('renders "Confirmed Breaking" bold crimson tag on multi-nation corroborated breaking story', () => {
      const html = renderToStaticMarkup(
        <ConfirmationBadge outletCount={5} countryCount={3} breakingScore={90} />
      );
      expect(html).toContain('Confirmed Breaking');
      expect(html).toContain('text-accent');
      expect(html).toContain('Confirmed: 5 outlets in 3 countries');
    });

    it('renders compact format properly', () => {
      const html = renderToStaticMarkup(
        <ConfirmationBadge outletCount={3} countryCount={2} variant="compact" />
      );
      expect(html).toContain('3 outlets (2 nations)');
    });
  });
});
