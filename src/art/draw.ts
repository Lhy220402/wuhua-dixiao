import type { Color, KAPLAYCtx } from "kaplay";
import { THEME } from "../config/theme";
import { getPalette } from "./palette";

export type KCtx = KAPLAYCtx;
export type { Color };

export interface RectOpt {
  color: Color;
  outline?: Color;
  outlineWidth?: number;
  radius?: number;
  opacity?: number;
  angle?: number;
  /** 为中心点坐标；默认 false 表示左上角 */
  centered?: boolean;
}

export function rect(
  k: KCtx,
  x: number,
  y: number,
  w: number,
  h: number,
  opt: RectOpt,
): void {
  const palette = getPalette(k);
  k.drawRect({
    pos: k.vec2(opt.centered ? x - w / 2 : x, opt.centered ? y - h / 2 : y),
    width: w,
    height: h,
    color: opt.color,
    radius: opt.radius ?? 0,
    opacity: opt.opacity ?? 1,
    angle: opt.angle ?? 0,
    anchor: opt.centered ? "center" : "topleft",
    ...(opt.outline
      ? { outline: { color: opt.outline, width: opt.outlineWidth ?? THEME.stroke } }
      : {}),
  });
  void palette;
}

export function circle(
  k: KCtx,
  x: number,
  y: number,
  radius: number,
  color: Color,
  opt: { outline?: Color; outlineWidth?: number; opacity?: number; fill?: boolean } = {},
): void {
  k.drawCircle({
    pos: k.vec2(x, y),
    radius,
    color,
    opacity: opt.opacity ?? 1,
    fill: opt.fill ?? true,
    ...(opt.outline ? { outline: { color: opt.outline, width: opt.outlineWidth ?? THEME.stroke } } : {}),
  });
}

export function ellipse(
  k: KCtx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: Color,
  opt: { outline?: Color; outlineWidth?: number; opacity?: number; fill?: boolean } = {},
): void {
  k.drawEllipse({
    pos: k.vec2(x, y),
    radiusX: rx,
    radiusY: ry,
    color,
    opacity: opt.opacity ?? 1,
    fill: opt.fill ?? true,
    ...(opt.outline ? { outline: { color: opt.outline, width: opt.outlineWidth ?? THEME.stroke } } : {}),
  });
}

export function line(
  k: KCtx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: Color,
  width = 2,
  opacity = 1,
): void {
  k.drawLine({
    p1: k.vec2(x1, y1),
    p2: k.vec2(x2, y2),
    color,
    width,
    opacity,
  });
}

export function poly(
  k: KCtx,
  pts: [number, number][],
  color: Color,
  opt: { outline?: Color; outlineWidth?: number; opacity?: number; pos?: [number, number] } = {},
): void {
  k.drawPolygon({
    pts: pts.map(([x, y]) => k.vec2(x, y)),
    color,
    opacity: opt.opacity ?? 1,
    ...(opt.pos ? { pos: k.vec2(opt.pos[0], opt.pos[1]) } : {}),
    ...(opt.outline
      ? { outline: { color: opt.outline, width: opt.outlineWidth ?? THEME.stroke } }
      : {}),
  });
}

export function text(
  k: KCtx,
  str: string,
  x: number,
  y: number,
  size: number,
  color: Color,
  opt: {
    align?: "left" | "center" | "right";
    width?: number;
    anchor?: "topleft" | "top" | "center" | "left" | "right";
    opacity?: number;
    font?: string;
  } = {},
): void {
  k.drawText({
    text: str,
    pos: k.vec2(x, y),
    size,
    color,
    opacity: opt.opacity ?? 1,
    align: opt.align ?? "left",
    anchor: opt.anchor ?? "topleft",
    font: opt.font ?? "monospace",
    ...(opt.width ? { width: opt.width } : {}),
  });
}

export function outlineRect(
  k: KCtx,
  x: number,
  y: number,
  w: number,
  h: number,
  color: Color,
  width = THEME.stroke,
  radius = 0,
): void {
  k.drawRect({
    pos: k.vec2(x, y),
    width: w,
    height: h,
    fill: false,
    radius,
    outline: { color, width },
  });
}
