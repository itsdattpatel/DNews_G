/**
 * frontend/src/library/ui/EmblaReadingCarousel.tsx
 * Frictionless, accessible carousel engine for scripture verses, quote collections,
 * and historical timeline cards powered by embla-carousel-react.
 */
import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface EmblaReadingCarouselProps {
  children: React.ReactNode[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  showControls?: boolean;
  showDots?: boolean;
  className?: string;
}

export const EmblaReadingCarousel: React.FC<EmblaReadingCarouselProps> = ({
  children,
  selectedIndex: controlledIndex,
  onSelect,
  showControls = true,
  showDots = true,
  className = '',
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    duration: 25,
    skipSnaps: false,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const onSelectCallback = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setCurrentIndex(index);
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    onSelect?.(index);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelectCallback();
    emblaApi.on('select', onSelectCallback);
    emblaApi.on('reInit', onSelectCallback);
    return () => {
      emblaApi.off('select', onSelectCallback);
      emblaApi.off('reInit', onSelectCallback);
    };
  }, [emblaApi, onSelectCallback]);

  // Synchronize with external index if controlled
  useEffect(() => {
    if (emblaApi && controlledIndex !== undefined && controlledIndex !== currentIndex) {
      emblaApi.scrollTo(controlledIndex);
    }
  }, [controlledIndex, emblaApi, currentIndex]);

  return (
    <div className={`relative w-full overflow-hidden select-none ${className}`}>
      {/* Carousel Viewport */}
      <div className="overflow-hidden cursor-grab active:cursor-grabbing" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {React.Children.map(children, (child, idx) => (
            <div key={idx} className="flex-[0_0_100%] min-w-0 px-2">
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Controls */}
      {showControls && (
        <div className="flex items-center justify-between mt-4 px-2">
          <button
            type="button"
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            aria-label="Previous slide"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-[var(--lib-ink)] border border-[var(--lib-border)] bg-[var(--lib-surface)] hover:bg-[var(--lib-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--lib-ink-muted)]" />
            <span className="font-serif">Previous</span>
          </button>

          {showDots && (
            <div className="flex items-center gap-1.5">
              {children.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollTo(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? 'w-6 bg-[var(--lib-gold)]'
                      : 'w-2 bg-[var(--lib-border)] hover:bg-[var(--lib-ink-muted)]'
                  }`}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={scrollNext}
            disabled={!canScrollNext}
            aria-label="Next slide"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-[var(--lib-ink)] border border-[var(--lib-border)] bg-[var(--lib-surface)] hover:bg-[var(--lib-surface-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <span className="font-serif">Next</span>
            <ChevronRight className="w-4 h-4 text-[var(--lib-ink-muted)]" />
          </button>
        </div>
      )}
    </div>
  );
};
