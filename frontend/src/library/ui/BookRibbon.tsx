/**
 * frontend/src/library/ui/BookRibbon.tsx
 * Hanging leather book-ribbon marker inspired by 21st.dev and MagicUI.
 * Provides a tactile bookmark indicator with smooth Motion animation.
 */
import React from 'react';
import { motion } from 'motion/react';
import { Bookmark } from 'lucide-react';

export interface BookRibbonProps {
  active?: boolean;
  onToggle?: () => void;
  color?: 'terracotta' | 'gold' | 'sage';
  size?: 'sm' | 'md';
  className?: string;
}

export const BookRibbon: React.FC<BookRibbonProps> = ({
  active = false,
  onToggle,
  color = 'terracotta',
  size = 'md',
  className = '',
}) => {
  const getColorStyles = () => {
    switch (color) {
      case 'gold':
        return active
          ? 'bg-[var(--lib-gold)] text-[var(--lib-bg)] shadow-md'
          : 'bg-[var(--lib-surface-hover)] text-[var(--lib-ink-muted)] hover:text-[var(--lib-gold)] border border-[var(--lib-border)]';
      case 'sage':
        return active
          ? 'bg-[var(--lib-sage)] text-[var(--lib-bg)] shadow-md'
          : 'bg-[var(--lib-surface-hover)] text-[var(--lib-ink-muted)] hover:text-[var(--lib-sage)] border border-[var(--lib-border)]';
      case 'terracotta':
      default:
        return active
          ? 'bg-[var(--lib-accent)] text-[var(--lib-bg)] shadow-md'
          : 'bg-[var(--lib-surface-hover)] text-[var(--lib-ink-muted)] hover:text-[var(--lib-accent)] border border-[var(--lib-border)]';
    }
  };

  const isSmall = size === 'sm';

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.92 }}
      whileHover={{ y: 2 }}
      aria-label={active ? 'Remove bookmark' : 'Bookmark this item'}
      className={`relative inline-flex flex-col items-center justify-start cursor-pointer transition-colors ${
        isSmall ? 'w-6 h-8 pt-1' : 'w-8 h-10 pt-1.5'
      } ${getColorStyles()} ${className}`}
      style={{
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 6px), 50% 100%, 0 calc(100% - 6px))',
      }}
    >
      <Bookmark
        className={`${isSmall ? 'w-3 h-3' : 'w-4 h-4'} ${active ? 'fill-current' : ''}`}
      />
    </motion.button>
  );
};
