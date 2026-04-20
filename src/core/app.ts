import { CameraManager } from "../camera/cameraManager";
import { GestureEngine } from "../gesture/gestureEngine";
import {
  type AttackStyle,
  type GesturePhase,
  type GestureOutput,
  defaultGestureConfig,
} from "../gesture/gestureTypes";
import { EffectStack } from "../effects/effectStack";
import { KamehamehaEffect } from "../effects/kamehamehaEffect";
import { RasenganEffect } from "../effects/rasenganEffect";
import { HandVision } from "../vision/handVision";
import { ILLU_KAMEHAMEHA, ILLU_RASENGAN } from "./poseIllustrations";

export type AppElements = {
  root: HTMLElement;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  statusEl: HTMLElement;
  phasePanel: HTMLElement;
  phaseTitle: HTMLElement;
  phaseDetail: HTMLElement;
  phaseProgress: HTMLElement;
  phaseProgressFill: HTMLElement;
  phaseSteps: HTMLElement;
  phaseTech: HTMLElement;
  helpEl: HTMLElement;
  modeKameBtn: HTMLButtonElement;
  modeRasenBtn: HTMLButtonElement;
  startBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
  poseGuide: HTMLElement;
  posePanelKame: HTMLElement;
  posePanelRasen: HTMLElement;
};

const HELP: Record<AttackStyle, string> = {
  kamehameha:
    "右の図が目安です。①「開始」② 両手を前でくっつける（手の本数は上のパネル）③「発射OK」でカメラに押し出す。",
  rasengan:
    "右の図が目安です。①「開始」② 片手のひらをカメラに向けて少し止める ③「発射OK」で前に突き出す。",
};

function layout(root: HTMLElement): AppElements {
  root.innerHTML = `
    <div class="hud">
      <div class="hud-main">
        <div class="mode-bar" role="group" aria-label="技の選択">
          <span class="mode-label">技</span>
          <button type="button" class="mode-btn active" id="mode-kh">かめはめ波（両手）</button>
          <button type="button" class="mode-btn" id="mode-rs">螺旋丸（片手）</button>
        </div>
        <div class="phase-panel" id="phase-panel" data-phase="idle" data-running="false">
          <div class="phase-panel-head">
            <span class="phase-badge" id="phase-badge">現在の状態</span>
            <span class="phase-tech" id="phase-tech">かめはめ波</span>
          </div>
          <h2 class="phase-title" id="phase-title" aria-live="polite">準備中</h2>
          <p class="phase-detail" id="phase-detail">MediaPipe を待っています…</p>
          <div class="phase-progress" id="phase-progress" aria-hidden="true">
            <div class="phase-progress-fill" id="phase-progress-fill"></div>
          </div>
          <ol class="phase-steps" id="phase-steps">
            <li data-step="idle">① 待機</li>
            <li data-step="charging">② チャージ</li>
            <li data-step="ready">③ 発射OK</li>
            <li data-step="firing">④ 発射</li>
          </ol>
        </div>
        <div class="help" id="help">${HELP.kamehameha}</div>
        <div class="hint" id="status">「開始」でカメラを許可してください。</div>
      </div>
      <div class="hud-actions">
        <button id="start" type="button">開始</button>
        <button id="stop" type="button" disabled>停止</button>
      </div>
    </div>
    <div class="content-row">
      <div class="stage">
        <video id="cam" playsinline muted></video>
        <canvas id="fx"></canvas>
      </div>
      <aside class="pose-guide" id="pose-guide" data-phase="idle" data-live="false" aria-label="ポーズの例">
        <h3 class="pose-guide-title">ポーズの例（こんな感じ）</h3>
        <p class="pose-guide-lead">迷ったら<strong>右のイラスト</strong>と同じ形を真似してください。明るい場所・手が画面に入る距離がコツです。</p>
        <div class="pose-panel" id="pose-panel-kh">
          <div class="pose-illu">${ILLU_KAMEHAMEHA}</div>
        </div>
        <div class="pose-panel is-hidden" id="pose-panel-rs">
          <div class="pose-illu">${ILLU_RASENGAN}</div>
        </div>
      </aside>
    </div>
  `;

  const video = root.querySelector<HTMLVideoElement>("#cam")!;
  const canvas = root.querySelector<HTMLCanvasElement>("#fx")!;
  const statusEl = root.querySelector<HTMLElement>("#status")!;
  const phasePanel = root.querySelector<HTMLElement>("#phase-panel")!;
  const phaseTitle = root.querySelector<HTMLElement>("#phase-title")!;
  const phaseDetail = root.querySelector<HTMLElement>("#phase-detail")!;
  const phaseProgress = root.querySelector<HTMLElement>("#phase-progress")!;
  const phaseProgressFill = root.querySelector<HTMLElement>("#phase-progress-fill")!;
  const phaseSteps = root.querySelector<HTMLElement>("#phase-steps")!;
  const phaseTech = root.querySelector<HTMLElement>("#phase-tech")!;
  const helpEl = root.querySelector<HTMLElement>("#help")!;
  const modeKameBtn = root.querySelector<HTMLButtonElement>("#mode-kh")!;
  const modeRasenBtn = root.querySelector<HTMLButtonElement>("#mode-rs")!;
  const startBtn = root.querySelector<HTMLButtonElement>("#start")!;
  const stopBtn = root.querySelector<HTMLButtonElement>("#stop")!;
  const poseGuide = root.querySelector<HTMLElement>("#pose-guide")!;
  const posePanelKame = root.querySelector<HTMLElement>("#pose-panel-kh")!;
  const posePanelRasen = root.querySelector<HTMLElement>("#pose-panel-rs")!;

  return {
    root,
    video,
    canvas,
    statusEl,
    phasePanel,
    phaseTitle,
    phaseDetail,
    phaseProgress,
    phaseProgressFill,
    phaseSteps,
    phaseTech,
    helpEl,
    modeKameBtn,
    modeRasenBtn,
    startBtn,
    stopBtn,
    poseGuide,
    posePanelKame,
    posePanelRasen,
  };
}

