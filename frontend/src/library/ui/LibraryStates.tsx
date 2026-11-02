/**
 * frontend/src/library/ui/LibraryStates.tsx
 * Comprehensive Loading, Empty, and Error states for The Reading Room.
 * Enforces the "anti-slop" rule: every component must have dedicated loading, empty, and error states.
 */
import React from 'react';
import { AlertCircle, BookX, RotateCw } from 'lucide-react';
import { ParchmentButton } from './ParchmentButton';

// ─── Loading State (Warm Vellum Skeleton) ────────────────────────────────────
export const LibraryLoadingState: React.FC<{ rows?: number; className?: string }> = ({
  rows = 3,
  className = '',
}) => {
  return (
    <div className={`space-y-4 p-6 border border-[var(--lib-border)] rounded-md bg-[var(--lib-surface)] animate-pulse ${className}`}>
      <div className="h-6 w-1/3 bg-[var(--lib-border)] rounded-sm opacity-50 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-full bg-[var(--lib-border-soft)] rounded-sm opacity-60" />
          <div className="h-4 w-4/5 bg-[var(--lib-border-soft)] rounded-sm opacity-40" />
        </div>
      ))}
      <div className="pt-2 flex justify-between">
        <div className="h-3 w-24 bg-[var(--lib-border)] rounded-sm opacity-40" />
        <div className="h-3 w-16 bg-[var(--lib-border)] rounded-sm opacity-40" />
      </div>
    </div>
  );
};

// ─── Empty State (Calm Archival Void) ─────────────────────────────────────────
export interface LibraryEmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const LibraryEmptyState: React.FC<LibraryEmptyStateProps> = ({
  title = 'No Archival Records Found',
  message = 'The library stacks contain no records matching your search or filters. Try adjusting your query or date range.',
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center border border-dashed border-[var(--lib-border)] rounded-md bg-[var(--lib-surface)] ${className}`}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--lib-surface-hover)] text-[var(--lib-gold)] mb-4 border border-[var(--lib-border)]">
        <BookX className="w-6 h-6 opacity-75" />
      </div>
      <h3 className="font-serif text-lg font-medium text-[var(--lib-ink)] mb-2">
        {title}
      </h3>
      <p className="font-serif text-sm text-[var(--lib-ink-secondary)] max-w-md leading-relaxed mb-6">
        {message}
      </p>
      {actionLabel && onAction && (
        <ParchmentButton variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </ParchmentButton>
      )}
    </div>
  );
};

// ─── Error State (Tactile Ink Alert) ──────────────────────────────────────────
export interface LibraryErrorStateProps {
  title?: string;
  error?: string;
  onRetry?: () => void;
  className?: string;
}

export const LibraryErrorState: React.FC<LibraryErrorStateProps> = ({
  title = 'Archival Access Interrupted',
  error = 'Unable to retrieve data from the local repository or external archives.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`p-6 border border-[var(--lib-accent)] rounded-md bg-[var(--lib-accent-soft)] ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[var(--lib-accent)] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-serif font-medium text-[var(--lib-ink)] text-base">
            {title}
          </h4>
          <p className="font-serif text-sm text-[var(--lib-ink-secondary)] mt-1">
            {error}
          </p>
          {onRetry && (
            <div className="mt-4">
              <ParchmentButton
                variant="primary"
                size="sm"
                icon={<RotateCw className="w-3.5 h-3.5" />}
                onClick={onRetry}
              >
                Retry Request
              </ParchmentButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
