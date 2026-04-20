import type { Canvas2DEffect } from "./types";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
};

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * かめはめ波風ビーム：グラデーションコア + 簡易パーティクル。
 * 最低でも minTotalMs は維持（MVP 要件 0.5s+）。
 */
export class KamehamehaEffect implements Canvas2DEffect {
  private ageMs = 0;
  private readonly minTotalMs: number;
  private readonly fadeOutMs: number;
  private readonly beamSpeed: number;
  private readonly maxReach: number;
  private particles: Particle[] = [];
  private readonly rand: () => number;

  constructor(
    private origin: { x: number; y: number },
    private dir: { x: number; y: number },
    seed: number,
    opts?: {
      minTotalMs?: number;
      fadeOutMs?: number;
      beamSpeed?: number;
      maxReach?: number;
    }
  ) {
    this.minTotalMs = opts?.minTotalMs ?? 620;
    this.fadeOutMs = opts?.fadeOutMs ?? 280;
    this.beamSpeed = opts?.beamSpeed ?? 1.65;
    this.maxReach = opts?.maxReach ?? 1.15;
    this.rand = mulberry32((seed ^ 0x9e3779b9) >>> 0);
    this.spawnBurst(28);
  }

  private spawnBurst(n: number): void {
    const { x, y } = this.origin;
    const { x: dx, y: dy } = this.dir;
    const px = -dy;
    const py = dx;
    for (let i = 0; i < n; i++) {
      const spread = (this.rand() - 0.5) * 42;
      const speed = 0.35 + this.rand() * 1.1;
      const forward = 0.15 + this.rand() * 0.55;
      this.particles.push({
        x: x + px * spread * 0.02,
        y: y + py * spread * 0.02,
        vx: dx * forward * speed + px * (this.rand() - 0.5) * 0.35,
        vy: dy * forward * speed + py * (this.rand() - 0.5) * 0.35,
        life: 0,
        max: 320 + this.rand() * 420,
        size: 1.2 + this.rand() * 2.4,
      });
    }
  }

  update(dtMs: number): void {
    this.ageMs += dtMs;
    const wobble = Math.sin(this.ageMs * 0.018) * 6;

    for (const p of this.particles) {
      p.life += dtMs;
      const t = p.life / p.max;
      const drag = Math.max(0.2, 1 - t);
      p.x += p.vx * dtMs * 0.06 * drag;
      p.y += p.vy * dtMs * 0.06 * drag;
      p.vx += (this.dir.x * 0.02 + wobble * 0.0003) * dtMs;
      p.vy += (this.dir.y * 0.02) * dtMs;
    }

    if (this.ageMs < this.minTotalMs && this.rand() < 0.42) {
      this.spawnBurst(3);
    }

    this.particles = this.particles.filter((p) => p.life < p.max + 120);
  }

  isAlive(): boolean {
    return this.ageMs < this.minTotalMs + this.fadeOutMs;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const t = this.ageMs;
    const reach = Math.min(this.maxReach, (t * this.beamSpeed) / 1000);
    const headX = this.origin.x + this.dir.x * reach * Math.max(ctx.canvas.width, ctx.canvas.height);
    const headY = this.origin.y + this.dir.y * reach * Math.max(ctx.canvas.width, ctx.canvas.height);

    const fadeIn = Math.min(1, t / 120);
    const fadeOut = t > this.minTotalMs ? Math.max(0, 1 - (t - this.minTotalMs) / this.fadeOutMs) : 1;
    const alpha = fadeIn * fadeOut;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const steps = 5;
    for (let s = 0; s < steps; s++) {
      const k = s / (steps - 1);
      const width = 110 * (1 - k * 0.65) + 18;
      const grad = ctx.createLinearGradient(
        this.origin.x,
        this.origin.y,
        headX,
        headY
      );
      const a0 = (0.22 - k * 0.05) * alpha;
      const a1 = (0.55 - k * 0.12) * alpha;
      grad.addColorStop(0, `rgba(180, 240, 255, ${a0})`);
      grad.addColorStop(0.35, `rgba(120, 200, 255, ${a1})`);
      grad.addColorStop(0.7, `rgba(80, 140, 255, ${a1 * 0.85})`);
      grad.addColorStop(1, `rgba(40, 90, 255, 0)`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(this.origin.x, this.origin.y);
      ctx.lineTo(headX, headY);
      ctx.stroke();
    }

    const coreGrad = ctx.createLinearGradient(this.origin.x, this.origin.y, headX, headY);
    coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.85 * alpha})`);
    coreGrad.addColorStop(0.4, `rgba(200, 245, 255, ${0.55 * alpha})`);
    coreGrad.addColorStop(1, `rgba(120, 200, 255, 0)`);
    ctx.strokeStyle = coreGrad;
    ctx.lineWidth = 26 * alpha + 6;
    ctx.beginPath();
    ctx.moveTo(this.origin.x, this.origin.y);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    for (const p of this.particles) {
      const u = p.life / p.max;
      const a = (1 - u) * 0.85 * alpha;
      ctx.fillStyle = `rgba(200, 240, 255, ${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - u * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
