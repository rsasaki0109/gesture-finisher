import type { HandSample, HandsFrame } from "../vision/handVision";
import { dist2, handPushDirXY, handScale, midpoint2, palmCenter, type Vec2 } from "../vision/geometry";
import {
  type AttackStyle,
  type GestureConfig,
  type GestureOutput,
  type GesturePhase,
  defaultGestureConfig,
} from "./gestureTypes";

/**
 * 両手を「映像の左右」でペアにする。
 * handedness が Unknown ばかりでも動くように、手のひら中心の x でソートする。
 */
function pickTwoHandsByImageX(hands: HandSample[]): [HandSample, HandSample] | null {
  if (hands.length < 2) return null;
  const sorted = [...hands].sort(
    (a, b) => palmCenter(a.landmarks).x - palmCenter(b.landmarks).x
  );
  return [sorted[0], sorted[sorted.length - 1]];
}

/** 映像内で最も大きく見える手（カメラに近いほどスケールが大きい想定） */
function pickDominantHand(hands: HandSample[]): HandSample | null {
  if (hands.length === 0) return null;
  let best = hands[0];
  let bestS = handScale(best.landmarks);
  for (let i = 1; i < hands.length; i++) {
    const s = handScale(hands[i].landmarks);
    if (s > bestS) {
      best = hands[i];
      bestS = s;
    }
  }
  return best;
}

/**
 * idle → charging → ready → firing の状態機械。
 * かめはめ波: 両手距離、螺旋丸: 片手の前出し。
 */
export class GestureEngine {
  private cfg: GestureConfig;
  private attackStyle: AttackStyle = "kamehameha";
  private phase: GesturePhase = "idle";
  private chargeStartMs: number | null = null;
  private cooldownUntilMs = 0;
  private smoothPair = 1;
  private smoothScale = 0;
  private prevPair = 1;
  private prevScale = 0;

  constructor(cfg: Partial<GestureConfig> = {}) {
    this.cfg = { ...defaultGestureConfig, ...cfg };
  }

  setConfig(patch: Partial<GestureConfig>): void {
    this.cfg = { ...this.cfg, ...patch };
  }

  setAttackStyle(style: AttackStyle): void {
    this.attackStyle = style;
  }

  getAttackStyle(): AttackStyle {
    return this.attackStyle;
  }

  getPhase(): GesturePhase {
    return this.phase;
  }

  reset(): void {
    this.phase = "idle";
    this.chargeStartMs = null;
    this.cooldownUntilMs = 0;
    this.smoothPair = 1;
    this.smoothScale = 0;
    this.prevPair = 1;
    this.prevScale = 0;
  }

  process(frame: HandsFrame | null, nowMs: number): GestureOutput {
    if (this.attackStyle === "rasengan") {
      return this.processRasengan(frame, nowMs);
    }
    return this.processKamehameha(frame, nowMs);
  }

  private processKamehameha(frame: HandsFrame | null, nowMs: number): GestureOutput {
    const emptyOut = (phase: GesturePhase): GestureOutput => ({
      phase,
      aimNorm: null,
      fireDirNorm: null,
      fired: false,
      debug: { pairDist: this.smoothPair, avgScale: this.smoothScale, chargeMs: 0 },
    });

    if (!frame) return emptyOut(this.phase);

    const pair = pickTwoHandsByImageX(frame.hands);
    if (!pair) {
      if (this.phase !== "firing" && this.phase !== "idle") {
        this.phase = "idle";
        this.chargeStartMs = null;
      }
      return emptyOut(this.phase);
    }

    const [left, right] = pair;
    const pL = palmCenter(left.landmarks);
    const pR = palmCenter(right.landmarks);
    const pairDist = dist2({ x: pL.x, y: pL.y }, { x: pR.x, y: pR.y });
    const sL = handScale(left.landmarks);
    const sR = handScale(right.landmarks);
    const avgScale = (sL + sR) / 2;

    const a = this.cfg.smoothAlpha;
    this.smoothPair = a * pairDist + (1 - a) * this.smoothPair;
    this.smoothScale = a * avgScale + (1 - a) * this.smoothScale;

    const dPair = this.smoothPair - this.prevPair;
    const dScale = this.smoothScale - this.prevScale;
    this.prevPair = this.smoothPair;
    this.prevScale = this.smoothScale;

    const mid = midpoint2({ x: pL.x, y: pL.y }, { x: pR.x, y: pR.y });
    const dirL = handPushDirXY(left.landmarks);
    const dirR = handPushDirXY(right.landmarks);
    const fireDir = normalizeVec2({
      x: dirL.x + dirR.x,
      y: dirL.y + dirR.y,
    });

    return this.runSharedFsm(nowMs, mid, fireDir, dPair, dScale, true);
  }

