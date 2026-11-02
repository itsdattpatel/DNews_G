/**
 * frontend/src/library/ui/QuoteReveal.tsx
 * Contemplative word-by-word opacity reveal inspired by MagicUI and Codrops.
 * Animates text gently into view with calm scholarly pacing.
 */
import React from 'react';
import { motion } from 'motion/react';

export interface QuoteRevealProps {
  text: string;
  author?: string;
  work?: string;
  className?: string;
}

export const QuoteReveal: React.FC<QuoteRevealProps> = ({
  text,
  author,
  work,
  className = '',
}) => {
  const words = text.split(' ');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.035,
        delayChildren: 0.1,
      },
    },
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 4 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: 'easeOut' as const },
    },
  };

  return (
    <div className={`p-6 bg-[var(--lib-surface-elevated)] border border-[var(--lib-border)] rounded-md shadow-sm relative ${className}`}>
      {/* Decorative illuminated quotation mark */}
      <span
        aria-hidden="true"
        className="absolute top-2 left-3 font-serif text-5xl text-[var(--lib-gold)] opacity-20 pointer-events-none select-none"
      >
        “
      </span>

      <motion.p
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 font-serif text-lg md:text-xl text-[var(--lib-ink)] leading-relaxed italic pl-6"
      >
        {words.map((word, idx) => (
          <motion.span key={idx} variants={wordVariants} className="inline-block mr-1.5">
            {word}
          </motion.span>
        ))}
      </motion.p>

      {(author || work) && (
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45, duration: 0.3 }}
          className="mt-4 pt-3 border-t border-[var(--lib-border-soft)] flex items-center justify-between text-sm text-[var(--lib-ink-secondary)] font-serif pl-6"
        >
          {author && <span className="font-medium text-[var(--lib-ink)]">— {author}</span>}
          {work && <span className="text-xs text-[var(--lib-ink-muted)] italic">{work}</span>}
        </motion.div>
      )}
    </div>
  );
};
