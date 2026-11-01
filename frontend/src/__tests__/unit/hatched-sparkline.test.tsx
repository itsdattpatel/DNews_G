import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HatchedSparkline, SparklinePoint } from '../../components/common/HatchedSparkline';

describe('HatchedSparkline Component (PRD A Category 1B & 8)', () => {
  it('renders empty message when no data provided', () => {
    const html = renderToStaticMarkup(<HatchedSparkline data={[]} />);
    expect(html).toContain('No activity');
  });

  it('renders standard activity bars for normal operation', () => {
    const points: SparklinePoint[] = [
      { label: '10:00', value: 12 },
      { label: '11:00', value: 25 },
      { label: '12:00', value: 8 },
    ];

    const html = renderToStaticMarkup(<HatchedSparkline data={points} />);
    expect(html).toContain('12 articles at 10:00');
    expect(html).toContain('25 articles at 11:00');
    expect(html).toContain('8 articles at 12:00');
    expect(html).not.toContain('Downtime:');
  });

  it('renders hatched / diagonal-striped bar for downtime gap', () => {
    const points: SparklinePoint[] = [
      { label: '10:00', value: 20 },
      { label: '11:00', value: 0, isDowntime: true, downtimeMinutes: 45 },
      { label: '12:00', value: 15 },
    ];

    const html = renderToStaticMarkup(<HatchedSparkline data={points} />);
    expect(html).toContain('id="sparkline-downtime-hatch"');
    expect(html).toContain('fill="url(#sparkline-downtime-hatch)"');
    expect(html).toContain('Downtime: 45m gap (11:00)');
  });
});
