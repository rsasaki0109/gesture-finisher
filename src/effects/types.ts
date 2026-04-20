/**
 * Canvas2D エフェクトの共通インターフェース。
 * 将来 WebGL / PixiJS では別レンダラに差し替えやすいよう、Canvas に直接依存しない命名は避けつつ MVP は 2D のみ。
 */
export type Canvas2DEffect = {
  update(dtMs: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  isAlive(): boolean;
};
