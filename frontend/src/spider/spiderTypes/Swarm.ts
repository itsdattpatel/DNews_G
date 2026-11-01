/**
 * frontend/src/spider/spiderTypes/Swarm.ts
 * Swarm Spider: Cluster of 5 agile mini green spiders (#22c55e)
 * that scatter and scuttle across dispatches during catch-up and animal/wildlife intelligence (P12-03).
 */
import { BaseSpider } from '../BaseSpider';
import type { Point2D } from '../../canvas/ik';

export class MiniGreenSpider extends BaseSpider {
  private targetOffset: Point2D;
  private wanderAngle = 0;
  private wanderTimer = 0;

  constructor(x: number, y: number, offset: Point2D = { x: 0, y: 0 }) {
    super(x, y, {
      bodyColor: '#22c55e', // Emerald bio-green
      legColor: '#4ade80',  // Mint green legs
      glowColor: 'rgba(34, 197, 94, 0.5)',
      maxSpeed: 130 + Math.random() * 40,
      scale: 0.55,
    });
    this.targetOffset = offset;
    this.wanderAngle = Math.random() * Math.PI * 2;
  }

  public setGoal(point: Point2D | null): void {
    if (!point) {
      this.targetPoint = null;
      return;
    }
    this.targetPoint = {
      x: point.x + this.targetOffset.x,
      y: point.y + this.targetOffset.y,
    };
  }

  public override update(dt: number): void {
    // Add micro wandering jitter so each swarm unit moves independently
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = 0.4 + Math.random() * 0.6;
      this.wanderAngle += (Math.random() - 0.5) * 1.2;
    }

    if (this.targetPoint) {
      // Small orbiting jitter around goal
      const jitterDist = 6;
      const targetWithJitter: Point2D = {
        x: this.targetPoint.x + Math.cos(this.wanderAngle) * jitterDist,
        y: this.targetPoint.y + Math.sin(this.wanderAngle) * jitterDist,
      };

      const dx = targetWithJitter.x - this.x;
      const dy = targetWithJitter.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 6) {
        this.angle = Math.atan2(dy, dx);
        const speed = this.config.maxSpeed || 140;
        this.x += (dx / dist) * speed * dt;
        this.y += (dy / dist) * speed * dt;
      }
    }

    // Call base update to step IK legs
    super.update(dt);
  }

  public override render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    // Translate to spider center and scale down for mini micro-spider aesthetic
    ctx.translate(this.x, this.y);
    ctx.scale(0.58, 0.58);
    ctx.translate(-this.x, -this.y);

    super.render(ctx);

    // Glowing bio-luminescent emerald dorsal markings
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);
    ctx.fillStyle = '#86efac';
    ctx.beginPath();
    ctx.arc(0, 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}

export class SwarmSpiderCluster {
  public members: MiniGreenSpider[] = [];
  private currentTargetIndex = 0;
  private targets: Point2D[] = [];
  private scatterTimer = 0;

  constructor(originX: number, originY: number, count: number = 5) {
    const offsets: Point2D[] = [
      { x: 0, y: 0 },
      { x: -24, y: -18 },
      { x: 26, y: -16 },
      { x: -18, y: 22 },
      { x: 20, y: 24 },
    ];

    for (let i = 0; i < count; i++) {
      const offset = offsets[i % offsets.length] || { x: (i - 2) * 15, y: (i % 2) * 15 };
      const spider = new MiniGreenSpider(originX + offset.x, originY + offset.y, offset);
      this.members.push(spider);
    }
  }

  public setTargets(targets: Point2D[]): void {
    this.targets = targets;
    this.currentTargetIndex = 0;
    this.scatterTimer = 0;

    if (targets.length > 0) {
      this.distributeGoals();
    }
  }

  private distributeGoals(): void {
    if (this.targets.length === 0) return;
    const baseTarget = this.targets[this.currentTargetIndex];
    if (!baseTarget) return;

    this.members.forEach((member, i) => {
      // Either spread on current target or distribute among multiple targets if present
      if (this.targets.length > 1 && i % 2 === 1) {
        const altIndex = (this.currentTargetIndex + 1) % this.targets.length;
        member.setGoal(this.targets[altIndex] ?? baseTarget);
      } else {
        member.setGoal(baseTarget);
      }
    });
  }

  public update(dt: number): void {
    this.scatterTimer += dt;
    if (this.scatterTimer > 2.5 && this.targets.length > 1) {
      this.scatterTimer = 0;
      this.currentTargetIndex = (this.currentTargetIndex + 1) % this.targets.length;
      this.distributeGoals();
    }

    for (const member of this.members) {
      member.update(dt);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Render faint bioluminescent trail between swarm members
    if (this.members.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.14)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      this.members.forEach((m, idx) => {
        if (idx === 0) ctx.moveTo(m.x, m.y);
        else ctx.lineTo(m.x, m.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    for (const member of this.members) {
      member.render(ctx);
    }
  }
}

