/**
 * frontend/src/spider/BaseSpider.ts
 * Base spider class with 8-legged inverse kinematics, alternating tripod gait,
 * and realistic organic motion.
 */
import { solve2SegmentIK, type Point2D, type JointChain, lerp } from '../canvas/ik';

export interface SpiderConfig {
  bodyColor: string;
  legColor: string;
  glowColor?: string;
  maxSpeed?: number;
  scale?: number;
}

interface Leg {
  rootOffset: Point2D;
  defaultFootOffset: Point2D;
  currentFoot: Point2D;
  targetFoot: Point2D;
  stepProgress: number; // 0 to 1
  isStepping: boolean;
  group: 0 | 1; // 0 = tripod group A, 1 = tripod group B
  bendDir: 1 | -1;
}

export class BaseSpider {
  public x: number;
  public y: number;
  public angle = 0; // facing angle in radians
  protected vx = 0;
  protected vy = 0;
  public targetPoint: Point2D | null = null;
  public isAtTarget = false;

  protected config: SpiderConfig;
  protected legs: Leg[] = [];
  protected stepThreshold = 22; // distance body moves before leg steps
  protected legLiftHeight = 12; // vertical arc lift in px
  protected gaitPhase = 0; // 0 or 1 alternating tripod group

  constructor(x: number, y: number, config: SpiderConfig) {
    this.x = x;
    this.y = y;
    this.config = {
      maxSpeed: 80, // px per second
      scale: 1,
      ...config,
    };

    this.initLegs();
  }

  private initLegs(): void {
    // 4 legs on left (indices 0..3), 4 legs on right (indices 4..7)
    // Tripod gait groups:
    // Group 0: Left 0, Left 2, Right 1, Right 3 (indices 0, 2, 5, 7)
    // Group 1: Left 1, Left 3, Right 0, Right 2 (indices 1, 3, 4, 6)

    const legOffsets: Array<{
      root: Point2D;
      foot: Point2D;
      group: 0 | 1;
      bend: 1 | -1;
    }> = [
      // Left legs (spread towards left and front/back)
      { root: { x: -6, y: -7 }, foot: { x: -28, y: -26 }, group: 0, bend: -1 },
      { root: { x: -8, y: -2 }, foot: { x: -34, y: -8 }, group: 1, bend: -1 },
      { root: { x: -8, y: 3 }, foot: { x: -33, y: 12 }, group: 0, bend: 1 },
      { root: { x: -6, y: 8 }, foot: { x: -26, y: 28 }, group: 1, bend: 1 },

      // Right legs (spread towards right and front/back)
      { root: { x: 6, y: -7 }, foot: { x: 28, y: -26 }, group: 1, bend: 1 },
      { root: { x: 8, y: -2 }, foot: { x: 34, y: -8 }, group: 0, bend: 1 },
      { root: { x: 8, y: 3 }, foot: { x: 33, y: 12 }, group: 1, bend: -1 },
      { root: { x: 6, y: 8 }, foot: { x: 26, y: 28 }, group: 0, bend: -1 },
    ];

    this.legs = legOffsets.map((l) => ({
      rootOffset: l.root,
      defaultFootOffset: l.foot,
      currentFoot: { x: this.x + l.foot.x, y: this.y + l.foot.y },
      targetFoot: { x: this.x + l.foot.x, y: this.y + l.foot.y },
      stepProgress: 1,
      isStepping: false,
      group: l.group,
      bendDir: l.bend,
    }));
  }

  public update(dt: number): void {
    // Movement steering towards target
    if (this.targetPoint) {
      const dx = this.targetPoint.x - this.x;
      const dy = this.targetPoint.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 8) {
        this.isAtTarget = false;
        // Turn towards target
        const desiredAngle = Math.atan2(dy, dx) - Math.PI / 2; // spider faces 'up' initially
        // Smooth rotation
        let angleDiff = desiredAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        this.angle += angleDiff * Math.min(dt * 8, 1);

        // Move forward in facing direction
        const speed = Math.min((this.config.maxSpeed || 80), dist * 3);
        const forwardX = Math.cos(this.angle + Math.PI / 2);
        const forwardY = Math.sin(this.angle + Math.PI / 2);

        this.vx = forwardX * speed;
        this.vy = forwardY * speed;

        this.x += this.vx * dt;
        this.y += this.vy * dt;
      } else {
        this.isAtTarget = true;
        this.vx = 0;
        this.vy = 0;
      }
    }

