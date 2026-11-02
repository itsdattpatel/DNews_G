/**
 * frontend/src/library/ui/DeckleCard.tsx
 * Tactile book-folio card with subtle deckle edge styling, parchment texture,
 * and smooth calm entry motion inspired by Codrops and Aceternity.
 */
import React from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';

export interface DeckleCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'sacred' | 'sage';
  hoverEffect?: boolean;
  className?: string;
}

export const DeckleCard: React.FC<DeckleCardProps> = ({
  children,
  variant = 'default',
  hoverEffect = true,
  className = '',
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return 'lib-deckle-elevated bg-[var(--lib-surface-elevated)]';
      case 'sacred':
        return 'lib-deckle border-l-4 border-l-[var(--lib-gold)] bg-[var(--lib-surface)]';
      case 'sage':
        return 'lib-deckle border-l-4 border-l-[var(--lib-sage)] bg-[var(--lib-surface)]';
      case 'default':
      default:
        return 'lib-deckle bg-[var(--lib-surface)]';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hoverEffect ? { y: -2, transition: { duration: 0.18 } } : undefined}
      className={`rounded-md p-5 border border-[var(--lib-border)] relative overflow-hidden transition-colors ${getVariantStyles()} ${className}`}
      {...props}
    >
      {/* Subtle corner watermark rule */}
      <div
        className="absolute top-0 right-0 w-8 h-8 pointer-events-none opacity-20 border-t border-r border-[var(--lib-gold)] rounded-tr-sm"
        aria-hidden="true"
      />
      {children}
    </motion.div>
  );
};
