/**
 * frontend/src/components/quota/ProviderBadge.tsx
 * Status badge showing active AI model provider with color-coded health indicators.
 */
import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const ProviderBadge: React.FC = () => {
  const currentProvider = useAppStore((s) => s.currentProvider);
  const quota = useAppStore((s) => s.quota);
  const isPlainMode = useAppStore((s) => s.settings.plain_mode_enabled ?? false);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  if (isPlainMode) {
    return (
      <div
        onClick={() => setSettingsOpen(true)}
        title="Plain Mode Active (Zero AI): All external AI calls bypassed. Dispatches ingested raw with zero quota usage. Click to manage settings."
        id="provider-badge"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs border border-paper-border bg-paper-alt hover:border-ink font-mono text-[0.6875rem] font-bold text-ink-secondary hover:text-ink cursor-pointer transition-colors shadow-xs"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-ink-muted inline-block" />
        <span className="tracking-wider uppercase">PLAIN MODE (ZERO AI)</span>
      </div>
    );
  }

  const getStatusColor = (provider: string) => {
    switch (provider) {
      case 'gemini':
        return '#22c55e'; // Green - Primary
      case 'groq':
        return '#f59e0b'; // Amber - Fallback 1
      case 'mistral':
        return '#f97316'; // Orange - Fallback 2
      case 'cerebras':
        return '#ec4899'; // Pink - Fallback 3
      default:
        return '#ef4444'; // Red
    }
  };

  const statusColor = getStatusColor(currentProvider);
  const stats = quota?.providers[currentProvider];

  return (
    <div
      onClick={() => setSettingsOpen(true)}
      title={`Active AI Provider: ${currentProvider.toUpperCase()} (${stats?.calls_today ?? 0} calls today). Click to open Quota settings.`}
      id="provider-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 12px',
        borderRadius: '9999px',
        background: 'rgba(17, 24, 39, 0.8)',
        border: `1px solid ${statusColor}44`,
        fontSize: '0.78rem',
        fontWeight: 600,
        letterSpacing: '0.05em',
        color: '#f8fafc',
        cursor: 'pointer',
        boxShadow: `0 0 12px ${statusColor}22`,
        transition: 'all 0.2s ease',
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          boxShadow: `0 0 8px ${statusColor}`,
          display: 'inline-block',
        }}
      />
      <span style={{ textTransform: 'uppercase' }}>{currentProvider}</span>
      {stats && (
        <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 500 }}>
          ({stats.calls_today})
        </span>
      )}
    </div>
  );
};
