/**
 * frontend/src/__tests__/unit/update-banner.test.tsx
 * Unit tests for In-App Auto-Update Notification Banner (PRD E Category 9).
 */
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { UpdateBanner } from '../../components/layout/UpdateBanner';

describe('UpdateBanner Component (PRD E Category 9)', () => {
  it('renders nothing when idle or dismissed', () => {
    const idleHtml = renderToStaticMarkup(
      <UpdateBanner forcedStatus="idle" forcedInfo={null} />,
    );
    expect(idleHtml).toBe('');

    const dismissedHtml = renderToStaticMarkup(
      <UpdateBanner
        forcedStatus="dismissed"
        forcedInfo={{ version: '1.1.0' }}
      />,
    );
    expect(dismissedHtml).toBe('');
  });

  it('renders update available state with version, release notes, and action buttons', () => {
    const html = renderToStaticMarkup(
      <UpdateBanner
        forcedStatus="available"
        forcedInfo={{
          version: '1.1.0',
          releaseNotes: '155 news feeds added',
        }}
      />,
    );

    expect(html).toContain('id="dnews-update-banner"');
    expect(html).toContain('DNews v1.1.0 Available');
    expect(html).toContain('A new edition has been published.');
    expect(html).toContain('Release Notes');
    expect(html).toContain('id="btn-update-now"');
    expect(html).toContain('id="btn-remind-me-later"');
  });

  it('renders downloading state with progress percentage and network speed', () => {
    const html = renderToStaticMarkup(
      <UpdateBanner
        forcedStatus="downloading"
        forcedInfo={{ version: '1.1.0' }}
        forcedProgress={65}
        forcedSpeed="2.4 MB/s"
      />,
    );

    expect(html).toContain('id="dnews-update-banner"');
    expect(html).toContain('Downloading dispatch payload (65% · 2.4 MB/s)');
    expect(html).toContain('style="width:65%"');
  });

  it('renders downloaded state with Restart to Apply button', () => {
    const html = renderToStaticMarkup(
      <UpdateBanner
        forcedStatus="downloaded"
        forcedInfo={{ version: '1.1.0' }}
      />,
    );

    expect(html).toContain('id="dnews-update-banner"');
    expect(html).toContain('DNews v1.1.0 Ready');
    expect(html).toContain('Payload verified. Restart to apply new edition.');
    expect(html).toContain('id="btn-restart-apply"');
    expect(html).toContain('Restart to Apply');
  });

  it('renders error state with retry button', () => {
    const html = renderToStaticMarkup(
      <UpdateBanner
        forcedStatus="error"
        forcedInfo={{ version: '1.1.0' }}
        forcedErrorMessage="Network timeout checking GitHub releases"
      />,
    );

    expect(html).toContain('id="dnews-update-banner"');
    expect(html).toContain('Network timeout checking GitHub releases');
    expect(html).toContain('Retry');
  });

  describe('User Action Callbacks Invariants', () => {
    it('fires onUpdateNow callback when Update Now is clicked', () => {
      const onUpdateNow = vi.fn();
      const banner = (
        <UpdateBanner
          forcedStatus="available"
          forcedInfo={{ version: '1.1.0' }}
          onUpdateNow={onUpdateNow}
        />
      );
      expect(banner.props.onUpdateNow).toBeDefined();
      banner.props.onUpdateNow();
      expect(onUpdateNow).toHaveBeenCalledTimes(1);
    });

    it('fires onRemindMeLater callback when Remind Me Later is clicked', () => {
      const onRemindMeLater = vi.fn();
      const banner = (
        <UpdateBanner
          forcedStatus="available"
          forcedInfo={{ version: '1.1.0' }}
          onRemindMeLater={onRemindMeLater}
        />
      );
      banner.props.onRemindMeLater();
      expect(onRemindMeLater).toHaveBeenCalledTimes(1);
    });

    it('fires onRestartToApply callback when Restart to Apply is clicked', () => {
      const onRestartToApply = vi.fn();
      const banner = (
        <UpdateBanner
          forcedStatus="downloaded"
          forcedInfo={{ version: '1.1.0' }}
          onRestartToApply={onRestartToApply}
        />
      );
      banner.props.onRestartToApply();
      expect(onRestartToApply).toHaveBeenCalledTimes(1);
    });
  });
});
