/**
 * frontend/src/components/settings/SecretsManagerSection.tsx
 * In-App Secrets Manager (PRD E Category 11).
 * Allows users to view configuration status, input, test, and save
 * AI provider API keys directly into %APPDATA%\DNews\user.env without editing text files.
 */
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, X, RefreshCw, Key, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export type ProviderName = 'gemini' | 'groq' | 'mistral' | 'cerebras';

interface ProviderConfig {
  name: ProviderName;
  label: string;
  portalUrl: string;
  placeholder: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    name: 'gemini',
    label: 'Google Gemini',
    portalUrl: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AIzaSy...',
  },
  {
    name: 'groq',
    label: 'Groq Cloud',
    portalUrl: 'https://console.groq.com/keys',
    placeholder: 'gsk_...',
  },
  {
    name: 'mistral',
    label: 'Mistral AI',
    portalUrl: 'https://console.mistral.ai/api-keys/',
    placeholder: 'mis_...',
  },
  {
    name: 'cerebras',
    label: 'Cerebras Cloud',
    portalUrl: 'https://cloud.cerebras.ai/',
    placeholder: 'csk_...',
  },
];

interface ProviderStatus {
  is_configured: boolean;
  masked_key: string;
}

export const SecretsManagerSection: React.FC = () => {
  const [statuses, setStatuses] = useState<Record<ProviderName, ProviderStatus>>({
    gemini: { is_configured: false, masked_key: '' },
    groq: { is_configured: false, masked_key: '' },
    mistral: { is_configured: false, masked_key: '' },
    cerebras: { is_configured: false, masked_key: '' },
  });

  const [inputValues, setInputValues] = useState<Record<ProviderName, string>>({
    gemini: '',
    groq: '',
    mistral: '',
    cerebras: '',
  });

  const [showKey, setShowKey] = useState<Record<ProviderName, boolean>>({
    gemini: false,
    groq: false,
    mistral: false,
    cerebras: false,
  });

  const [testResults, setTestResults] = useState<
    Record<ProviderName, { testing: boolean; valid?: boolean; message?: string }>
  >({
    gemini: { testing: false },
    groq: { testing: false },
    mistral: { testing: false },
    cerebras: { testing: false },
  });

  const [isSaving, setIsSaving] = useState(false);

  // Fetch current provider key statuses
  const fetchKeyStatuses = async () => {
    try {
      const res = await fetch('/api/settings/keys');
      if (res.ok) {
        const data = await res.json();
        if (data.providers) {
          setStatuses(data.providers);
        }
      }
    } catch {
      // offline or server not ready
    }
  };

  useEffect(() => {
    void fetchKeyStatuses();
  }, []);

  const handleTestKey = async (provider: ProviderName) => {
    setTestResults((prev) => ({
      ...prev,
      [provider]: { testing: true },
    }));

    try {
      const rawKey = inputValues[provider].trim();
      const res = await fetch('/api/settings/keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          key: rawKey || undefined,
        }),
      });

      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [provider]: {
          testing: false,
          valid: data.valid ?? false,
          message: data.message ?? (data.valid ? 'Valid key' : 'Invalid key'),
        },
      }));

      if (data.valid) {
        toast.success(`${provider.toUpperCase()} key verified successfully.`);
      } else {
        toast.error(`${provider.toUpperCase()} verification failed: ${data.message || 'Invalid key'}`);
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: {
          testing: false,
          valid: false,
          message: err.message || 'Network error',
        },
      }));
      toast.error(`Verification error: ${err.message}`);
    }
  };

  const handleSaveKeys = async () => {
    const keysToSave: Partial<Record<ProviderName, string>> = {};
    let hasKeys = false;

    for (const p of PROVIDERS) {
      const val = inputValues[p.name].trim();
      if (val) {
        keysToSave[p.name] = val;
        hasKeys = true;
      }
    }

    if (!hasKeys) {
      toast.info('No new API keys entered to save.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: keysToSave }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.providers) {
          setStatuses(data.providers);
        }
        // Clear input values now that they are saved and masked
        setInputValues({
          gemini: '',
          groq: '',
          mistral: '',
          cerebras: '',
        });
        toast.success(`Saved API keys for: ${data.updated.join(', ').toUpperCase()}`);
      } else {
        toast.error('Failed to save API keys.');
      }
    } catch (err: any) {
      toast.error(`Error saving keys: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="in-app-secrets-manager"
      className="p-4 bg-[var(--color-paper-card,#f4efe6)] border border-[var(--color-ink-border,#d1d5db)] rounded-xs space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-ink-border,#d1d5db)] pb-2">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-[#C0392B]" />
          <span className="font-serif font-bold text-sm">AI Provider API Keys</span>
        </div>
        <span className="text-[10px] font-mono text-[var(--color-ink-muted,#6b7280)]">
          Storage: %APPDATA%\DNews\user.env
        </span>
      </div>

      <div className="text-[11px] text-[var(--color-ink-muted,#6b7280)] font-sans">
        Configure personal API keys for world news summarization and triage. Keys are securely stored locally and never transmitted to any third-party servers.
      </div>

      {/* Provider List */}
      <div className="space-y-3 pt-1">
        {PROVIDERS.map((p) => {
          const status = statuses[p.name];
          const test = testResults[p.name];
          const isTesting = test.testing;
          const isShow = showKey[p.name];

          return (
            <div
              key={p.name}
              data-testid={`secret-row-${p.name}`}
              className="p-2.5 bg-[var(--color-paper,#fff)] border border-[var(--color-ink-border,#e5e7eb)] rounded-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-semibold text-xs text-[var(--color-ink,#111827)]">
                    {p.label}
                  </span>
                  {status?.is_configured ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-mono">
                      <Check className="w-3 h-3" />
                      {status.masked_key}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-sans">
                      Not Configured
                    </span>
                  )}
                </div>

                <a
                  href={p.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#C0392B] hover:underline"
                >
                  <span>Get Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Input + Action Buttons */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    id={`input-key-${p.name}`}
                    type={isShow ? 'text' : 'password'}
                    placeholder={status?.is_configured ? 'Enter new key to update...' : p.placeholder}
                    value={inputValues[p.name]}
                    onChange={(e) =>
                      setInputValues((prev) => ({ ...prev, [p.name]: e.target.value }))
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-[var(--color-ink-border,#d1d5db)] rounded-xs bg-[var(--color-paper,#fff)] text-[var(--color-ink,#111827)] focus:outline-none focus:border-[var(--color-ink,#111827)]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowKey((prev) => ({ ...prev, [p.name]: !prev[p.name] }))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted,#6b7280)] hover:text-[var(--color-ink,#111827)]"
                    title={isShow ? 'Hide Key' : 'Show Key'}
                  >
                    {isShow ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  id={`btn-test-${p.name}`}
                  type="button"
                  onClick={() => handleTestKey(p.name)}
                  disabled={isTesting || (!inputValues[p.name] && !status?.is_configured)}
                  className="px-2.5 py-1.5 text-xs font-serif border border-[var(--color-ink-border,#d1d5db)] hover:border-[var(--color-ink,#111827)] rounded-xs text-[var(--color-ink,#111827)] disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <span>Test</span>
                  )}
                </button>
              </div>

              {/* Verification Message */}
              {test.message && (
                <div
                  className={`text-[10px] font-mono flex items-center gap-1 ${
                    test.valid ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {test.valid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  <span>{test.message}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2 border-t border-[var(--color-ink-border,#d1d5db)]">
        <button
          id="btn-save-secrets"
          type="button"
          onClick={handleSaveKeys}
          disabled={isSaving}
          className="px-4 py-1.5 bg-[#C0392B] hover:bg-[#922B21] text-white font-serif font-medium text-xs rounded-xs shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving to user.env...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Save API Keys</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SecretsManagerSection;
