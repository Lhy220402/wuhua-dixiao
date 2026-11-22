import type { Rect } from "../core/types";
import type { RoomDef } from "../content/types";
import { getPalette } from "./palette";
import { circle, ellipse, line, rect, text, type KCtx } from "./draw";

export function drawBackdrop(k: KCtx, bg: RoomDef["bg"], animTime: number): void {
  const pal = getPalette(k);
  if (bg === "school") {
    k.drawRect({
      pos: k.vec2(0, 0),
      width: 960,
      height: 540,
      gradient: [k.rgb("#BFE6F5"), k.rgb("#F7F3E8")],
    });
    // 云
    for (const [x, y, w] of [
      [120, 90, 110],
      [520, 62, 150],
      [760, 130, 90],
    ] as const) {
      rect(k, x, y, w, 22, { color: pal.white, radius: 11, opacity: 0.82 });
      circle(k, x + 24, y + 2, 18, pal.white, { opacity: 0.82 });
      circle(k, x + w - 28, y + 4, 15, pal.white, { opacity: 0.82 });
    }
    // 远处教学楼
    rect(k, 60, 300, 220, 212, { color: pal.chalk2, opacity: 0.35 });
    rect(k, 110, 340, 120, 172, { color: pal.chalk, opacity: 0.3 });
    for (let i = 0; i < 4; i++) {
      rect(k, 128 + i * 26, 360, 14, 22, { color: pal.ink, opacity: 0.12 });
    }
    // 旗杆
    line(k, 860, 300, 860, 470, pal.chalk2, 3, 0.4);
    rect(k, 860, 306, 44, 28, { color: pal.pen, opacity: 0.35 });
    // 地面阴影
    rect(k, 0, 480, 960, 60, { color: pal.groundGreen, opacity: 0.06 });
  } else if (bg === "hall") {
    k.drawRect({
      pos: k.vec2(0, 0),
      width: 960,
      height: 540,
      gradient: [k.rgb("#3B1E22"), k.rgb("#7A2E2E")],
    });
    // 幕布褶皱
    for (let i = 0; i < 8; i++) {
      rect(k, i * 120, 0, 60, 300, { color: pal.hallCurtain, opacity: 0.55 });
      rect(k, i * 120 + 60, 0, 60, 300, { color: pal.ink, opacity: 0.16 });
    }
    // 金色流苏
    for (let i = 0; i < 24; i++) {
      circle(k, 20 + i * 40, 300 + Math.sin(animTime * 0.7 + i) * 2, 5, pal.schoolGold, {
        opacity: 0.8,
      });
    }
    // 校徽
    circle(k, 480, 150, 64, pal.schoolGold, { outline: pal.ink, outlineWidth: 3, opacity: 0.9 });
    circle(k, 480, 150, 48, pal.hallCurtain, { outline: pal.ink, outlineWidth: 2 });
    circle(k, 480, 150, 20, pal.schoolGold);
    // 讲台
    rect(k, 360, 300, 240, 90, { color: pal.deskWood, outline: pal.ink, radius: 6, opacity: 0.9 });
    rect(k, 376, 286, 208, 18, { color: pal.platformWarm, outline: pal.ink, radius: 4 });
    // 地毯
    rect(k, 0, 470, 960, 70, { color: pal.hallCurtain, opacity: 0.55 });
    rect(k, 0, 470, 960, 6, { color: pal.schoolGold, opacity: 0.5 });
  } else {
    k.drawRect({
      pos: k.vec2(0, 0),
      width: 960,
      height: 540,
      gradient: [k.rgb("#D8DEE2"), k.rgb("#F4EFE2")],
    });
    // 黑板
    rect(k, 110, 74, 740, 300, { color: k.rgb("#2E4A3E"), outline: pal.ink, radius: 6 });
    rect(k, 100, 64, 760, 12, { color: pal.deskWood, outline: pal.ink, radius: 3 });
    // 黑板上的粉笔线
    for (let i = 0; i < 5; i++) {
      line(k, 150, 130 + i * 38, 560 + (i % 2) * 120, 130 + i * 38, pal.chalkWhite, 2, 0.35);
    }
    // 横幅
    rect(k, 330, 18, 300, 34, { color: pal.pen, outline: pal.ink, radius: 2 });
    for (let i = 0; i < 3; i++) {
      circle(k, 400 + i * 80, 35, 5, pal.schoolGold, { opacity: 0.9 });
    }
    // 讲台掩体底影
    rect(k, 0, 480, 960, 60, { color: pal.groundGreen, opacity: 0.08 });
  }
}

