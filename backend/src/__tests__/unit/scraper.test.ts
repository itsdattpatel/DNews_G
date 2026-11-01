import { describe, it, expect } from 'vitest';
import { extractArticleFromHtml } from '../../fetch/scraper';

describe('Scraper & Readability (P2-04)', () => {
  it('extracts main article body and title while discarding scripts and boilerplate', () => {
    const sampleHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Record-Breaking Solar Flare Observed | TechNews</title>
        </head>
        <body>
          <nav><ul><li><a href="/">Home</a></li><li><a href="/login">Login</a></li></ul></nav>
          <article>
            <h1>Record-Breaking Solar Flare Observed</h1>
            <p class="byline">By Jane Doe, Science Correspondent</p>
            <p>Astronomers around the globe are monitoring an unprecedented solar flare released from active sunspot 3664.</p>
            <p>The coronal mass ejection is predicted to cause vibrant auroras visible as far south as the Mediterranean.</p>
          </article>
          <footer><p>&copy; 2026 TechNews. All rights reserved.</p></footer>
          <script>console.log("analytics");</script>
        </body>
      </html>
    `;

    const extracted = extractArticleFromHtml(sampleHtml, 'https://example.com/solar-flare');
    expect(extracted).not.toBeNull();
    expect(extracted?.title).toContain('Solar Flare');
    expect(extracted?.body).toContain('Astronomers around the globe');
    expect(extracted?.body).toContain('coronal mass ejection');
    expect(extracted?.body).not.toContain('analytics');
  });
});
