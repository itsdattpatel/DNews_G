/**
 * frontend/src/library/ui/ParchmentButton.tsx
 * Tactile pressed-vellum button inspired by Uiverse and React Bits.
 * Provides accessible, quiet micro-interactions with gentle pressed-paper motion.
 */
import React from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';

export interface ParchmentButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'gold' | 'ghost' | 'sage';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  className?: string;
}

export const ParchmentButton: React.FC<ParchmentButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[var(--lib-accent)] text-[#FFFDF9] border-[var(--lib-accent)] hover:opacity-95 shadow-sm';
      case 'gold':
        return 'bg-[var(--lib-gold)] text-[#13110E] border-[var(--lib-gold)] hover:opacity-95 shadow-sm font-medium';
      case 'sage':
        return 'bg-[var(--lib-sage)] text-[#FFFDF9] border-[var(--lib-sage)] hover:opacity-95 shadow-sm';
      case 'ghost':
        return 'bg-transparent text-[var(--lib-ink)] border-transparent hover:bg-[var(--lib-surface-hover)]';
      case 'secondary':
      default:
        return 'bg-[var(--lib-surface)] text-[var(--lib-ink)] border-[var(--lib-border)] hover:bg-[var(--lib-surface-hover)] hover:border-[var(--lib-gold)] shadow-sm';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-2.5 py-1 text-xs gap-1.5 rounded-sm';
      case 'lg':
        return 'px-5 py-2.5 text-base gap-2.5 rounded-md';
      case 'md':
      default:
        return 'px-3.5 py-1.5 text-sm gap-2 rounded-sm';
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      className={`inline-flex items-center justify-center font-serif border font-normal cursor-pointer select-none transition-colors ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      {...props}
    >
      {icon && <span className="opacity-80">{icon}</span>}
      <span>{children}</span>
    </motion.button>
  );
};