function modeShort(s: AttackStyle): string {
  return s === "kamehameha" ? "かめはめ波" : "螺旋丸";
}

function phaseUiCopy(
  phase: GesturePhase,
  style: AttackStyle,
  handN: number,
  chargeMs: number
): { title: string; detail: string; progress: number } {
  const hold = defaultGestureConfig.readyHoldMs;
  const needHands = style === "kamehameha" ? 2 : 1;
  const handOk = handN >= needHands;
  const handHint =
    style === "kamehameha"
      ? `いま検出されている手: ${handN} 本（目安 ${needHands} 本）`
      : `いま検出されている手: ${handN} 本（目安 ${needHands} 本以上）`;

  switch (phase) {
    case "idle":
      return {
        title: "待機",
        detail: handOk
          ? `${handHint}。右の図のポーズに近づけるとチャージが始まります。`
          : `${handHint}。右の図のように手をカメラの前に出してください。`,
        progress: 0,
      };
    case "charging": {
      const p = Math.min(100, Math.round((chargeMs / hold) * 100));
      return {
        title: "チャージ中",
        detail: `キープ中… あと約 ${Math.max(0, Math.ceil(hold - chargeMs))} ms で「発射OK」へ。`,
        progress: p,
      };
    }
    case "ready":
      return {
        title: "発射 OK",
        detail: "いまがチャンス。カメラに向かってグッと押し出す！",
        progress: 100,
      };
    case "firing":
      return {
        title: "発射！",
        detail: "エフェクト表示中。次のチャージまで一瞬お待ちください。",
        progress: 100,
      };
    default:
      return { title: String(phase), detail: "", progress: 0 };
  }
}

function applyPhaseStepActive(stepsEl: HTMLElement, phase: GesturePhase): void {
  for (const li of stepsEl.querySelectorAll("li")) {
    const step = li.getAttribute("data-step");
    li.classList.toggle("active", step === phase);
    li.classList.toggle("done", isStepDone(step, phase));
  }
}