    this.updateLegsGait(dt);
  }

  private updateLegsGait(dt: number): void {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    for (const leg of this.legs) {
      // Calculate where the foot wants to be in world space
      const idealWorldFoot: Point2D = {
        x: this.x + (leg.defaultFootOffset.x * cos - leg.defaultFootOffset.y * sin),
        y: this.y + (leg.defaultFootOffset.x * sin + leg.defaultFootOffset.y * cos),
      };

      const distToIdeal = Math.hypot(
        idealWorldFoot.x - leg.currentFoot.x,
        idealWorldFoot.y - leg.currentFoot.y,
      );

      // Trigger a step if foot is lagging behind and it's this leg's group turn
      if (!leg.isStepping && distToIdeal > this.stepThreshold && leg.group === this.gaitPhase) {
        leg.isStepping = true;
        leg.stepProgress = 0;
        // Step slightly ahead of ideal for anticipatory natural gait
        const leadX = this.vx * 0.18;
        const leadY = this.vy * 0.18;
        leg.targetFoot = { x: idealWorldFoot.x + leadX, y: idealWorldFoot.y + leadY };
      }

      // Progress the stepping arc
      if (leg.isStepping) {
        leg.stepProgress += dt * 4.5; // step completes in ~0.22s
        if (leg.stepProgress >= 1) {
          leg.stepProgress = 1;
          leg.isStepping = false;
          leg.currentFoot = { ...leg.targetFoot };
          // Toggle tripod group phase
          this.gaitPhase = this.gaitPhase === 0 ? 1 : 0;
        } else {
          // Lerp foot towards target with vertical lift arc
          leg.currentFoot.x = lerp(leg.currentFoot.x, leg.targetFoot.x, leg.stepProgress);
          leg.currentFoot.y = lerp(leg.currentFoot.y, leg.targetFoot.y, leg.stepProgress);
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    // 1. Draw Legs using 2-segment IK
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.config.legColor;

    for (const leg of this.legs) {
      // Body attachment point in world space
      const rootWorld: Point2D = {
        x: this.x + (leg.rootOffset.x * cos - leg.rootOffset.y * sin),
        y: this.y + (leg.rootOffset.x * sin + leg.rootOffset.y * cos),
      };

      // Foot position (incorporate vertical stepping lift visually)
      const lift = leg.isStepping ? Math.sin(leg.stepProgress * Math.PI) * this.legLiftHeight : 0;
      const footPos: Point2D = {
        x: leg.currentFoot.x,
        y: leg.currentFoot.y - lift,
      };

      const chain: JointChain = solve2SegmentIK(rootWorld, footPos, leg.bendDir);

      // Draw Femur (root to knee)
      ctx.beginPath();
      ctx.moveTo(chain.root.x, chain.root.y);
      ctx.lineTo(chain.knee.x, chain.knee.y);
      ctx.stroke();

      // Draw Tibia (knee to foot)
      ctx.beginPath();
      ctx.moveTo(chain.knee.x, chain.knee.y);
      ctx.lineTo(chain.foot.x, chain.foot.y);
      ctx.stroke();

      // Small foot contact pad
      ctx.fillStyle = this.config.legColor;
      ctx.beginPath();
      ctx.arc(chain.foot.x, chain.foot.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Draw Body & Head with rotation
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    // Subtle glow behind body
    if (this.config.glowColor) {
      ctx.shadowColor = this.config.glowColor;
      ctx.shadowBlur = 14;
    }

    // Abdomen / Main Body (ellipse 18x12 px)
    ctx.fillStyle = this.config.bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 4, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cephalothorax / Head (circle 8px)
    ctx.beginPath();
    ctx.arc(0, -7, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Reset shadow for crisp eyes
    ctx.shadowBlur = 0;

    // Glowing Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2.2, -9, 1.3, 0, Math.PI * 2);
    ctx.arc(2.2, -9, 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