export function drawPlatforms(k: KCtx, room: RoomDef): void {
  const pal = getPalette(k);
  for (const p of room.platforms) {
    if (p.y >= 500) {
      // 地面
      rect(k, p.x, p.y, p.w, p.h, { color: pal.groundGreen, outline: pal.ink, radius: 2 });
      rect(k, p.x, p.y, p.w, 4, { color: k.rgb("#5C7A58") });
      // 32px 砖缝
      for (let x = p.x + 32; x < p.x + p.w; x += 32) {
        line(k, x, p.y + 5, x, p.y + p.h - 2, pal.ink, 1, 0.18);
      }
    } else if (p.h >= 400) {
      // 墙
      rect(k, p.x, p.y, p.w, p.h, { color: pal.ink, opacity: 0.82 });
      rect(k, p.x, p.y, p.w, 6, { color: pal.groundGreen, opacity: 0.8 });
    } else {
      // 平台
      rect(k, p.x, p.y, p.w, p.h, {
        color: pal.platformWarm,
        outline: pal.ink,
        radius: 8,
      });
      rect(k, p.x + 3, p.y + 2, p.w - 6, 4, { color: pal.paper, opacity: 0.8, radius: 2 });
      for (let x = p.x + 20; x < p.x + p.w - 8; x += 24) {
        line(k, x, p.y + 8, x, p.y + p.h - 3, pal.ink, 1, 0.18);
      }
    }
  }
}

export function drawSpikes(k: KCtx, rects: readonly Rect[]): void {
  const pal = getPalette(k);
  for (const r of rects) {
    rect(k, r.x, r.y + r.h - 8, r.w, 8, { color: pal.ink, radius: 2 });
    const count = Math.max(1, Math.floor(r.w / 16));
    const step = r.w / count;
    for (let i = 0; i < count; i++) {
      const x = r.x + i * step;
      k.drawPolygon({
        pts: [k.vec2(x, r.y + r.h), k.vec2(x + step / 2, r.y), k.vec2(x + step, r.y + r.h)],
        color: pal.spikeRed,
        outline: { color: pal.ink, width: 1.5 },
      });
      line(k, x + step / 2 - 2, r.y + 4, x + step / 2, r.y + 14, pal.white, 1, 0.65);
    }
  }
}

export function drawCoin(k: KCtx, cx: number, cy: number, animTime: number): void {
  const pal = getPalette(k);
  const pulse = Math.abs(Math.cos(animTime * 3.2));
  const rx = Math.max(2.5, 10 * pulse);
  const ry = 10;
  ellipse(k, cx, cy, rx, ry, pal.coin, { outline: pal.ink, outlineWidth: 2 });
  if (pulse > 0.45) {
    ellipse(k, cx, cy, rx * 0.62, 6, pal.coinInk, { opacity: 0.55 });
    text(k, "¥", cx, cy - 6, 10, pal.coinInk, {
      align: "center",
      width: 20,
      opacity: pulse,
    });
  }
  circle(k, cx - 3, cy - 4, 2, pal.white, { opacity: 0.75 * pulse });
}

export function drawCheckpoint(k: KCtx, x: number, y: number, active: boolean, animTime: number): void {
  const pal = getPalette(k);
  line(k, x, y, x, y - 54, pal.chalk2, 4);
  line(k, x, y - 54, x + 22, y - 46, active ? pal.coin : pal.chalk2, 3);
  if (active) {
    rect(k, x + 4, y - 52, 16, 10, { color: pal.coin, opacity: 0.9 });
    circle(k, x, y - 61, 4, pal.coin, { opacity: 0.8 + Math.sin(animTime * 4) * 0.2 });
  } else {
    rect(k, x + 4, y - 52, 16, 10, { color: pal.chalk2, opacity: 0.5 });
  }
}

