/**
 * frontend/src/spider/spiderTypes/Weaver.ts
 * Weaver Spider: cross-links shared topics and threads silk lines between matching keywords (P7-06).
 */
import { BaseSpider } from '../BaseSpider';
import type { Point2D } from '../../canvas/ik';

export interface WeaverThread {
  keyword: string;
  from: Point2D;
  to: Point2D;
  color: string;
  progress: number; // 0.0 to 1.0 animation
}

export class WeaverSpider extends BaseSpider {
  private threadQueue: WeaverThread[] = [];
  private activeThreads: WeaverThread[] = [];
  private currentThreadIndex = 0;

  constructor(x: number, y: number) {
    super(x, y, {
      bodyColor: '#38bdf8', // Electric silk cyan
      legColor: '#7dd3fc',
      glowColor: 'rgba(56, 189, 248, 0.4)',
      maxSpeed: 140,
    });
  }

  public setThreads(threads: Array<{ keyword: string; from: Point2D; to: Point2D; color: string }>): void {
    this.threadQueue = threads.map((t) => ({ ...t, progress: 0 }));
    this.activeThreads = [];
    this.currentThreadIndex = 0;

    if (this.threadQueue.length > 0) {
      this.targetPoint = this.threadQueue[0]!.from;
    }
  }

  public override update(dt: number): void {
    super.update(dt);

    if (this.threadQueue.length === 0) return;

    const current = this.threadQueue[this.currentThreadIndex];
    if (!current) return;

    // Advance silk line weaving progress
    if (this.isAtTarget) {
      if (this.targetPoint === current.from) {
        // Move towards destination
        this.targetPoint = current.to;
      } else {
        // Finished this thread, register to active threads
        current.progress = 1.0;
        if (!this.activeThreads.includes(current)) {
          this.activeThreads.push(current);
        }
        this.currentThreadIndex = (this.currentThreadIndex + 1) % this.threadQueue.length;
        this.targetPoint = this.threadQueue[this.currentThreadIndex]?.from ?? null;
      }
    }
  }

  /**
   * Generates SVG path definitions for silk threads between shared keywords
   */
  public static generateSilkPath(from: Point2D, to: Point2D): string {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    // Elegant organic catenary curve
    const cx1 = from.x + dx * 0.25;
    const cy1 = from.y + dy * 0.1 - 15;
    const cx2 = from.x + dx * 0.75;
    const cy2 = from.y + dy * 0.9 + 15;
    return `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;
  }

  public getWeftLines(): Array<{ d: string; color: string; keyword: string }> {
    return this.threadQueue.map((t) => ({
      d: WeaverSpider.generateSilkPath(t.from, t.to),
      color: t.color,
      keyword: t.keyword,
    }));
  }
}

