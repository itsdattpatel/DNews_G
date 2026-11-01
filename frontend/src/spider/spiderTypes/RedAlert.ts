/**
 * frontend/src/spider/spiderTypes/RedAlert.ts
 * RedAlert Spider: Crimson carapace (#ef4444) with dynamic red strobe glow,
 * high-speed agile gait, and urgent pursuit behavior for breaking news (P12-01).
 */
import { BaseSpider } from '../BaseSpider';
import type { Point2D } from '../../canvas/ik';

export class RedAlertSpider extends BaseSpider {
  private targets: Point2D[] = [];
  private currentTargetIndex = 0;
  private strobePhase = 0;
  private urgentDwellTimer = 0;
  private isInvestigating = false;

  constructor(x: number, y: number) {
    super(x, y, {
      bodyColor: '#ef4444', // Crimson breaking red
      legColor: '#f87171',
      glowColor: 'rgba(239, 68, 68, 0.7)',
      maxSpeed: 180, // Rapid high-speed agile movement
      scale: 1.05,
    });
  }

  public setTargets(targets: Point2D[]): void {
    this.targets = targets;
    this.currentTargetIndex = 0;
    this.isInvestigating = false;
    this.urgentDwellTimer = 0;

    if (targets.length > 0) {
      this.targetPoint = targets[0] ?? null;
    }
  }

  public override update(dt: number): void {
    super.update(dt);

    // Strobe frequency: rapid pulse (8 rad/sec)
    this.strobePhase = (this.strobePhase + dt * 8) % (Math.PI * 2);

    if (this.targets.length === 0) return;

    if (this.isAtTarget) {
      if (!this.isInvestigating) {
        this.isInvestigating = true;
        this.urgentDwellTimer = 0.5; // Quick rapid dwell on breaking keywords (0.5s)
      }
      this.urgentDwellTimer -= dt;
      if (this.urgentDwellTimer <= 0) {
        this.isInvestigating = false;
        this.currentTargetIndex = (this.currentTargetIndex + 1) % this.targets.length;
        this.targetPoint = this.targets[this.currentTargetIndex] ?? null;
      }
    }
  }

  public override render(ctx: CanvasRenderingContext2D): void {
    // 1. Red strobe warning aura
    ctx.save();
    const strobeIntensity = (Math.sin(this.strobePhase) + 1) / 2; // 0 to 1
    const strobeRadius = 26 + strobeIntensity * 14; // 26px to 40px

    // Outer strobe ring
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.25 + strobeIntensity * 0.5})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, strobeRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner emergency hazard aura
    const gradient = ctx.createRadialGradient(this.x, this.y, 4, this.x, this.y, strobeRadius);
    gradient.addColorStop(0, `rgba(239, 68, 68, ${0.35 + strobeIntensity * 0.3})`);
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, strobeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Base spider body and 8 inverse kinematics legs
    super.render(ctx);

    // 3. Piercing crimson optical sensors (eyes)
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.fillStyle = '#fee2e2'; // Bright white-hot center
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;

    // Dual front searchlights
    ctx.beginPath();
    ctx.arc(3, -11, 2, 0, Math.PI * 2);
    ctx.arc(-3, -11, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