export function drawPlaque(k: KCtx, r: Rect): void {
  const pal = getPalette(k);
  rect(k, r.x, r.y, r.w, r.h + 18, {
    color: pal.plaqueBrown,
    outline: pal.ink,
    radius: 6,
  });
  rect(k, r.x + 4, r.y + 4, r.w - 8, r.h + 10, {
    color: pal.plaqueBrown,
    outline: pal.schoolGold,
    outlineWidth: 2,
    radius: 4,
  });
  line(k, r.x + 14, r.y + 14, r.x + r.w - 14, r.y + 14, pal.chalk, 2, 0.55);
  line(k, r.x + 14, r.y + 24, r.x + r.w - 24, r.y + 24, pal.chalk, 2, 0.35);
}

export function drawDesk(k: KCtx, r: Rect, broken: boolean): void {
  const pal = getPalette(k);
  if (!broken) {
    rect(k, r.x, r.y, r.w, 14, { color: pal.deskWood, outline: pal.ink, radius: 4 });
    rect(k, r.x + 4, r.y - 4, r.w - 8, 6, { color: pal.platformWarm, outline: pal.ink, radius: 2 });
    rect(k, r.x + 8, r.y + 12, 10, r.h - 12, { color: pal.deskWood, outline: pal.ink });
    rect(k, r.x + r.w - 18, r.y + 12, 10, r.h - 12, { color: pal.deskWood, outline: pal.ink });
    rect(k, r.x + 18, r.y + 24, r.w - 36, 10, { color: pal.ink, opacity: 0.15 });
  } else {
    for (let i = 0; i < 4; i++) {
      const angle = i * 18 - 20;
      rect(k, r.x + 10 + i * 18, r.y + r.h - 22 - (i % 2) * 8, 22, 10, {
        color: pal.deskWood,
        outline: pal.ink,
        radius: 2,
        angle,
      });
    }
  }
}

export function drawShopPedestal(
  k: KCtx,
  x: number,
  y: number,
  animTime: number,
  visible: boolean,
): void {
  const pal = getPalette(k);
  if (!visible) {
    // 未解锁：画一个粉笔 outline 占位，给玩家「马上要出现」的暗示
    rect(k, x - 32, y - 48, 64, 48, {
      color: pal.board2,
      outline: pal.chalk2,
      outlineWidth: 1,
      radius: 4,
      opacity: 0.35,
    });
    return;
  }
  const pulse = 0.6 + Math.sin(animTime * 5) * 0.25;
  // 金色脉动圆环
  circle(k, x, y - 26, 38 + pulse * 5, pal.coin, {
    opacity: 0.2,
    fill: false,
    outline: pal.coin,
    outlineWidth: 2,
  });
  circle(k, x, y - 26, 30 + pulse * 3, pal.coin, {
    opacity: 0.15,
    fill: false,
    outline: pal.coin,
    outlineWidth: 2,
  });
  // 课桌
  rect(k, x - 32, y - 48, 64, 12, {
    color: pal.deskWood,
    outline: pal.ink,
    radius: 4,
  });
  rect(k, x - 24, y - 36, 8, 36, { color: pal.deskWood, outline: pal.ink });
  rect(k, x + 16, y - 36, 8, 36, { color: pal.deskWood, outline: pal.ink });
  rect(k, x - 34, y - 12, 68, 8, { color: pal.platformWarm, outline: pal.ink, radius: 2 });
  // ! 气泡
  circle(k, x, y - 76, 13, pal.schoolGold, { outline: pal.ink, outlineWidth: 2 });
  text(k, "!", x, y - 84, 18, pal.ink, { align: "center", width: 26 });
  // 金色小饰带
  for (let i = 0; i < 4; i++) {
    circle(k, x - 24 + i * 16, y - 56 - Math.sin(animTime * 3 + i) * 3, 3, pal.coin, {
      opacity: 0.8,
    });
  }
}

export function drawExitBeacon(k: KCtx, animTime: number): void {
  const pal = getPalette(k);
  const glow = 0.18 + Math.sin(animTime * 3) * 0.06;
  rect(k, 926, 160, 14, 350, { color: pal.coin, opacity: glow, radius: 7 });
  for (let i = 0; i < 3; i++) {
    const y = 220 + i * 100;
    k.drawPolygon({
      pts: [k.vec2(934, y - 12), k.vec2(946, y), k.vec2(934, y + 12)],
      color: pal.coin,
      opacity: 0.8,
    });
  }
}
