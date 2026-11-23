import type { Rect, Vec } from "../core/types";

/**
 * 线段-矩形最近进入参数 t（0..1，slab 法）；不相交返回 null。
 * 用于“视线被挂牌截断”：射线端点在挂牌表面，之后是阴影。
 */
export function segmentRectEntryT(a: Vec, b: Vec, r: Rect): number | null {
  const minX = r.x;
  const maxX = r.x + r.w;
  const minY = r.y;
  const maxY = r.y + r.h;
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  let t0 = 0;
  let t1 = 1;

  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };

  if (!clip(-dx, a.x - minX)) return null;
  if (!clip(dx, maxX - a.x)) return null;
  if (!clip(-dy, a.y - minY)) return null;
  if (!clip(dy, maxY - a.y)) return null;
  return t0 <= t1 ? t0 : null;
}

/** 线段-矩形相交（slab 法），含端点、相切、零长线段（docs/51 §2.5）。 */
export function segmentHitsRect(a: Vec, b: Vec, r: Rect): boolean {
  return segmentRectEntryT(a, b, r) !== null;
}

/** 任一点通视即暴露：检查 Boss 眼点到玩家头/胸/脚三点。 */
export function anySegmentHitsRect(
  from: Vec,
  targets: readonly Vec[],
  rects: readonly Rect[],
): boolean {
  for (const target of targets) {
    for (const r of rects) {
      if (segmentHitsRect(from, target, r)) return true;
    }
  }
  return false;
}

/** 点到线段的最近距离（用于吸附/判定辅助）。 */
export function distancePointSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** 矩形按中心点缩放（用于旋转光束/判定框）。 */
export function rectCenter(r: Rect): Vec {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}
