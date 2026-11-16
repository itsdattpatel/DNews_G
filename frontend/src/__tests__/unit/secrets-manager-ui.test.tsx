/**
 * frontend/src/__tests__/unit/secrets-manager-ui.test.tsx
 * Unit tests for In-App Secrets Manager UI component (PRD E Category 11).
 */
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SecretsManagerSection } from '../../components/settings/SecretsManagerSection';

describe('SecretsManagerSection Component (PRD E Category 11)', () => {
  it('renders the Secrets Manager container and storage destination indicator', () => {
    const html = renderToStaticMarkup(<SecretsManagerSection />);

    expect(html).toContain('id="in-app-secrets-manager"');
    expect(html).toContain('AI Provider API Keys');
    expect(html).toContain('%APPDATA%\\DNews\\user.env');
  });

  it('renders all 4 supported AI providers with portals and masked status', () => {
    const html = renderToStaticMarkup(<SecretsManagerSection />);

    // 1. Google Gemini
    expect(html).toContain('Google Gemini');
    expect(html).toContain('https://aistudio.google.com/app/apikey');
    expect(html).toContain('id="input-key-gemini"');
    expect(html).toContain('id="btn-test-gemini"');

    // 2. Groq Cloud
    expect(html).toContain('Groq Cloud');
    expect(html).toContain('https://console.groq.com/keys');
    expect(html).toContain('id="input-key-groq"');
    expect(html).toContain('id="btn-test-groq"');

    // 3. Mistral AI
    expect(html).toContain('Mistral AI');
    expect(html).toContain('https://console.mistral.ai/api-keys/');
    expect(html).toContain('id="input-key-mistral"');
    expect(html).toContain('id="btn-test-mistral"');

    // 4. Cerebras Cloud
    expect(html).toContain('Cerebras Cloud');
    expect(html).toContain('https://cloud.cerebras.ai/');
    expect(html).toContain('id="input-key-cerebras"');
    expect(html).toContain('id="btn-test-cerebras"');
  });

  it('renders save button to write secrets directly to user.env', () => {
    const html = renderToStaticMarkup(<SecretsManagerSection />);

    expect(html).toContain('id="btn-save-secrets"');
    expect(html).toContain('Save API Keys');
  });
});
