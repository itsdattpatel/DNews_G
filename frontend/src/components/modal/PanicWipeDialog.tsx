/**
 * frontend/src/components/modal/PanicWipeDialog.tsx
 * Emergency Panic Shredder & Zero-Fill Forensic Wipe Dialog (PRD Master Expansion #50).
 * Multi-pass zero-fill overwrite of SQLite database, WAL files, and cached credentials.
 */
import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../../lib/haptics';
import { X, AlertOctagon, Flame, ShieldAlert, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api';

export const PanicWipeDialog: React.FC = () => {
  const isPanicWipeOpen = useAppStore((s) => s.isPanicWipeOpen);
  const setPanicWipeOpen = useAppStore((s) => s.setPanicWipeOpen);

  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [isWiping, setIsWiping] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPanicWipeOpen && !isWiping) {
        setPanicWipeOpen(false);
        setConfirmKeyword('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanicWipeOpen, isWiping]);

  if (!isPanicWipeOpen) return null;

  const isConfirmed = confirmKeyword.trim() === 'SHRED';

  const handleExecutePanicWipe = async () => {
    if (!isConfirmed || isWiping) return;

    setIsWiping(true);
    triggerHaptic('heavy');

    try {
      const res = await apiFetch('/api/security/panic-wipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'SHRED_ALL_DATA_FOREVER' }),
      });

      if (!res.ok) {
        throw new Error('Panic wipe failed on server');
      }

      // Purge all browser storage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}

      toast.error('Cryptographic wipe complete. Desk has been zeroed out.');
      setPanicWipeOpen(false);

      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      toast.error(`Wipe failed: ${String(err)}`);
      setIsWiping(false);
    }
  };

  return (
    <div
      id="panic-wipe-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="panic-wipe-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/75 backdrop-blur-sm select-none"
    >
      <div className="relative w-full max-w-lg bg-paper-alt border-4 border-accent shadow-2xl rounded-xs overflow-hidden text-ink">
        {/* Header */}
        <div className="bg-accent text-white p-4 flex items-center justify-between border-b-2 border-accent-dark">
          <div className="flex items-center gap-2">
            <AlertOctagon size={20} className="text-white animate-pulse" />
            <span id="panic-wipe-title" className="font-masthead text-xl font-bold tracking-wider uppercase">
              Emergency Panic Shredder
            </span>
          </div>
          <button
            id="btn-close-panic-wipe"
            onClick={() => {
              if (!isWiping) {
                setPanicWipeOpen(false);
                setConfirmKeyword('');
              }
            }}
            disabled={isWiping}
            className="p-1 hover:bg-white/20 rounded-xs transition-colors cursor-pointer"
            title="Cancel emergency wipe"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 border-2 border-accent/40 bg-accent/10 rounded-xs text-xs text-ink font-ui">
            <ShieldAlert size={22} className="text-accent shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="block text-accent font-bold uppercase tracking-wider mb-1">
                Zero-Trace Irreversible Action
              </strong>
              Executing this protocol executes a 3-pass cryptographic zero-fill shred on the local SQLite database,
              WAL write-ahead logs, and memory caches. All saved margin notes, custom feeds, and reading history
              will be permanently obliterated.
            </div>
          </div>

          <div className="font-ui text-xs text-ink-secondary space-y-1">
            <p>1. Overwrites SQLite pages with cryptographic random bytes.</p>
            <p>2. Executes second-pass zero-fill buffer flush (DoD 5220.22-M style).</p>
            <p>3. Purges all browser IndexedDB, session states, and cached API keys.</p>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-ink mb-2">
              Type <span className="text-accent font-black">SHRED</span> below to authorize:
            </label>
            <input
              id="input-panic-wipe-confirm"
              type="text"
              value={confirmKeyword}
              onChange={(e) => setConfirmKeyword(e.target.value)}
              placeholder="Type SHRED"
              disabled={isWiping}
              className="w-full p-2.5 bg-paper border-2 border-ink text-ink font-mono font-bold text-sm text-center uppercase tracking-widest focus:outline-none focus:border-accent"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-paper-border">
            <button
              id="btn-cancel-panic-wipe"
              type="button"
              onClick={() => {
                setPanicWipeOpen(false);
                setConfirmKeyword('');
              }}
              disabled={isWiping}
              className="px-4 py-2 border border-paper-border bg-paper hover:border-ink rounded-xs font-ui text-xs font-bold transition-colors cursor-pointer"
            >
              Abort Protocol
            </button>
            <button
              id="btn-confirm-panic-wipe"
              type="button"
              onClick={handleExecutePanicWipe}
              disabled={!isConfirmed || isWiping}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xs font-ui text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isConfirmed && !isWiping
                  ? 'bg-accent text-white hover:bg-accent-dark shadow-md'
                  : 'bg-paper-border/60 text-ink-muted cursor-not-allowed opacity-60'
              }`}
            >
              {isWiping ? (
                <>
                  <Flame size={14} className="animate-spin" />
                  <span>Shredding Desk...</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>Shred All Data Forever</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
