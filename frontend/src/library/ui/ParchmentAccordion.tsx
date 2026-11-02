/**
 * frontend/src/library/ui/ParchmentAccordion.tsx
 * Silky-smooth collapsible accordion with deckle-edge styling and subtle ink transitions.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

export interface AccordionItem {
  id: string;
  title: string;
  badge?: string;
  content: React.ReactNode;
}

export interface ParchmentAccordionProps {
  items: AccordionItem[];
  defaultOpenId?: string;
  allowMultiple?: boolean;
  className?: string;
}

export const ParchmentAccordion: React.FC<ParchmentAccordionProps> = ({
  items,
  defaultOpenId,
  allowMultiple = false,
  className = '',
}) => {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenId ? [defaultOpenId] : []);

  const toggle = (id: string) => {
    if (allowMultiple) {
      setOpenIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);

        return (
          <div
            key={item.id}
            className="border border-[var(--lib-border)] rounded-md bg-[var(--lib-surface)] overflow-hidden transition-colors"
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-[var(--lib-surface-hover)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-serif text-base text-[var(--lib-ink)] font-medium">
                  {item.title}
                </span>
                {item.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-sm bg-[var(--lib-sage-soft)] text-[var(--lib-sage)] border border-[var(--lib-sage)] font-serif">
                    {item.badge}
                  </span>
                )}
              </div>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-[var(--lib-ink-muted)]"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="p-4 pt-1 border-t border-[var(--lib-border-soft)] text-[var(--lib-ink-secondary)] font-serif leading-relaxed">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

