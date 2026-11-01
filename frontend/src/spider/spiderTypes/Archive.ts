/**
 * frontend/src/spider/spiderTypes/Archive.ts
 * Archive Spider: brass amber carapace (#f59e0b) that activates during historical archive search (P8-05).
 */
import { BaseSpider } from '../BaseSpider';
import type { Point2D } from '../../canvas/ik';

export class ArchiveSpider extends BaseSpider {
  private scanTargets: Point2D[] = [];
  private currentScanIndex = 0;
  private inspectingTimer = 0;

  constructor(x: number, y: number) {
    super(x, y, {
      bodyColor: '#f59e0b', // Brass amber
      legColor: '#fbbf24',
      glowColor: 'rgba(245, 158, 11, 0.45)',
      maxSpeed: 100,
    });
  }

  public setScanTargets(targets: Point2D[]): void {
    this.scanTargets = targets;
    this.currentScanIndex = 0;
    this.inspectingTimer = 0;

    if (targets.length > 0) {
      this.targetPoint = targets[0] ?? null;
    }
  }

  public override update(dt: number): void {
    super.update(dt);

    if (this.scanTargets.length === 0) return;

    if (this.isAtTarget) {
      if (this.inspectingTimer <= 0) {
        this.inspectingTimer = 1.2; // Inspect citation for 1.2s
      } else {
        this.inspectingTimer -= dt;
        if (this.inspectingTimer <= 0) {
          this.currentScanIndex = (this.currentScanIndex + 1) % this.scanTargets.length;
          this.targetPoint = this.scanTargets[this.currentScanIndex] ?? null;
        }
      }
    }
  }

  public override render(ctx: CanvasRenderingContext2D): void {
    super.render(ctx);

    // Draw miniature magnifying glass badge above spider body
    ctx.save();
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x + 8, this.y - 8, 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.x + 11, this.y - 5);
    ctx.lineTo(this.x + 15, this.y - 1);
    ctx.stroke();
    ctx.restore();
  }
}
