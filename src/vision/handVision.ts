import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

const HAND_LANDMARKER_TASK_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export type HandSample = {
  /** MediaPipe の handedness ラベル（映像上の左右） */
  label: "Left" | "Right";
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
    this.landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: HAND_LANDMARKER_TASK_URL,
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
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

    const raw = this.landmarker.detectForVideo(video, timestampMs);
    const hands: HandSample[] = [];
    const n = raw.landmarks.length;
    for (let i = 0; i < n; i++) {
      const lm = raw.landmarks[i];
      const cat = raw.handednesses[i]?.[0];
      const label = cat?.categoryName === "Right" ? "Right" : "Left";
      hands.push({ label, landmarks: lm });
    }

    return { hands, timestampMs, raw };
  }
}
