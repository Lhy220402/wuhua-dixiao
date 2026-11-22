import { BALANCE } from "../config/balance";
import type { Rect } from "../core/types";

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

/** 竖直光束与玩家碰撞盒重叠（判定宽 6px）。 */
export function beamHitsPlayer(
  beamX: number,
  top: number,
  bottom: number,
  width: number,
  player: Rect,
): boolean {
  if (bottom <= top) return false;
  const left = beamX - width / 2;
  const right = beamX + width / 2;
  return (
    player.x < right &&
    player.x + player.w > left &&
    player.y < bottom &&
    player.y + player.h > top
  );
}
