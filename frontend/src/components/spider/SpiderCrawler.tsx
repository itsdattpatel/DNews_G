/**
 * frontend/src/components/spider/SpiderCrawler.tsx
 * Procedural SpiderCrawler React module (Step 5).
 * Feet plant on real words in the DOM; 8 articulated IK legs step in alternating insect gait;
 * silk thread links evidence phrases to summary takeaways in real-time.
 * Pure clean-room implementation conforming to SPIDER_SPEC.md.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import type {
  SpiderCrawlerProps,
  SpiderBodyState,
  SpiderLegState,
  PhraseTarget,
  SpiderMode,
} from './SpiderCrawler.types';
import {
  DEFAULT_LEG_CONFIGS,
  getHipPosition,
  getIdealFootPosition,
  updateLegStep,
} from './SpiderLeg';
import { useSpiderFPS } from './useSpiderFPS';

const MODE_SPEEDS: Record<SpiderMode, number> = {
  reading: 1.0,
  breaking: 2.2,
  compare: 1.4,
  archive: 0.6,
};

export const SpiderCrawler: React.FC<SpiderCrawlerProps> = ({
  containerRef,
  anchorPhrases,
  summaryCount = 3,
  mode = 'reading',
  onPhraseActivate,
  onPhraseLand,
  paused = false,
  spiderSpeed = 1.0,
  reducedMotion = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const targetsRef = useRef<PhraseTarget[]>([]);
  const currentTargetIdxRef = useRef<number>(0);
  const isHoveredRef = useRef<boolean>(false);
  const lastTimeRef = useRef<number>(performance.now());
  const gaitPhaseRef = useRef<number>(0);

  const { below: fpsBelow, critical: fpsCritical, updateFPS } = useSpiderFPS(45);

  // Initialize 8 procedural legs in rest pose
  const initSpiderState = useCallback((startX: number, startY: number): SpiderBodyState => {
    const heading = Math.PI * 0.5; // facing down initially
    const legs: SpiderLegState[] = DEFAULT_LEG_CONFIGS.map((config) => {
      const { targetX, targetY } = getIdealFootPosition(startX, startY, heading, config);
      return {
        targetX,
        targetY,
        currentX: targetX,
        currentY: targetY,
        jointX: startX,
        jointY: startY,
        planted: true,
        stepProgress: 1.0,
        stepFromX: targetX,
        stepFromY: targetY,
      };
    });

    return {
      x: startX,
      y: startY,
      heading,
      legStates: legs,
    };
  }, []);

  const spiderRef = useRef<SpiderBodyState>(initSpiderState(200, 60));

  // 1. Scan DOM for Anchor Phrases or Words
  const discoverTargets = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const discovered: PhraseTarget[] = [];

    // First try locating <mark> elements created by ArticlePanel
    const marks = container.querySelectorAll<HTMLElement>('.spider-anchor');
    if (marks.length > 0) {
      marks.forEach((mark) => {
        const r = mark.getBoundingClientRect();
        const sentenceIdx = parseInt(mark.getAttribute('data-sentence-index') || '0', 10);
        discovered.push({
          phrase: mark.innerText.trim(),
          sentenceIndex: sentenceIdx,
          x: r.left - containerRect.left + container.scrollLeft + r.width * 0.5,
          y: r.top - containerRect.top + container.scrollTop + r.height * 0.5,
          width: r.width,
          height: r.height,
          visited: false,
        });
      });
    }

    // Fallback: If no marks yet, find paragraphs in article body
    if (discovered.length === 0) {
      const paragraphs = container.querySelectorAll<HTMLElement>('article p');
      paragraphs.forEach((p, idx) => {
        const r = p.getBoundingClientRect();
        if (r.width > 20 && r.height > 10) {
          discovered.push({
            phrase: p.innerText.slice(0, 30),
            sentenceIndex: idx % (summaryCount || 1),
            x: r.left - containerRect.left + container.scrollLeft + Math.min(180, r.width * 0.4),
            y: r.top - containerRect.top + container.scrollTop + r.height * 0.5,
            width: r.width,
            height: r.height,
            visited: false,
          });
        }
      });
    }

    // Sort in document order (top to bottom)
    discovered.sort((a, b) => a.y - b.y);
    targetsRef.current = discovered;
    currentTargetIdxRef.current = 0;
  }, [containerRef, summaryCount]);

  // Handle Resize and Discovery
  useEffect(() => {
    discoverTargets();
    const handleResize = () => discoverTargets();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [discoverTargets, anchorPhrases]);

  // Reduced Motion Fallback: sequence phrases without rendering canvas
  useEffect(() => {
    if (!reducedMotion) return;
    let step = 0;
    const timer = setInterval(() => {
      if (step < summaryCount) {
        onPhraseActivate?.(step);
        step += 1;
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [reducedMotion, summaryCount, onPhraseActivate]);

  // Pause on hover
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleMouseEnter = () => { isHoveredRef.current = true; };
    const handleMouseLeave = () => { isHoveredRef.current = false; };

    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mouseenter', handleMouseEnter);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [containerRef]);

  // Main Procedural Crawl & Animation Loop
  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let isRunning = true;

    function render(now: number) {
      if (!isRunning) return;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;
      updateFPS(now);

      const container = containerRef.current;
      if (!container || !canvas) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      // Sync canvas resolution with container scroll surface
      if (canvas.width !== container.scrollWidth || canvas.height !== container.scrollHeight) {
        canvas.width = container.scrollWidth;
        canvas.height = container.scrollHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isPaused = paused || isHoveredRef.current || fpsCritical;
      const speedMultiplier = (MODE_SPEEDS[mode] || 1.0) * spiderSpeed;

      const spider = spiderRef.current;
      const targets = targetsRef.current;
      const currentTarget = targets[currentTargetIdxRef.current];

      // Update movement towards target phrase
      if (!isPaused && currentTarget) {
        const dx = currentTarget.x - spider.x;
        const dy = currentTarget.y - spider.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Turn heading smoothly towards target
        const targetHeading = Math.atan2(dy, dx);
        let angleDiff = targetHeading - spider.heading;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        spider.heading += angleDiff * Math.min(1, dt * 6.0);

        // Advance body position
        const moveDist = Math.min(dist, dt * 65.0 * speedMultiplier);
        spider.x += Math.cos(spider.heading) * moveDist;
        spider.y += Math.sin(spider.heading) * moveDist;

        // Check if spider reached anchor phrase
        if (dist < 24) {
          if (!currentTarget.visited) {
            currentTarget.visited = true;
            onPhraseLand?.(currentTarget.phrase, currentTarget.sentenceIndex);
            onPhraseActivate?.(currentTarget.sentenceIndex);
          }
          // Advance to next phrase target
          if (currentTargetIdxRef.current < targets.length - 1) {
            currentTargetIdxRef.current += 1;
          }
        }

        // Advance insect gait cycle (gaitGroup 0 vs 1)
        gaitPhaseRef.current += dt * 4.0 * speedMultiplier;
        const currentGaitGroup = Math.floor(gaitPhaseRef.current) % 2;

        // Update each of 8 legs procedurally
        spider.legStates = spider.legStates.map((leg, i) => {
          const config = DEFAULT_LEG_CONFIGS[i] || DEFAULT_LEG_CONFIGS[0];
          const { hipX, hipY } = getHipPosition(spider.x, spider.y, spider.heading, config);
          const { targetX: idealX, targetY: idealY } = getIdealFootPosition(
            spider.x,
            spider.y,
            spider.heading,
            config,
          );

          const canStep = config.gaitGroup === currentGaitGroup;
          return updateLegStep(leg, idealX, idealY, hipX, hipY, config, canStep, dt, 8.0 * speedMultiplier);
        });
      }

      // ─── Drawing ──────────────────────────────────────────────────────────

      // Get color tokens based on current theme and mode
      const isNight = document.documentElement.getAttribute('data-theme') === 'night';
      const bodyColor = mode === 'breaking'
        ? (isNight ? '#E74C3C' : '#C0392B')
        : (isNight ? '#E8E4DA' : '#14120E');
      const threadColor = mode === 'breaking'
        ? (isNight ? '#E74C3C' : '#C0392B')
        : (isNight ? 'rgba(168, 152, 128, 0.4)' : 'rgba(20, 18, 14, 0.2)');

      // Draw Silk Dragline (only if FPS >= 45)
      if (!fpsBelow && currentTargetIdxRef.current > 0) {
        ctx.beginPath();
        ctx.strokeStyle = threadColor;
        ctx.lineWidth = 1.0;
        if (mode !== 'breaking') {
          ctx.setLineDash([3, 4]);
        } else {
          ctx.setLineDash([]);
        }

        // Trace from first target through visited targets to spider body
        const first = targets[0];
        if (first) {
          ctx.moveTo(first.x, first.y);
          for (let ti = 1; ti < currentTargetIdxRef.current; ti++) {
            const t = targets[ti];
            if (t) ctx.lineTo(t.x, t.y);
          }
          ctx.lineTo(spider.x, spider.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Draw 8 Articulated Legs
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = bodyColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      spider.legStates.forEach((leg, i) => {
        const config = DEFAULT_LEG_CONFIGS[i] || DEFAULT_LEG_CONFIGS[0];
        const { hipX, hipY } = getHipPosition(spider.x, spider.y, spider.heading, config);

        ctx.beginPath();
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(leg.jointX, leg.jointY);
        ctx.lineTo(leg.currentX, leg.currentY);
        ctx.stroke();

        // Tiny foot contact dot
        ctx.beginPath();
        ctx.arc(leg.currentX, leg.currentY, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = bodyColor;
        ctx.fill();
      });

      // Draw Spider Cephalothorax & Abdomen
      ctx.save();
      ctx.translate(spider.x, spider.y);
      ctx.rotate(spider.heading);

      // Abdomen (larger rear oval)
      ctx.beginPath();
      ctx.fillStyle = bodyColor;
      ctx.ellipse(0, 5, 5.5, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cephalothorax (front round head)
      ctx.beginPath();
      ctx.ellipse(0, -3.5, 4.2, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chelicerae / pedipalps (mouthparts)
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-1.8, -7.5);
      ctx.lineTo(-2.2, -9.5);
      ctx.moveTo(1.8, -7.5);
      ctx.lineTo(2.2, -9.5);
      ctx.stroke();

      // Tiny reflective spider eyes
      ctx.fillStyle = isNight ? '#FFFFFF' : '#FAF7F0';
      ctx.beginPath();
      ctx.arc(-1.2, -5.5, 0.7, 0, Math.PI * 2);
      ctx.arc(1.2, -5.5, 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    }

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [
    reducedMotion,
    containerRef,
    mode,
    spiderSpeed,
    paused,
    fpsBelow,
    fpsCritical,
    updateFPS,
    onPhraseLand,
    onPhraseActivate,
  ]);

  if (reducedMotion) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="spider-canvas absolute inset-0 pointer-events-none z-20"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default SpiderCrawler;