function isStepDone(step: string | null, current: GesturePhase): boolean {
  const order = ["idle", "charging", "ready", "firing"] as const;
  const si = order.indexOf(step as (typeof order)[number]);
  const ci = order.indexOf(current);
  if (si < 0 || ci < 0) return false;
  return si < ci;
}

/**
 * メインループ：camera → vision → gesture → effects のパイプライン。
 */
export class GestureFinisherApp {
  private readonly camera = new CameraManager();
  private readonly vision = new HandVision();
  private readonly gesture = new GestureEngine();
  private readonly effects = new EffectStack();

  private els: AppElements;
  private raf = 0;
  private running = false;
  private lastTs = 0;
  private fireSeed = 1;
  private attackStyle: AttackStyle = "kamehameha";
  /** 自撮り表示とランドマークの左右を一致させる */
  private readonly mirrorX = true;

  constructor(root: HTMLElement) {
    this.els = layout(root);
    this.els.video.style.transform = this.mirrorX ? "scaleX(-1)" : "";

    this.els.modeKameBtn.addEventListener("click", () => this.setAttackStyle("kamehameha"));
    this.els.modeRasenBtn.addEventListener("click", () => this.setAttackStyle("rasengan"));

    this.els.startBtn.addEventListener("click", () => void this.start());
    this.els.stopBtn.addEventListener("click", () => this.stop());

    window.addEventListener("resize", () => this.resizeCanvas());

    this.syncPosePanels();
  }

  private setAttackStyle(style: AttackStyle): void {
    this.attackStyle = style;
    this.gesture.setAttackStyle(style);
    this.gesture.reset();
    this.els.helpEl.textContent = HELP[style];
    this.els.modeKameBtn.classList.toggle("active", style === "kamehameha");
    this.els.modeRasenBtn.classList.toggle("active", style === "rasengan");
    this.els.phaseTech.textContent = modeShort(style);
    this.syncPosePanels();
    if (!this.running) {
      this.setStatus("「開始」でカメラを許可してください。");
      this.setPhasePanelAfterInit();
    }
  }

  async init(): Promise<void> {
    this.setStatus("MediaPipe を読み込み中…");
    await this.vision.init();
    this.setStatus("準備完了。「開始」を押してカメラを許可してください。");
    this.setPhasePanelAfterInit();
  }

  private setStatus(text: string): void {
    this.els.statusEl.textContent = text;
  }

  private syncPosePanels(): void {
    const kh = this.attackStyle === "kamehameha";
    this.els.posePanelKame.classList.toggle("is-hidden", !kh);
    this.els.posePanelRasen.classList.toggle("is-hidden", kh);
  }

  private setPhasePanelAfterInit(): void {
    this.els.phasePanel.dataset.phase = "idle";
    this.els.phasePanel.dataset.running = "false";
    this.els.poseGuide.dataset.phase = "idle";
    this.els.poseGuide.dataset.live = "false";
    this.els.phaseTech.textContent = modeShort(this.attackStyle);
    this.els.phaseTitle.textContent = "カメラ待ち";
    this.els.phaseDetail.textContent =
      "「開始」でカメラを許可すると、左のパネルが段階を表示します。**右のイラスト**と同じポーズを真似してください。";
    this.els.phaseProgressFill.style.width = "0%";
    applyPhaseStepActive(this.els.phaseSteps, "idle");
    for (const li of this.els.phaseSteps.querySelectorAll("li")) {
      li.classList.remove("done");
    }
  }

  private setPhasePanelStopped(): void {
    this.els.phasePanel.dataset.phase = "idle";
    this.els.phasePanel.dataset.running = "false";
    this.els.poseGuide.dataset.phase = "idle";
    this.els.poseGuide.dataset.live = "false";
    this.els.phaseTech.textContent = modeShort(this.attackStyle);
    this.els.phaseTitle.textContent = "停止中";
    this.els.phaseDetail.textContent = "「開始」で再開。上のステップはまたライブで動きます。";
    this.els.phaseProgressFill.style.width = "0%";
    applyPhaseStepActive(this.els.phaseSteps, "idle");
    for (const li of this.els.phaseSteps.querySelectorAll("li")) {
      li.classList.remove("done");
    }
  }

