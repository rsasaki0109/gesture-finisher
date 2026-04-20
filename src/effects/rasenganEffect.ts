import type { Canvas2DEffect } from "./types";

type Spark = {
  ang: number;
  rad: number;
  speed: number;
  phase: number;
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
 * 螺旋丸風：球体コア＋回転する渦リング＋チリ粒子。
 */
export class RasenganEffect implements Canvas2DEffect {
  private ageMs = 0;
  private readonly minTotalMs: number;
  private readonly fadeOutMs: number;
  private readonly drift: number;
  private readonly baseR: number;
  private readonly rand: () => number;
  private sparks: Spark[] = [];

  constructor(
    private origin: { x: number; y: number },
    private dir: { x: number; y: number },
    seed: number,
    opts?: { minTotalMs?: number; fadeOutMs?: number; drift?: number; baseR?: number }
  ) {
    this.minTotalMs = opts?.minTotalMs ?? 640;
    this.fadeOutMs = opts?.fadeOutMs ?? 260;
    this.drift = opts?.drift ?? 0.42;
    this.baseR = opts?.baseR ?? 52;
    this.rand = mulberry32((seed ^ 0x85ebca6b) >>> 0);
    for (let i = 0; i < 36; i++) {
      this.sparks.push({
        ang: this.rand() * Math.PI * 2,
        rad: 0.35 + this.rand() * 0.65,
        speed: 0.8 + this.rand() * 1.4,
        phase: this.rand() * Math.PI * 2,
      });
    }
  }

  update(dtMs: number): void {
    this.ageMs += dtMs;
    const t = dtMs * 0.001;
    for (const s of this.sparks) {
      s.ang += t * s.speed * (1.6 + 0.4 * Math.sin(this.ageMs * 0.003 + s.phase));
    }
  }

  isAlive(): boolean {
    return this.ageMs < this.minTotalMs + this.fadeOutMs;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const u = Math.min(1, this.ageMs / 180);
    const fadeIn = u;
    const fadeOut =
      this.ageMs > this.minTotalMs
        ? Math.max(0, 1 - (this.ageMs - this.minTotalMs) / this.fadeOutMs)
        : 1;
    const alpha = fadeIn * fadeOut;

    const travel = Math.min(220, (this.ageMs / 1000) * 280 * this.drift);
    const cx = this.origin.x + this.dir.x * travel;
    const cy = this.origin.y + this.dir.y * travel;
    const spin = this.ageMs * 0.0055;
    const pulse = 1 + 0.06 * Math.sin(this.ageMs * 0.022);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(cx, cy);
    ctx.rotate(spin * 0.35);

    const r = this.baseR * pulse * (0.85 + 0.15 * fadeIn);

    const ball = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    ball.addColorStop(0, `rgba(255, 255, 255, ${0.95 * alpha})`);
    ball.addColorStop(0.25, `rgba(200, 240, 255, ${0.75 * alpha})`);
    ball.addColorStop(0.55, `rgba(120, 200, 255, ${0.45 * alpha})`);
    ball.addColorStop(1, `rgba(40, 120, 220, 0)`);
    ctx.fillStyle = ball;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    for (let ring = 0; ring < 3; ring++) {
      const k = ring / 3;
      const rx = r * (1.05 - k * 0.12);
      const ry = r * (0.38 + k * 0.08);
      ctx.save();
      ctx.rotate(spin * (1.2 + k * 0.5) + ring * 1.7);
      ctx.scale(1, 0.55 + k * 0.15);
      const g = ctx.createLinearGradient(-rx, 0, rx, 0);
      g.addColorStop(0, `rgba(180, 230, 255, 0)`);
      g.addColorStop(0.5, `rgba(220, 250, 255, ${0.5 * alpha})`);
      g.addColorStop(1, `rgba(180, 230, 255, 0)`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 3.2 - k;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const s of this.sparks) {
      const rr = r * s.rad;
      const x = Math.cos(s.ang) * rr;
      const y = Math.sin(s.ang) * rr * 0.72;
      const a = (0.35 + 0.4 * (1 - s.rad)) * alpha;
      ctx.fillStyle = `rgba(230, 250, 255, ${a})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.4 + s.rad * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
