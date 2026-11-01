/**
 * frontend/src/spider/spiderTypes/Reader.ts
 * Reader Spider: walks between keyword chips in the summary panel and paces reading rhythm.
 */
import { BaseSpider } from '../BaseSpider';
import type { Point2D } from '../../canvas/ik';

export class ReaderSpider extends BaseSpider {
  private targets: Point2D[] = [];
  private currentTargetIndex = 0;
  private readTimer = 0;
  private isReading = false;
  private onKeywordReached?: (index: number) => void;

  constructor(
    x: number,
    y: number,
    onKeywordReached?: (index: number) => void,
  ) {
    super(x, y, {
      bodyColor: '#a78bfa', // accent-spider violet
      legColor: '#c4b5fd',
      glowColor: 'rgba(167, 139, 250, 0.45)',
      maxSpeed: 110,
    });
    this.onKeywordReached = onKeywordReached;
  }

  public setTargets(targets: Point2D[]): void {
    this.targets = targets;
    this.currentTargetIndex = 0;
    this.isReading = false;
    this.readTimer = 0;

    if (targets.length > 0) {
      this.targetPoint = targets[0] ?? null;
    }
  }

  public override update(dt: number): void {
    super.update(dt);

    if (this.targets.length === 0) return;

    if (this.isAtTarget) {
      if (!this.isReading) {
        this.isReading = true;
        this.readTimer = 1.0; // dwell & read for 1 second
        this.onKeywordReached?.(this.currentTargetIndex);
      } else {
        this.readTimer -= dt;
        if (this.readTimer <= 0) {
          // Advance to next keyword target
          this.isReading = false;
          this.currentTargetIndex = (this.currentTargetIndex + 1) % this.targets.length;
          this.targetPoint = this.targets[this.currentTargetIndex] ?? null;
        }
      }
    }
  }
}
