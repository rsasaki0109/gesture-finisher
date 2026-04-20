import type { Canvas2DEffect } from "./types";

/** アクティブな Canvas2D エフェクトを蓄積・更新 */
export class EffectStack {
  private effects: Canvas2DEffect[] = [];

  push(effect: Canvas2DEffect): void {
    this.effects.push(effect);
  }

  update(dtMs: number): void {
    for (const e of this.effects) e.update(dtMs);
    this.effects = this.effects.filter((e) => e.isAlive());
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const e of this.effects) e.render(ctx);
  }
}
