/**
 * frontend/src/components/spider/SpiderCanvas.tsx
 * Absolute canvas overlay mounted on the summary panel.
 * Dynamically instantiates and renders all 6 procedural spider types:
 * - Reader (violet, pacing typewriter keywords)
 * - RedAlert (crimson hazard strobe, breaking >= 75)
 * - Swarm (5 coordinated mini emerald spiders)
 * - Archive (brass amber with magnifying lens badge)
 * - Scout (radar aura exploratory gait)
 * - Weaver (electric cyan silk threads)
 */
import React, { useEffect, useRef } from 'react';
import { CanvasEngine } from '../../canvas/engine';
import { ReaderSpider } from '../../spider/spiderTypes/Reader';
import { RedAlertSpider } from '../../spider/spiderTypes/RedAlert';
import { SwarmSpiderCluster } from '../../spider/spiderTypes/Swarm';
import { ArchiveSpider } from '../../spider/spiderTypes/Archive';
import { ScoutSpider } from '../../spider/spiderTypes/Scout';
import { WeaverSpider } from '../../spider/spiderTypes/Weaver';
import type { Point2D } from '../../canvas/ik';

export type SpiderType = 'Reader' | 'RedAlert' | 'Swarm' | 'Archive' | 'Scout' | 'Weaver';

interface SpiderCanvasProps {
  containerRef: React.RefObject<HTMLDivElement>;
  keywords: string[];
  spiderType?: string | null;
  breakingScore?: number;
  onKeywordActive?: (index: number) => void;
}

export const SpiderCanvas: React.FC<SpiderCanvasProps> = ({
  containerRef,
  keywords,
  spiderType = 'Reader',
  breakingScore = 0,
  onKeywordActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const targetsRef = useRef<Point2D[]>([]);
  const activeKeywordRef = useRef<number>(-1);

  // Active spider instances
  const activeSpiderRef = useRef<
    ReaderSpider | RedAlertSpider | SwarmSpiderCluster | ArchiveSpider | ScoutSpider | WeaverSpider | null
  >(null);

  // Effective spider type based on breaking score priority
  const effectiveSpiderType: SpiderType =
    breakingScore >= 75
      ? 'RedAlert'
      : (spiderType as SpiderType) || 'Reader';

  // Re-initialize active spider when effectiveSpiderType changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Destroy previous engine if running
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }

    // Factory instantiation for all 6 spider types
    let spiderInstance:
      | ReaderSpider
      | RedAlertSpider
      | SwarmSpiderCluster
      | ArchiveSpider
      | ScoutSpider
      | WeaverSpider;

    switch (effectiveSpiderType) {
      case 'RedAlert':
        spiderInstance = new RedAlertSpider(70, 50);
        break;
      case 'Swarm':
        spiderInstance = new SwarmSpiderCluster(70, 50, 5);
        break;
      case 'Archive':
        spiderInstance = new ArchiveSpider(70, 50);
        break;
      case 'Scout':
        spiderInstance = new ScoutSpider(70, 50);
        break;
      case 'Weaver':
        spiderInstance = new WeaverSpider(70, 50);
        break;
      case 'Reader':
      default:
        spiderInstance = new ReaderSpider(60, 40, (reachedIndex) => {
          activeKeywordRef.current = reachedIndex;
          onKeywordActive?.(reachedIndex);
        });
        break;
    }

    activeSpiderRef.current = spiderInstance;

    // Initialize Canvas Engine with 60fps loop and FPS monitor
    const engine = new CanvasEngine(canvas, {
      update: (dt) => {
        if (prefersReducedMotion) return; // Freeze animation if reduced motion preferred
        activeSpiderRef.current?.update(dt);
      },
      render: (ctx) => {
        const spider = activeSpiderRef.current;
        if (!spider) return;

        // Faint connective silk thread for Reader or Weaver
        if (targetsRef.current.length > 1 && (effectiveSpiderType === 'Reader' || effectiveSpiderType === 'Weaver')) {
          ctx.save();
          ctx.strokeStyle =
            effectiveSpiderType === 'Weaver'
              ? 'rgba(56, 189, 248, 0.25)'
              : 'rgba(167, 139, 250, 0.18)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]);
          ctx.beginPath();
          targetsRef.current.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
          ctx.restore();
        }

        // Active keyword indicator pulse
        if (activeKeywordRef.current >= 0 && targetsRef.current[activeKeywordRef.current]) {
          const pt = targetsRef.current[activeKeywordRef.current];
          if (pt) {
            ctx.save();
            ctx.strokeStyle =
              effectiveSpiderType === 'RedAlert'
                ? 'rgba(239, 68, 68, 0.5)'
                : effectiveSpiderType === 'Swarm'
                ? 'rgba(34, 197, 94, 0.45)'
                : 'rgba(167, 139, 250, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }

        // Render the active procedural spider
        spider.render(ctx);
      },
      onFpsDrop: () => {
        console.warn('[SpiderCanvas] Low FPS detected (< 30). Throttling spider complexity.');
      },
    });

    engineRef.current = engine;
    engine.start();

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      engine.resize();
      updateKeywordTargets();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      engine.destroy();
    };
  }, [effectiveSpiderType]);

  // Recalculate keyword targets when keywords change or DOM updates
  const updateKeywordTargets = () => {
    if (!containerRef.current || !canvasRef.current || !activeSpiderRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const chips = containerRef.current.querySelectorAll<HTMLElement>('.keyword-chip');

    const targets: Point2D[] = [];
    chips.forEach((chip) => {
      const rect = chip.getBoundingClientRect();
      targets.push({
        x: rect.left - canvasRect.left + rect.width / 2,
        y: rect.top - canvasRect.top + rect.height / 2,
      });
    });

    targetsRef.current = targets;

    if (targets.length > 0) {
      const spider = activeSpiderRef.current;
      if (spider instanceof ReaderSpider) {
        spider.setTargets(targets);
      } else if (spider instanceof RedAlertSpider) {
        spider.setTargets(targets);
      } else if (spider instanceof SwarmSpiderCluster) {
        spider.setTargets(targets);
      } else if (spider instanceof ArchiveSpider) {
        spider.setScanTargets(targets);
      } else if (spider instanceof WeaverSpider) {
        const weaverThreads = targets.slice(0, -1).map((from, idx) => ({
          keyword: keywords[idx] || 'topic',
          from,
          to: targets[idx + 1]!,
          color: '#38bdf8',
        }));
        spider.setThreads(weaverThreads);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(updateKeywordTargets, 150);
    return () => clearTimeout(timer);
  }, [keywords, effectiveSpiderType]);

  return (
    <canvas
      ref={canvasRef}
      id="spider-overlay-canvas"
      aria-label={`Procedural ${effectiveSpiderType} spider animation canvas`}
      data-spider-type={effectiveSpiderType}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 15,
      }}
    />
  );
};
