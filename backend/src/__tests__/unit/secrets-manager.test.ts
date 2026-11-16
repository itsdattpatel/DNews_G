/**
 * backend/src/__tests__/unit/secrets-manager.test.ts
 * Unit tests for In-App Secrets Manager (PRD E Category 11).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { app } from '../../app';
import {
  maskApiKey,
  saveProviderKeys,
  loadUserEnvIntoProcess,
  getProviderKeyStatuses,
  PROVIDER_ENV_MAP,
} from '../../services/secretsManager';

describe('In-App Secrets Manager (PRD E Category 11)', () => {
  const testDir = path.resolve(__dirname, '../../../../scratch/test-secrets');
  const testEnvPath = path.join(testDir, 'user.env');

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    process.env['USER_ENV_PATH'] = testEnvPath;
    if (fs.existsSync(testEnvPath)) {
      fs.unlinkSync(testEnvPath);
    }

    // Clear test keys from environment
    for (const envVar of Object.values(PROVIDER_ENV_MAP)) {
      delete process.env[envVar];
    }
  });

  afterEach(() => {
    delete process.env['USER_ENV_PATH'];
    for (const envVar of Object.values(PROVIDER_ENV_MAP)) {
      delete process.env[envVar];
    }
    if (fs.existsSync(testEnvPath)) {
      fs.unlinkSync(testEnvPath);
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Key Masking Security', () => {
    it('masks secret keys keeping only first 4 and last 2 characters', () => {
      const masked = maskApiKey('AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz12');
      expect(masked).toBe('AIza••••••••••••••••12');
      expect(masked).not.toContain('AbCdEfGh');
    });

    it('returns empty string for missing, short, or placeholder values', () => {
      expect(maskApiKey(undefined)).toBe('');
      expect(maskApiKey('')).toBe('');
      expect(maskApiKey('short')).toBe('');
      expect(maskApiKey('your_gemini_api_key_here')).toBe('');
      expect(maskApiKey('placeholder_key_val')).toBe('');
    });
  });

  describe('Persistence to user.env & Environment Synchronization', () => {
    it('saves keys to user.env and updates process.env in memory', () => {
      expect(fs.existsSync(testEnvPath)).toBe(false);

      const updated = saveProviderKeys({
        gemini: 'AIzaSyTestKeyForGemini01',
        groq: 'gsk_TestKeyForGroqCloud02',
      });

      expect(updated).toEqual(['gemini', 'groq']);
      expect(fs.existsSync(testEnvPath)).toBe(true);

      const savedContent = fs.readFileSync(testEnvPath, 'utf-8');
      expect(savedContent).toContain('GEMINI_API_KEY=AIzaSyTestKeyForGemini01');
      expect(savedContent).toContain('GROQ_API_KEY=gsk_TestKeyForGroqCloud02');

      // Verified immediately in process.env without requiring application restart
      expect(process.env['GEMINI_API_KEY']).toBe('AIzaSyTestKeyForGemini01');
      expect(process.env['GROQ_API_KEY']).toBe('gsk_TestKeyForGroqCloud02');
    });

    it('loads existing user.env file into process.env on startup', () => {
      fs.writeFileSync(
        testEnvPath,
        '# Pre-existing secrets\nMISTRAL_API_KEY=mis_PreExistingKey99\nCEREBRAS_API_KEY=csk_PreExistingKey88\n',
        'utf-8',
      );

      expect(process.env['MISTRAL_API_KEY']).toBeUndefined();
      expect(process.env['CEREBRAS_API_KEY']).toBeUndefined();

      loadUserEnvIntoProcess();

      expect(process.env['MISTRAL_API_KEY']).toBe('mis_PreExistingKey99');
      expect(process.env['CEREBRAS_API_KEY']).toBe('csk_PreExistingKey88');
    });

    it('reports accurate configured status and masked keys for all 4 providers', () => {
      process.env['GEMINI_API_KEY'] = 'AIzaSyVerifiedKey11';
      process.env['GROQ_API_KEY'] = 'your_groq_api_key_here'; // Placeholder should count as unconfigured

      const statuses = getProviderKeyStatuses();

      expect(statuses.gemini.is_configured).toBe(true);
      expect(statuses.gemini.masked_key).toBe('AIza••••••••••••••••11');

      expect(statuses.groq.is_configured).toBe(false);
      expect(statuses.groq.masked_key).toBe('');

      expect(statuses.mistral.is_configured).toBe(false);
      expect(statuses.cerebras.is_configured).toBe(false);
    });
  });

  describe('HTTP API Endpoints (/api/settings/keys)', () => {
    it('GET /api/settings/keys returns provider status without leaking raw keys', async () => {
      process.env['GEMINI_API_KEY'] = 'AIzaSySecretRawKey99';

      const res = await request(app).get('/api/settings/keys');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.providers.gemini.is_configured).toBe(true);
      expect(res.body.providers.gemini.masked_key).toContain('AIza••••••••••••••••99');

      // CRITICAL SECURITY INVARIANT: raw key MUST NEVER appear anywhere in response JSON
      const rawBody = JSON.stringify(res.body);
      expect(rawBody).not.toContain('AIzaSySecretRawKey99');
    });

    it('POST /api/settings/keys updates keys and returns updated status', async () => {
      const res = await request(app)
        .post('/api/settings/keys')
        .send({
          keys: {
            mistral: 'mis_NewKeyViaApiEndpoint55',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.updated).toContain('mistral');
      expect(res.body.providers.mistral.is_configured).toBe(true);
      expect(process.env['MISTRAL_API_KEY']).toBe('mis_NewKeyViaApiEndpoint55');
    });

    it('POST /api/settings/keys/test validates missing key gracefully', async () => {
      const res = await request(app)
        .post('/api/settings/keys/test')
        .send({
          provider: 'groq',
          key: '',
        });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.message).toContain('missing');
    });
  });
});
