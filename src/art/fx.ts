import type { Rect } from "../core/types";
import { getPalette } from "./palette";
import { circle, ellipse, line, rect, text, type KCtx } from "./draw";

export interface BeamDrawOpt {
  x: number;
  top: number;
  bottom: number;
  active: boolean;
  telegraph: boolean;
  visualWidth: number;
  beamWidth: number;
  colorRed: boolean;
}

/** 笑长激光：预警 1px 细线；开火时 10px 视觉 + 6px 判定（判定由系统算）。 */
export function drawBeam(k: KCtx, opt: BeamDrawOpt): void {
  const pal = getPalette(k);
  const { x, top, bottom } = opt;
  const h = Math.max(0, bottom - top);
  if (h <= 0) return;

  if (opt.telegraph) {
    line(k, x, top, x, bottom, pal.laser, 1.5, 0.85);
    // 落点细线
    line(k, x - 14, bottom, x + 14, bottom, pal.laser, 1, 0.5);
    return;
  }
  if (!opt.active) return;

  const color = opt.colorRed ? pal.laser : pal.laser;
  // 外发光
  rect(k, x - opt.visualWidth / 2 - 3, top, opt.visualWidth + 6, h, {
    color,
    opacity: 0.22,
    centered: false,
  });
  // 视觉
  rect(k, x - opt.visualWidth / 2, top, opt.visualWidth, h, {
    color,
    opacity: 0.95,
  });
  // 核心
  rect(k, x - opt.beamWidth / 2, top, opt.beamWidth, h, {
    color: pal.white,
    opacity: 0.85,
  });
  // 落点光斑
  circle(k, x, bottom, opt.visualWidth + 4, color, { opacity: 0.2 });
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
