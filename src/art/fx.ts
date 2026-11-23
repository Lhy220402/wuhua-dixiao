import type { Rect } from "../core/types";
import { getPalette } from "./palette";
import { circle, ellipse, line, poly, rect, text, type KCtx } from "./draw";

export interface GazeFanDrawOpt {
  eye: { x: number; y: number };
  /** 扇形边界采样端点（-halfAngle → +halfAngle） */
  fan: readonly { x: number; y: number }[];
  /** 中心射线终点（被挂牌/地面截断） */
  end: { x: number; y: number };
  halfAngle: number;
  active: boolean;
  telegraph: boolean;
  visualWidth: number;
  beamWidth: number;
}

/**
 * 笑长的扇形视线（docs/02 §2.4：从瞳孔射出的旋转扇形）。
 * 渲染：视线扇形填充 + 两条边界 + 中心核心光束；挂牌遮挡由系统算好端点，这里只画。
 */
export function drawGazeFan(k: KCtx, opt: GazeFanDrawOpt): void {
  const pal = getPalette(k);
  const { eye, fan, end } = opt;
  if (fan.length < 2) return;
  const first = fan[0]!;
  const last = fan[fan.length - 1]!;

  if (opt.telegraph) {
    // 预警期：只画扇形轮廓 + 中心落点，不填充
    for (let i = 0; i < fan.length - 1; i++) {
      const a = fan[i]!;
      const b = fan[i + 1]!;
      line(k, a.x, a.y, b.x, b.y, pal.laser, 1, 0.28);
    }
    line(k, eye.x, eye.y, first.x, first.y, pal.laser, 1.5, 0.65);
    line(k, eye.x, eye.y, last.x, last.y, pal.laser, 1.5, 0.65);
    line(k, eye.x, eye.y, end.x, end.y, pal.laser, 1, 0.85);
    circle(k, end.x, end.y, 5, pal.laser, { fill: false, outline: pal.laser, outlineWidth: 1, opacity: 0.5 });
    return;
  }
  if (!opt.active) return;

  // 外层扇形（逐片填充，天然被挂牌端点截断）
  for (let i = 0; i < fan.length - 1; i++) {
    const a = fan[i]!;
    const b = fan[i + 1]!;
    poly(k, [[eye.x, eye.y], [a.x, a.y], [b.x, b.y]], pal.laser, { opacity: 0.13 });
  }
  // 内层更亮一点，显出“目光”聚焦感
  const mid = Math.floor((fan.length - 1) / 2);
  for (let i = Math.max(0, mid - 3); i < Math.min(fan.length - 1, mid + 4); i++) {
    const a = fan[i]!;
    const b = fan[i + 1]!;
    poly(k, [[eye.x, eye.y], [a.x, a.y], [b.x, b.y]], pal.laser, { opacity: 0.1 });
  }
  // 边界线与中心核心
  line(k, eye.x, eye.y, first.x, first.y, pal.laser, 1.5, 0.55);
  line(k, eye.x, eye.y, last.x, last.y, pal.laser, 1.5, 0.55);
  line(k, eye.x, eye.y, end.x, end.y, pal.laser, opt.visualWidth, 0.45);
  line(k, eye.x, eye.y, end.x, end.y, pal.white, opt.beamWidth, 0.9);
  circle(k, eye.x, eye.y, 8, pal.laser, { opacity: 0.4 });
  circle(k, eye.x, eye.y, 3, pal.white, { opacity: 0.9 });
  circle(k, end.x, end.y, opt.visualWidth + 3, pal.laser, { opacity: 0.2 });
}

/** 过场用的手枪剪影（枪身 + 枪管 + 扳机护圈），angle 为弧度。 */
export function drawGun(k: KCtx, x: number, y: number, angle = 0, flip = 1): void {
  const pal = getPalette(k);
  rect(k, x, y - 4, 26 * flip, 8, {
    color: pal.suitGray,
    outline: pal.ink,
    radius: 2,
    angle,
    centered: true,
  });
  rect(k, x + 15 * flip, y - 3, 10 * flip, 5, {
    color: pal.ink,
    radius: 1,
    angle,
    centered: true,
  });
  circle(k, x + 15 * flip, y + 1, 3.2, pal.ink);
  rect(k, x - 8 * flip, y + 4, 6, 9, {
    color: pal.suitGray,
    outline: pal.ink,
    radius: 2,
    angle,
  });
}

/** 枪口火光：四角星 + 中心亮圆。 */
export function drawMuzzleFlash(k: KCtx, x: number, y: number, scale = 1, alpha = 1): void {
  const pal = getPalette(k);
  const r = 18 * scale;
  poly(
    k,
    [
      [x, y - r],
      [x + r * 0.28, y - r * 0.28],
      [x + r, y],
      [x + r * 0.28, y + r * 0.28],
      [x, y + r],
      [x - r * 0.28, y + r * 0.28],
      [x - r, y],
      [x - r * 0.28, y - r * 0.28],
    ],
    pal.schoolGold,
    { opacity: 0.9 * alpha },
  );
  circle(k, x, y, 6 * scale, pal.white, { opacity: 0.95 * alpha });
}

export function drawPlayerBullet(k: KCtx, x: number, y: number): void {
  const pal = getPalette(k);
  line(k, x - 18, y, x - 4, y, pal.schoolGold, 2, 0.45);
  rect(k, x - 3, y - 3, 10, 6, { color: pal.schoolGold, outline: pal.ink, outlineWidth: 1, radius: 2 });
  circle(k, x + 8, y, 1.8, pal.white, { opacity: 0.9 });
}

