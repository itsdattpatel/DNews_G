/**
 * frontend/src/library/ui/InkStampBadge.tsx
 * Classical library seal / book accession stamp with serif small-caps
 * in aged sepia, botanical sage, terracotta, or illumination gold.
 */
import React from 'react';

export interface InkStampBadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'terracotta' | 'sage' | 'sepia' | 'muted';
  shape?: 'pill' | 'seal';
  className?: string;
}

export const InkStampBadge: React.FC<InkStampBadgeProps> = ({
  children,
  variant = 'sepia',
  shape = 'pill',
  className = '',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'gold':
        return 'text-[var(--lib-gold)] bg-[var(--lib-gold-soft)] border-[var(--lib-gold)]';
      case 'terracotta':
        return 'text-[var(--lib-accent)] bg-[var(--lib-accent-soft)] border-[var(--lib-accent)]';
      case 'sage':
        return 'text-[var(--lib-sage)] bg-[var(--lib-sage-soft)] border-[var(--lib-sage)]';
      case 'muted':
        return 'text-[var(--lib-ink-muted)] bg-[var(--lib-surface-hover)] border-[var(--lib-border)]';
      case 'sepia':
      default:
        return 'text-[var(--lib-ink-secondary)] bg-[var(--lib-surface-hover)] border-[var(--lib-border)]';
    }
  };

  const isSeal = shape === 'seal';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border text-xs font-serif font-medium tracking-wide transition-colors ${
        isSeal ? 'rounded-full px-3 py-1 uppercase text-[11px]' : 'rounded-sm'
      } ${getVariantStyles()} ${className}`}
    >
      {children}
    </span>
  );
};
