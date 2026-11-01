/**
 * frontend/src/spider/spiderTypes/Scout.ts
 * Scout Spider: pre-marks and scouts upcoming cards with dashed aura and exploratory stance.
 */
import { BaseSpider } from '../BaseSpider';

export class ScoutSpider extends BaseSpider {
  private pulsePhase = 0;

  constructor(x: number, y: number) {
    super(x, y, {
      bodyColor: '#64748b', // slate
      legColor: '#94a3b8',
      glowColor: 'rgba(148, 163, 184, 0.3)',
      maxSpeed: 140, // scouts move faster
    });
  }

  public override update(dt: number): void {
    super.update(dt);
    this.pulsePhase = (this.pulsePhase + dt * 3) % (Math.PI * 2);
  }

  public override render(ctx: CanvasRenderingContext2D): void {
    // Draw dashed radar ping around scout position
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);

    const pulseRadius = 24 + Math.sin(this.pulsePhase) * 6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    super.render(ctx);
  }
}
