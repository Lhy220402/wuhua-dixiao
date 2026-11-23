import { BALANCE } from "../config/balance";
import type { Rect, Vec } from "../core/types";
import { segmentHitsRect } from "./geom";

export interface ExposureState {
  value: number;
  warned: boolean;
}

export interface ExposureOptions {
  threshold?: number;
  warnAt?: number;
  rate?: number;
  decay?: number;
  rateMul?: number;
}

/**
 * 纯函数：暴露读条（docs/10 §2.3 / docs/20 §2.3）。
 * 通视 +1.0/s × buff 乘数；离开视线按 3× 回落；阈值 2.5s。
 */
export function updateExposure(
  dt: number,
  visible: boolean,
  prev: ExposureState,
  opts: ExposureOptions = {},
): ExposureState {
  const threshold = opts.threshold ?? BALANCE.level1.exposureThreshold;
  const warnAt = opts.warnAt ?? BALANCE.level1.exposureWarnAt;
  const rate = (opts.rate ?? BALANCE.level1.exposureRate) * (opts.rateMul ?? 1);
  const decay = opts.decay ?? BALANCE.level1.exposureDecay;
  let value = prev.value;
  if (visible) value += rate * dt;
  else value -= rate * decay * dt;
  value = Math.max(0, Math.min(threshold, value));
  return { value, warned: value >= threshold * warnAt };
}

export function exposureRatio(value: number, threshold = BALANCE.level1.exposureThreshold): number {
  return Math.max(0, Math.min(1, value / threshold));
}

export function exposureFailed(value: number, threshold = BALANCE.level1.exposureThreshold): boolean {
  return value >= threshold;
}

/** 玩家碰撞盒内 3×3 采样点：扇形视线用身体任一点判定，避免只测中心漏判。 */
export function playerSamplePoints(body: Rect): Vec[] {
  const insetX = Math.min(2, body.w / 4);
  const insetY = Math.min(2, body.h / 4);
  const xs = [body.x + insetX, body.x + body.w / 2, body.x + body.w - insetX];
  const ys = [body.y + insetY, body.y + body.h / 2, body.y + body.h - insetY];
  const points: Vec[] = [];
  for (const y of ys) for (const x of xs) points.push({ x, y });
  return points;
}

/**
 * 扇形视线命中（docs/02 §2.4 gazeFanHalfAngle）：
 * 玩家身体任一点落在扇形角度内，且到瞳孔的连线没有被挂牌挡住 → 暴露。
 * 挂牌后的斜向阴影因此天然安全（不再要求光束竖直）。
 */
export function gazeFanHitsPlayer(
  eye: Vec,
  dir: Vec,
  halfAngle: number,
  body: Rect,
  blockers: readonly Rect[] = [],
): boolean {
  if (halfAngle <= 0) return false;
  const cosHalf = Math.cos(halfAngle);
  for (const p of playerSamplePoints(body)) {
    const vx = p.x - eye.x;
    const vy = p.y - eye.y;
    const len = Math.hypot(vx, vy);
    if (len < 1) continue;
    const cos = (vx * dir.x + vy * dir.y) / len;
    if (cos < cosHalf) continue;
    let blocked = false;
    for (const r of blockers) {
      if (segmentHitsRect(eye, p, r)) {
        blocked = true;
        break;
      }
    }
    if (!blocked) return true;
  }
  return false;
}