  private processRasengan(frame: HandsFrame | null, nowMs: number): GestureOutput {
    const emptyOut = (phase: GesturePhase): GestureOutput => ({
      phase,
      aimNorm: null,
      fireDirNorm: null,
      fired: false,
      debug: { pairDist: 0, avgScale: this.smoothScale, chargeMs: 0 },
    });

    if (!frame) return emptyOut(this.phase);

    const hand = pickDominantHand(frame.hands);
    if (!hand) {
      if (this.phase !== "firing" && this.phase !== "idle") {
        this.phase = "idle";
        this.chargeStartMs = null;
      }
      return emptyOut(this.phase);
    }

    const s = handScale(hand.landmarks);
    const a = this.cfg.smoothAlpha;
    this.smoothScale = a * s + (1 - a) * this.smoothScale;

    const dScale = this.smoothScale - this.prevScale;
    this.prevScale = this.smoothScale;

    const mid = palmCenter(hand.landmarks);
    const fireDir = handPushDirXY(hand.landmarks);

    return this.runSharedFsm(nowMs, mid, fireDir, 0, dScale, false);
  }

  /**
   * @param usePairRules かめはめ波なら true（両手距離でチャージ／キャンセル）
   */
  private runSharedFsm(
    nowMs: number,
    mid: { x: number; y: number },
    fireDir: Vec2,
    dPair: number,
    dScale: number,
    usePairRules: boolean
  ): GestureOutput {
    let chargeMs = 0;
    if (this.chargeStartMs !== null) {
      chargeMs = Math.max(0, nowMs - this.chargeStartMs);
    }

    let fired = false;

    if (nowMs < this.cooldownUntilMs && this.phase !== "firing") {
      this.phase = "idle";
      this.chargeStartMs = null;
      return {
        phase: this.phase,
        aimNorm: { x: mid.x, y: mid.y },
        fireDirNorm: fireDir,
        fired: false,
        debug: {
          pairDist: usePairRules ? this.smoothPair : 0,
          avgScale: this.smoothScale,
          chargeMs,
        },
      };
    }

    if (this.phase === "firing") {
      this.phase = "idle";
      this.chargeStartMs = null;
      return {
        phase: "idle",
        aimNorm: { x: mid.x, y: mid.y },
        fireDirNorm: fireDir,
        fired: false,
        debug: { pairDist: usePairRules ? this.smoothPair : 0, avgScale: this.smoothScale, chargeMs: 0 },
      };
    }

    const closeEnough = this.smoothPair < this.cfg.chargeEnterDist;
    const tooFar = this.smoothPair > this.cfg.chargeExitDist;
    const inChargeBand = this.smoothPair < this.cfg.chargeExitDist;

    if (usePairRules) {
      if (this.phase === "idle") {
        if (closeEnough) {
          this.phase = "charging";
          this.chargeStartMs = nowMs;
        }
      } else if (this.phase === "charging") {
        if (tooFar) {
          this.phase = "idle";
          this.chargeStartMs = null;
        } else if (inChargeBand && this.chargeStartMs !== null) {
          if (nowMs - this.chargeStartMs >= this.cfg.readyHoldMs) {
            this.phase = "ready";
            this.prevScale = this.smoothScale;
            this.prevPair = this.smoothPair;
          }
        }
      } else if (this.phase === "ready") {
        const pushOut =
          dScale > this.cfg.fireScaleVelocity || dPair > this.cfg.fireSeparationDelta;
        if (pushOut) {
          this.phase = "firing";
          fired = true;
          this.cooldownUntilMs = nowMs + this.cfg.cooldownMs;
          this.chargeStartMs = null;
        } else if (tooFar) {
          this.phase = "idle";
          this.chargeStartMs = null;
        }
      }
    } else {
      if (this.phase === "idle") {
        this.phase = "charging";
        this.chargeStartMs = nowMs;
      } else if (this.phase === "charging") {
        if (this.chargeStartMs !== null && nowMs - this.chargeStartMs >= this.cfg.readyHoldMs) {
          this.phase = "ready";
          this.prevScale = this.smoothScale;
        }
      } else if (this.phase === "ready") {
        if (dScale > this.cfg.fireScaleVelocity) {
          this.phase = "firing";
          fired = true;
          this.cooldownUntilMs = nowMs + this.cfg.cooldownMs;
          this.chargeStartMs = null;
        }
      }
    }

    if (this.phase === "charging" && this.chargeStartMs === null) {
      this.chargeStartMs = nowMs;
    }

    if (this.phase === "idle" || this.phase === "charging") {
      chargeMs = this.chargeStartMs !== null ? Math.max(0, nowMs - this.chargeStartMs) : 0;
    } else if (this.phase === "ready") {
      chargeMs = this.chargeStartMs !== null ? Math.max(0, nowMs - this.chargeStartMs) : this.cfg.readyHoldMs;
    }

    return {
      phase: this.phase,
      aimNorm: { x: mid.x, y: mid.y },
      fireDirNorm: fireDir,
      fired,
      debug: {
        pairDist: usePairRules ? this.smoothPair : 0,
        avgScale: this.smoothScale,
        chargeMs,
      },
    };
  }
}

function normalizeVec2(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return { x: 0, y: -1 };
  return { x: v.x / len, y: v.y / len };
}
