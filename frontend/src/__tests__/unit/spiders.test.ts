/**
 * frontend/src/__tests__/unit/spiders.test.ts
 * Unit tests for all 6 procedural spider types:
 * RedAlert (P12-01), Archive (P12-02), Swarm (P12-03), Scout, Weaver, and Reader.
 */
import { describe, it, expect, vi } from 'vitest';
import { RedAlertSpider } from '../../spider/spiderTypes/RedAlert';
import { SwarmSpiderCluster, MiniGreenSpider } from '../../spider/spiderTypes/Swarm';
import { ArchiveSpider } from '../../spider/spiderTypes/Archive';
import { ScoutSpider } from '../../spider/spiderTypes/Scout';
import { WeaverSpider } from '../../spider/spiderTypes/Weaver';
import { ReaderSpider } from '../../spider/spiderTypes/Reader';

// Mock Canvas 2D Context for render testing
function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(),
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
    shadowColor: '',
    shadowBlur: 0,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
}

describe('Phase 12: Spider Intelligence & Biomechanical Kinematics', () => {
  describe('P12-01: RedAlert Spider', () => {
    it('initializes with crimson color tokens and high agility speed', () => {
      const spider = new RedAlertSpider(100, 100);
      expect(spider.x).toBe(100);
      expect(spider.y).toBe(100);

      // Verify fast agile pursuit parameters
      expect((spider as any).config.bodyColor).toBe('#ef4444');
      expect((spider as any).config.legColor).toBe('#f87171');
      expect((spider as any).config.maxSpeed).toBeGreaterThanOrEqual(180);
    });

    it('cycles through target coordinates with rapid urgent dwell', () => {
      const spider = new RedAlertSpider(0, 0);
      const targets = [
        { x: 10, y: 10 },
        { x: 50, y: 50 },
      ];
      spider.setTargets(targets);

      expect(spider.targetPoint).toEqual(targets[0]);

      // Simulate reaching target
      spider.x = 10;
      spider.y = 10;
      spider.isAtTarget = true;

      // Update 0.6s (exceeding 0.5s urgent dwell timer)
      spider.update(0.6);

      // Should advance to second target
      expect(spider.targetPoint).toEqual(targets[1]);
    });

    it('renders strobe warning aura, spider legs, and optical sensors without errors', () => {
      const spider = new RedAlertSpider(120, 80);
      const ctx = createMockContext();

      expect(() => {
        spider.update(0.016);
        spider.render(ctx);
      }).not.toThrow();

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });
  });

  describe('P12-02: Archive Spider', () => {
    it('initializes with brass amber colors and magnifying lens badge', () => {
      const spider = new ArchiveSpider(50, 50);
      expect((spider as any).config.bodyColor).toBe('#f59e0b');
      expect((spider as any).config.legColor).toBe('#fbbf24');
    });

    it('renders magnifying lens badge above body', () => {
      const spider = new ArchiveSpider(80, 80);
      const ctx = createMockContext();

      spider.render(ctx);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalledWith(spider.x + 8, spider.y - 8, 4, 0, Math.PI * 2);
      expect(ctx.stroke).toHaveBeenCalled();
    });
  });

  describe('P12-03: Swarm Spider Cluster', () => {
    it('initializes 5 mini green spiders with emerald chitin', () => {
      const swarm = new SwarmSpiderCluster(150, 150, 5);
      expect(swarm.members.length).toBe(5);

      for (const member of swarm.members) {
        expect(member).toBeInstanceOf(MiniGreenSpider);
        expect((member as any).config.bodyColor).toBe('#22c55e');
        expect((member as any).config.legColor).toBe('#4ade80');
        expect((member as any).config.scale).toBeLessThan(1.0);
      }
    });

    it('distributes target goals across swarm members', () => {
      const swarm = new SwarmSpiderCluster(100, 100, 5);
      const targets = [
        { x: 120, y: 120 },
        { x: 200, y: 180 },
      ];

      swarm.setTargets(targets);

      // Members should have assigned target coordinates
      for (const member of swarm.members) {
        expect(member.targetPoint).not.toBeNull();
        expect(Number.isFinite(member.targetPoint!.x)).toBe(true);
        expect(Number.isFinite(member.targetPoint!.y)).toBe(true);
      }
    });

    it('updates organic micro-wandering and renders swarm members without throwing', () => {
      const swarm = new SwarmSpiderCluster(100, 100, 5);
      const ctx = createMockContext();

      expect(() => {
        swarm.update(0.016);
        swarm.render(ctx);
      }).not.toThrow();

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });
  });

  describe('Remaining Spider Types: Scout, Weaver, Reader', () => {
    it('Scout Spider updates radar pulse and renders dashed radar circle', () => {
      const scout = new ScoutSpider(100, 100);
      const ctx = createMockContext();

      scout.update(0.05);
      scout.render(ctx);

      expect(ctx.setLineDash).toHaveBeenCalledWith([4, 4]);
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('Weaver Spider produces catenary silk paths between coordinates', () => {
      const from = { x: 10, y: 10 };
      const to = { x: 100, y: 80 };
      const path = WeaverSpider.generateSilkPath(from, to);

      expect(path).toContain('M 10 10');
      expect(path).toContain('C');
      expect(path).toContain('100 80');
    });

    it('Reader Spider paces typewriter reading dwell', () => {
      let reached = -1;
      const reader = new ReaderSpider(0, 0, (idx) => {
        reached = idx;
      });
      reader.setTargets([{ x: 20, y: 20 }]);
      reader.x = 20;
      reader.y = 20;
      reader.isAtTarget = true;

      reader.update(0.016);
      expect(reached).toBe(0);
    });
  });
});