export function drawHomingChalk(k: KCtx, x: number, y: number, angle: number): void {
  const pal = getPalette(k);
  for (let i = 1; i <= 3; i++) {
    const bx = x - Math.cos(angle) * i * 10;
    const by = y - Math.sin(angle) * i * 10;
    circle(k, bx, by, 4 - i * 0.7, pal.chalkWhite, { opacity: 0.35 - i * 0.08 });
  }
  circle(k, x, y, 6, pal.chalkWhite, { outline: pal.ink, outlineWidth: 1.5 });
  line(k, x, y, x - Math.cos(angle) * 6, y - Math.sin(angle) * 6, pal.chalk2, 2, 0.8);
}

export function drawChalkFall(k: KCtx, x: number, y: number): void {
  const pal = getPalette(k);
  rect(k, x - 8, y - 12, 16, 24, { color: pal.chalkWhite, outline: pal.ink, radius: 2 });
  k.drawPolygon({
    pts: [k.vec2(x - 8, y + 12), k.vec2(x + 8, y + 12), k.vec2(x, y + 22)],
    color: pal.chalkWhite,
    outline: { color: pal.ink, width: 1.5 },
  });
  line(k, x - 3, y - 6, x + 3, y - 6, pal.chalk2, 1, 0.8);
}

export function drawChalkWarning(k: KCtx, x: number, y: number, t: number): void {
  const pal = getPalette(k);
  const r = 18 + Math.sin(t * 12) * 3;
  ellipse(k, x, y, r, r * 0.32, pal.pen, {
    fill: false,
    outline: pal.pen,
    outlineWidth: 2,
    opacity: 0.85,
  });
  ellipse(k, x, y, r * 0.55, r * 0.18, pal.pen, {
    fill: false,
    outline: pal.pen,
    outlineWidth: 1,
    opacity: 0.55,
  });
}

export function drawShockwave(k: KCtx, x: number, y: number, w: number, h: number): void {
  const pal = getPalette(k);
  const left = x - w / 2;
  k.drawPolygon({
    pts: [
      k.vec2(left, y),
      k.vec2(left + w * 0.3, y - h * 0.55),
      k.vec2(left + w * 0.65, y - h * 0.3),
      k.vec2(left + w, y),
    ],
    color: pal.platformWarm,
    outline: { color: pal.ink, width: 2 },
  });
  // 土黄内层
  k.drawPolygon({
    pts: [
      k.vec2(left + 4, y - 2),
      k.vec2(left + w * 0.32, y - h * 0.42),
      k.vec2(left + w * 0.62, y - h * 0.2),
      k.vec2(left + w - 4, y - 2),
    ],
    color: pal.expose,
    opacity: 0.55,
  });
  for (let i = 0; i < 3; i++) {
    circle(k, left + (i + 1) * (w / 4), y - h * 0.3 - i * 6, 3, pal.chalk2, { opacity: 0.4 });
  }
}

export function drawBanana(k: KCtx, x: number, y: number): void {
  const pal = getPalette(k);
  // 两段圆弧组成的香蕉皮
  line(k, x - 14, y - 2, x - 6, y - 10, pal.expose, 6, 0.95);
  line(k, x - 6, y - 10, x + 4, y - 10, pal.expose, 6, 0.95);
  line(k, x + 4, y - 10, x + 14, y - 2, pal.expose, 6, 0.95);
  line(k, x - 12, y - 1, x - 5, y - 7, pal.coinInk, 2, 0.55);
  line(k, x - 4, y - 8, x + 2, y - 8, pal.coinInk, 2, 0.55);
  line(k, x + 5, y - 7, x + 12, y - 1, pal.coinInk, 2, 0.55);
}

export function drawStompShadow(k: KCtx, x: number, y: number, w: number, h: number, t: number): void {
  const pal = getPalette(k);
  const grow = 0.6 + Math.min(1, t) * 0.4;
  ellipse(k, x, y, (w / 2) * grow, (h / 2) * grow, pal.ink, {
    opacity: 0.32,
    fill: true,
  });
  ellipse(k, x, y, (w / 2) * grow, (h / 2) * grow, pal.pen, {
    opacity: 0.5,
    fill: false,
    outline: pal.pen,
    outlineWidth: 2,
  });
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: "gold" | "white" | "red" | "dust" | "chalk";
}

export function drawParticles(k: KCtx, particles: readonly Particle[]): void {
  const pal = getPalette(k);
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    const color =
      p.color === "gold"
        ? pal.coin
        : p.color === "red"
          ? pal.pen
          : p.color === "dust"
            ? pal.platformWarm
            : p.color === "chalk"
              ? pal.chalkWhite
              : pal.white;
    circle(k, p.x, p.y, p.size * (0.4 + a * 0.6), color, { opacity: a * 0.85 });
  }
}

export function drawFloatText(k: KCtx, x: number, y: number, str: string, color: "gold" | "white" | "red" | "chalk", alpha: number): void {
  const pal = getPalette(k);
  const c = color === "gold" ? pal.coin : color === "red" ? pal.pen : color === "chalk" ? pal.chalkWhite : pal.white;
  text(k, str, x, y, 16, c, { align: "center", width: 80, opacity: alpha, font: "monospace" });
}

export function drawLaserSight(k: KCtx, x: number, y: number, h: number): void {
  line(k, x, y, x, y + h, getPalette(k).laser, 1, 0.7);
}

export function drawRingPulse(k: KCtx, x: number, y: number, r: number, color: "gold" | "red" | "white", alpha: number): void {
  const pal = getPalette(k);
  circle(k, x, y, r, color === "gold" ? pal.coin : color === "red" ? pal.pen : pal.white, {
    fill: false,
    outline: color === "gold" ? pal.coin : color === "red" ? pal.pen : pal.white,
    outlineWidth: 3,
    opacity: alpha,
  });
}
