export type GesturePhase = "idle" | "charging" | "ready" | "firing";

export type GestureConfig = {
  /** チャージ開始：両手距離がこの値未満（正規化 XY） */
  chargeEnterDist: number;
  /** チャージ解除：この値を超えたら idle 側へ戻す（ヒステリシス） */
  chargeExitDist: number;
  /** ready までに必要なチャージ維持時間（ms） */
  readyHoldMs: number;
  /** 発射：スケール（手首〜中指先距離）の上昇速度しきい値（1 フレームあたり） */
  fireScaleVelocity: number;
  /** 発射：両手が離れ始めたときの距離の増分しきい値（1 フレームあたり、正規化） */
  fireSeparationDelta: number;
  /** クールダウン：発射後に再チャージできない時間（ms） */
  cooldownMs: number;
  /** 距離・スケールの指数移動平均係数（0-1、大きいほど素早く追従） */
  smoothAlpha: number;
};

export const defaultGestureConfig: GestureConfig = {
  chargeEnterDist: 0.2,
  chargeExitDist: 0.26,
  readyHoldMs: 420,
  fireScaleVelocity: 0.006,
  fireSeparationDelta: 0.004,
  cooldownMs: 650,
  smoothAlpha: 0.35,
};

export type GestureOutput = {
  phase: GesturePhase;
  /** 正規化座標（0-1）の両手の中点。片手以下なら null */
  aimNorm: { x: number; y: number } | null;
  /** 正規化座標系でのビーム方向（単位ベクトル） */
  fireDirNorm: { x: number; y: number } | null;
  /** このフレームで発射イベントが立ったか */
  fired: boolean;
  /** デバッグ用の生特徴量 */
  debug: {
    pairDist: number;
    avgScale: number;
    chargeMs: number;
  };
};
