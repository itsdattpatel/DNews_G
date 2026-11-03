/**
 * frontend/src/library/mind/HelplinesModal.tsx
 * Official Crisis Helplines Registry & Mental Health Directory.
 * Non-negotiable safety notice per Rule B5.4.
 */
import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  X,
  ShieldAlert,
  ExternalLink,
  MessageSquare,
  Clock,
  CheckCircle,
} from 'lucide-react';

export interface HelplineEntry {
  id: number;
  country_code: 'IN' | 'US' | 'CN' | 'JP' | 'AU';
  country_name: string;
  org_name: string;
  service_phone: string;
  sms_text: string | null;
  website_url: string;
  hours_available: string;
  verified_date: string;
}

export interface HelplinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COUNTRY_TABS: { id: string; label: string; flag: string }[] = [
  { id: 'all', label: 'All Regions', flag: '🌐' },
  { id: 'IN', label: 'India', flag: '🇮🇳' },
  { id: 'US', label: 'United States', flag: '🇺🇸' },
  { id: 'CN', label: 'China', flag: '🇨🇳' },
  { id: 'JP', label: 'Japan', flag: '🇯🇵' },
  { id: 'AU', label: 'Australia', flag: '🇦🇺' },
];

export const HelplinesModal: React.FC<HelplinesModalProps> = ({ isOpen, onClose }) => {
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [helplines, setHelplines] = useState<HelplineEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function fetchHelplines() {
      setLoading(true);
      try {
        const url = selectedCountry !== 'all'
          ? `/api/library/mind/helplines?country=${encodeURIComponent(selectedCountry)}`
          : '/api/library/mind/helplines';
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (isMounted && data.helplines) {
          setHelplines(data.helplines);
        }
      } catch (err) {
        console.error('[HelplinesModal] Failed to load helplines:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchHelplines();
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedCountry]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="helplines-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface-elevated)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--lib-border)] bg-[var(--lib-surface)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--lib-accent-soft)] text-[var(--lib-accent)] border border-[var(--lib-border)]">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="helplines-modal-title"
                className="font-serif text-lg font-medium text-[var(--lib-ink)]"
              >
                Verified Crisis Support & Helplines
              </h3>
              <p className="text-xs font-serif text-[var(--lib-ink-muted)]">
                Official emergency and crisis contacts verified as of 2 November 2026
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-sm text-[var(--lib-ink-muted)] hover:text-[var(--lib-ink)] hover:bg-[var(--lib-surface-hover)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Non-Negotiable Safety Notice Banner */}
        <div className="p-4 bg-[var(--lib-accent-soft)] border-b border-[var(--lib-border)] flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[var(--lib-accent)] shrink-0 mt-0.5" />
          <div className="text-xs font-serif text-[var(--lib-ink)] space-y-1">
            <p className="font-semibold text-[var(--lib-accent)]">
              General Education & Safety Notice
            </p>
            <p className="text-[var(--lib-ink-secondary)] leading-relaxed">
              The techniques in this reading room are for personal reflection and stress-reduction education only. They do not constitute medical, psychological, or psychiatric diagnosis or treatment. If you or someone you know is in immediate crisis or experiencing thoughts of self-harm, please reach out to one of the official national services below.
            </p>
          </div>
        </div>

        {/* Regional Filter Tabs */}
        <div className="flex items-center gap-1.5 p-3 border-b border-[var(--lib-border-soft)] bg-[var(--lib-surface)] overflow-x-auto scrollbar-thin">
          {COUNTRY_TABS.map((tab) => {
            const active = selectedCountry === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCountry(tab.id)}
                className={`px-3 py-1 text-xs rounded-sm font-serif flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--lib-accent)] text-[#FFFDF9] font-medium shadow-2xs'
                    : 'bg-[var(--lib-surface-elevated)] text-[var(--lib-ink-muted)] border border-[var(--lib-border)] hover:text-[var(--lib-ink)]'
                }`}
              >
                <span>{tab.flag}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Helplines List Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 lib-scrollbar">
          {loading ? (
            <div className="py-8 text-center font-serif text-sm text-[var(--lib-ink-muted)] animate-pulse">
              Retrieving verified directory contacts...
            </div>
          ) : helplines.length === 0 ? (
            <div className="py-8 text-center font-serif text-sm text-[var(--lib-ink-muted)]">
              No registered helplines found for this region.
            </div>
          ) : (
            helplines.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-md border border-[var(--lib-border)] bg-[var(--lib-surface)] space-y-3 hover:border-[var(--lib-accent)] transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--lib-border-soft)] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--lib-accent)] px-2 py-0.5 rounded bg-[var(--lib-surface-elevated)] border border-[var(--lib-border)]">
                      {entry.country_name}
                    </span>
                    <h4 className="font-serif font-medium text-sm text-[var(--lib-ink)]">
                      {entry.org_name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--lib-sage)]">
                    <CheckCircle className="w-3 h-3" />
                    <span>Verified {entry.verified_date}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-serif">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-[var(--lib-accent)] shrink-0" />
                    <div>
                      <span className="text-[var(--lib-ink-muted)] text-[10px] block font-mono">TELEPHONE</span>
                      <a
                        href={`tel:${entry.service_phone.split(' ')[0]}`}
                        className="text-sm font-mono font-bold text-[var(--lib-ink)] hover:underline"
                      >
                        {entry.service_phone}
                      </a>
                    </div>
                  </div>

                  {entry.sms_text && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[var(--lib-sage)] shrink-0" />
                      <div>
                        <span className="text-[var(--lib-ink-muted)] text-[10px] block font-mono">TEXT / CHAT</span>
                        <span className="text-xs font-serif text-[var(--lib-ink-secondary)]">
                          {entry.sms_text}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--lib-border-soft)] text-xs font-serif text-[var(--lib-ink-muted)]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[var(--lib-gold)]" />
                    <span>Hours: {entry.hours_available}</span>
                  </span>

                  <a
                    href={entry.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[var(--lib-accent)] hover:underline cursor-pointer"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[var(--lib-surface)] border-t border-[var(--lib-border)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-serif text-[var(--lib-ink)] bg-[var(--lib-surface-elevated)] border border-[var(--lib-border)] hover:bg-[var(--lib-surface-hover)] transition-colors cursor-pointer"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
};
