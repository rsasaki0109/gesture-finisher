import { CameraManager } from "../camera/cameraManager";
import { GestureEngine } from "../gesture/gestureEngine";
import type { AttackStyle, GesturePhase } from "../gesture/gestureTypes";
import { EffectStack } from "../effects/effectStack";
import { KamehamehaEffect } from "../effects/kamehamehaEffect";
import { RasenganEffect } from "../effects/rasenganEffect";
import { HandVision } from "../vision/handVision";

export type AppElements = {
  root: HTMLElement;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  statusEl: HTMLElement;
  phaseEl: HTMLElement;
  helpEl: HTMLElement;
  modeKameBtn: HTMLButtonElement;
  modeRasenBtn: HTMLButtonElement;
  startBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
};

const HELP: Record<AttackStyle, string> = {
  kamehameha:
    "【かめはめ波・両手】① 画面上部で「かめはめ波」を選ぶ。② **両手**をカメラに見せ、**くっつける**（検出が「手 2」）。③ 「ready（発射可）」までキープ。④ **カメラに向かってグッと押し出す** とビーム。",
  rasengan:
    "【螺旋丸・片手】① 「螺旋丸」を選ぶ。② **利き手ひとつ**をカメラに向け、**少し止める**（手 1 本以上で OK）。③ ready になったら **手を前に突き出す** と球が飛ぶ。",
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
        <div class="state" id="phase">状態: 初期化中…</div>
        <div class="help" id="help">${HELP.kamehameha}</div>
        <div class="hint" id="status">「開始」でカメラを許可してください。</div>
      </div>
      <div class="hud-actions">
        <button id="start" type="button">開始</button>
        <button id="stop" type="button" disabled>停止</button>
      </div>
    </div>
    <div class="stage">
      <video id="cam" playsinline muted></video>
      <canvas id="fx"></canvas>
    </div>
  `;

  const video = root.querySelector<HTMLVideoElement>("#cam")!;
  const canvas = root.querySelector<HTMLCanvasElement>("#fx")!;
  const statusEl = root.querySelector<HTMLElement>("#status")!;
  const phaseEl = root.querySelector<HTMLElement>("#phase")!;
  const helpEl = root.querySelector<HTMLElement>("#help")!;
  const modeKameBtn = root.querySelector<HTMLButtonElement>("#mode-kh")!;
  const modeRasenBtn = root.querySelector<HTMLButtonElement>("#mode-rs")!;
  const startBtn = root.querySelector<HTMLButtonElement>("#start")!;
  const stopBtn = root.querySelector<HTMLButtonElement>("#stop")!;

  return {
    root,
    video,
    canvas,
    statusEl,
    phaseEl,
    helpEl,
    modeKameBtn,
    modeRasenBtn,
    startBtn,
    stopBtn,
  };
}

function phaseLabel(p: GesturePhase): string {
  switch (p) {
    case "idle":
      return "idle（待機）";
    case "charging":
      return "charging（チャージ中）";
    case "ready":
      return "ready（発射可）";
    case "firing":
      return "firing（発射）";
    default:
      return String(p);
  }
}

function modeShort(s: AttackStyle): string {
  return s === "kamehameha" ? "かめはめ波" : "螺旋丸";
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
  }

  private setAttackStyle(style: AttackStyle): void {
    this.attackStyle = style;
    this.gesture.setAttackStyle(style);
    this.gesture.reset();
    this.els.helpEl.textContent = HELP[style];
    this.els.modeKameBtn.classList.toggle("active", style === "kamehameha");
    this.els.modeRasenBtn.classList.toggle("active", style === "rasengan");
    if (!this.running) {
      this.setStatus("「開始」でカメラを許可してください。");
    }
  }

  async init(): Promise<void> {
    this.setStatus("MediaPipe を読み込み中…");
    await this.vision.init();
    this.setStatus("準備完了。「開始」を押してカメラを許可してください。");
    this.els.phaseEl.textContent = `［${modeShort(this.attackStyle)}］状態: idle（待機）`;
  }

  private setStatus(text: string): void {
    this.els.statusEl.textContent = text;
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
    this.els.phaseEl.textContent = `［${modeShort(this.attackStyle)}］状態: idle（待機）`;
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

    this.els.phaseEl.textContent = `［${modeShort(this.attackStyle)}］${phaseLabel(g.phase)} / 手 ${handN} / charge ${g.debug.chargeMs.toFixed(
      0
    )} ms`;

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
