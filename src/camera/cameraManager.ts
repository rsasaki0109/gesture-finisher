const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 480 },
    frameRate: { ideal: 30 },
    facingMode: "user",
  },
  audio: false,
};

/**
 * getUserMedia によるカメラ入力。video 要素へのバインドのみ担当。
 */
export class CameraManager {
  private stream: MediaStream | null = null;

  async start(
    video: HTMLVideoElement,
    constraints: MediaStreamConstraints = DEFAULT_CONSTRAINTS
  ): Promise<void> {
    this.stop();
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.stream = stream;
    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;
    await video.play();
  }

  stop(): void {
    if (!this.stream) return;
    for (const t of this.stream.getTracks()) {
      t.stop();
    }
    this.stream = null;
  }

  isActive(): boolean {
    return this.stream !== null;
  }
}
