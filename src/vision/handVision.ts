import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

const HAND_LANDMARKER_TASK_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export type HandSample = {
  /** MediaPipe の handedness（無い場合あり — ジェスチャーは位置ペアで処理） */
  label: "Left" | "Right" | "Unknown";
  landmarks: NormalizedLandmark[];
};

export type HandsFrame = {
  hands: HandSample[];
  /** MediaPipe に渡したビデオタイムスタンプ（ms） */
  timestampMs: number;
  raw: HandLandmarkerResult;
};

function wasmBaseUrl(): string {
  // package バージョンに追従（必要なら .env で VITE_MEDIAPIPE_VERSION を上書き）
  const fromImport = (import.meta as ImportMeta & { env?: { VITE_MEDIAPIPE_VERSION?: string } })
    .env?.VITE_MEDIAPIPE_VERSION;
  const ver = fromImport ?? "0.10.17";
  return `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${ver}/wasm`;
}

/**
 * MediaPipe Hand Landmarker ラッパー。VIDEO モードのみ。
 */
export class HandVision {
  private landmarker: HandLandmarker | null = null;

  async init(): Promise<void> {
    if (this.landmarker) return;
    const fileset = await FilesetResolver.forVisionTasks(wasmBaseUrl());
    const opts = (delegate?: "CPU" | "GPU") =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: HAND_LANDMARKER_TASK_URL,
          ...(delegate ? { delegate } : {}),
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.35,
        minHandPresenceConfidence: 0.35,
        minTrackingConfidence: 0.35,
      });
    try {
      this.landmarker = await opts("CPU");
    } catch {
      this.landmarker = await opts();
    }
  }

  dispose(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }

  /**
   * カメラフレームを検出。timestampMs は performance.now() 等の単調増加が望ましい。
   */
  detect(video: HTMLVideoElement, timestampMs: number): HandsFrame | null {
    if (!this.landmarker) return null;
    if (video.readyState < 2) return null;
    if (video.videoWidth < 2 || video.videoHeight < 2) return null;

    const raw = this.landmarker.detectForVideo(video, timestampMs);
    const hands: HandSample[] = [];
    const n = raw.landmarks.length;
    for (let i = 0; i < n; i++) {
      const lm = raw.landmarks[i];
      const cat = raw.handednesses[i]?.[0];
      const name = cat?.categoryName;
      const label: HandSample["label"] =
        name === "Right" ? "Right" : name === "Left" ? "Left" : "Unknown";
      hands.push({ label, landmarks: lm });
    }

    return { hands, timestampMs, raw };
  }
}