  private refreshPhasePanelLive(g: GestureOutput, handN: number): void {
    const { title, detail, progress } = phaseUiCopy(
      g.phase,
      this.attackStyle,
      handN,
      g.debug.chargeMs
    );
    this.els.phasePanel.dataset.phase = g.phase;
    this.els.phasePanel.dataset.running = "true";
    this.els.poseGuide.dataset.phase = g.phase;
    this.els.poseGuide.dataset.live = "true";
    this.els.phaseTitle.textContent = title;
    this.els.phaseDetail.textContent = detail;
    this.els.phaseProgressFill.style.width = `${progress}%`;
    this.els.phaseTech.textContent = modeShort(this.attackStyle);
    applyPhaseStepActive(this.els.phaseSteps, g.phase);
  }

  private resizeCanvas(): void {
    const stage = this.els.canvas.parentElement;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.els.canvas.width = Math.floor(rect.width * dpr);
    this.els.canvas.height = Math.floor(rect.height * dpr);
    this.els.canvas.style.width = `${rect.width}px`;
    this.els.canvas.style.height = `${rect.height}px`;
    const ctx = this.els.canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private normToCanvas(nx: number, ny: number): { x: number; y: number } {
    const rect = this.els.canvas.getBoundingClientRect();
    const x = (this.mirrorX ? 1 - nx : nx) * rect.width;
    const y = ny * rect.height;
    return { x, y };
  }

  private dirToCanvas(dx: number, dy: number): { x: number; y: number } {
    const vx = this.mirrorX ? -dx : dx;
    return { x: vx, y: dy };
  }

  private async start(): Promise<void> {
    if (this.running) return;
    try {
      this.resizeCanvas();
      await this.camera.start(this.els.video);
      this.running = true;
      this.lastTs = performance.now();
      this.els.startBtn.disabled = true;
      this.els.stopBtn.disabled = false;
      const tip =
        this.attackStyle === "kamehameha"
          ? "検出中。**両手**をカメラに見せてください（手 2）。"
          : "検出中。**片手**をカメラに向けてください。";
      this.setStatus(tip);
      this.loop();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.setStatus(`カメラ起動に失敗しました: ${msg}`);
    }
  }

  private stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.camera.stop();
    this.gesture.reset();
    this.els.startBtn.disabled = false;
    this.els.stopBtn.disabled = true;
    const ctx = this.els.canvas.getContext("2d");
    if (ctx) {
      const r = this.els.canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
    }
    this.setStatus("停止しました。");
    this.setPhasePanelStopped();
  }

  private loop = (): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = Math.min(32, now - this.lastTs);
    this.lastTs = now;

    const ctx = this.els.canvas.getContext("2d");
    if (!ctx) return;

    const rect = this.els.canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    const frame = this.vision.detect(this.els.video, now);
    const g = this.gesture.process(frame, now);
    const handN = frame?.hands.length ?? 0;

    this.refreshPhasePanelLive(g, handN);

    if (g.fired && g.aimNorm && g.fireDirNorm) {
      const o = this.normToCanvas(g.aimNorm.x, g.aimNorm.y);
      const d = this.dirToCanvas(g.fireDirNorm.x, g.fireDirNorm.y);
      const len = Math.hypot(d.x, d.y) || 1;
      const dir = { x: d.x / len, y: d.y / len };
      const seed = this.fireSeed++;
      if (this.attackStyle === "kamehameha") {
        this.effects.push(new KamehamehaEffect(o, dir, seed));
      } else {
        this.effects.push(new RasenganEffect(o, dir, seed));
      }
    }

    this.effects.update(dt);
    this.effects.render(ctx);
  };

  dispose(): void {
    this.stop();
    this.vision.dispose();
  }
}
