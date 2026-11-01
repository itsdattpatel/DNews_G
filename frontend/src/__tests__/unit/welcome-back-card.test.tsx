import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WelcomeBackCard } from '../../components/article/WelcomeBackCard';

describe('WelcomeBackCard Component (PRD A Category 1B)', () => {
  beforeEach(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  it('renders nothing when downtime was less than 5 minutes', () => {
    const html = renderToStaticMarkup(
      <WelcomeBackCard initialMissedMinutes={3} initialArticlesCount={5} />
    );
    expect(html).toBe('');
  });

  it('renders nothing when zero articles arrived', () => {
    const html = renderToStaticMarkup(
      <WelcomeBackCard initialMissedMinutes={42} initialArticlesCount={0} />
    );
    expect(html).toBe('');
  });

  it('renders broadsheet welcome back card when downtime >= 5m and articles arrived', () => {
    const html = renderToStaticMarkup(
      <WelcomeBackCard initialMissedMinutes={42} initialArticlesCount={18} />
    );

    expect(html).toContain('Welcome back.');
    expect(html).toContain('During the 42-minute break');
    expect(html).toContain('18 new dispatches');
    expect(html).toContain('42m hiatus resolved');
    expect(html).toContain('Desk Reconnected');
    expect(html).toContain('data-testid="welcome-back-card"');
  });

  it('includes view dispatches button when callback is provided', () => {
    const html = renderToStaticMarkup(
      <WelcomeBackCard
        initialMissedMinutes={30}
        initialArticlesCount={10}
        onViewDispatches={() => {}}
      />
    );

    expect(html).toContain('View latest wire dispatches');
  });
});
