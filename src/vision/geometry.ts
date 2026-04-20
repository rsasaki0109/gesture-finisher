import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type Vec2 = { x: number; y: number };
export type Vec3 = { x: number; y: number; z: number };

const WRIST = 0;
const MIDDLE_MCP = 9;
const MIDDLE_TIP = 12;

export function landmarkToVec3(l: NormalizedLandmark): Vec3 {
  return { x: l.x, y: l.y, z: l.z };
}

export function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function dist3(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}

export function midpoint2(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function normalize2(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return { x: 1, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/** 手のひら付近の代表点（手首と中指 MCP の中点） */
export function palmCenter(landmarks: NormalizedLandmark[]): Vec3 {
  const a = landmarks[WRIST];
  const b = landmarks[MIDDLE_MCP];
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

/** カメラに近づけると伸びる指標：手首〜中指先の距離（正規化座標） */
export function handScale(landmarks: NormalizedLandmark[]): number {
  return dist3(landmarkToVec3(landmarks[WRIST]), landmarkToVec3(landmarks[MIDDLE_TIP]));
}

/** 手の「押し出し」方向（XY 上の中指方向） */
export function handPushDirXY(landmarks: NormalizedLandmark[]): Vec2 {
  const w = landmarkToVec3(landmarks[WRIST]);
  const t = landmarkToVec3(landmarks[MIDDLE_TIP]);
  return normalize2({ x: t.x - w.x, y: t.y - w.y });
}
