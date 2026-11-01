/**
 * frontend/src/canvas/engine.ts
 * High-performance rAF rendering loop, FPS monitor, and retina resolution scaler.
 */

export interface CanvasEngineCallbacks {
  update: (dt: number, time: number) => void;
  render: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  onFpsDrop?: () => void;
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: CanvasEngineCallbacks;
  private animFrameId: number | null = null;
  private lastTime = 0;

  // FPS Monitoring
  public fps = 60;
  private frameCount = 0;
  private fpsTimer = 0;
  private lowFpsSeconds = 0;
  public showFpsHud = false;
  private prefersReducedMotion = false;

  constructor(canvas: HTMLCanvasElement, callbacks: CanvasEngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;
    this.callbacks = callbacks;

    // Check motion preference
    if (typeof window !== 'undefined') {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = motionQuery.matches;
      motionQuery.addEventListener('change', (e) => {
        this.prefersReducedMotion = e.matches;
      });

      // Ctrl+F toggle for FPS HUD
      window.addEventListener('keydown', this.handleKeyDown);
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      this.showFpsHud = !this.showFpsHud;
    }
  };

  public resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
  }

  public start(): void {
    if (this.animFrameId !== null) return;
    this.resize();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public destroy(): void {
    this.stop();
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
    }
  }

  private loop = (currentTime: number) => {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1); // clamp to max 100ms
    this.lastTime = currentTime;

    // FPS calculation
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1.0) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;

      // Monitor FPS drops below 30
      if (this.fps < 30) {
        this.lowFpsSeconds++;
        if (this.lowFpsSeconds >= 3) {
          this.callbacks.onFpsDrop?.();
          this.lowFpsSeconds = 0;
        }
      } else {
        this.lowFpsSeconds = 0;
      }
    }

    if (!this.prefersReducedMotion) {
      this.callbacks.update(dt, currentTime);
    }

    // Render pass
    const width = parseFloat(this.canvas.style.width || String(this.canvas.width));
    const height = parseFloat(this.canvas.style.height || String(this.canvas.height));

    this.ctx.clearRect(0, 0, width, height);
    this.callbacks.render(this.ctx, width, height);

    // Draw FPS counter if Ctrl+F was toggled
    if (this.showFpsHud) {
      this.drawFpsHud(width);
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private drawFpsHud(width: number): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    this.ctx.strokeStyle = '#6366f1';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(width - 110, 10, 100, 32, 6);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = this.fps >= 45 ? '#22c55e' : this.fps >= 30 ? '#f59e0b' : '#ef4444';
    this.ctx.font = '600 12px JetBrains Mono, monospace';
    this.ctx.fillText(`FPS: ${this.fps}`, width - 96, 30);
    this.ctx.restore();
  }
}
