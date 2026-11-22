import type { PlayerState } from "../systems/physics";
import { getPalette } from "./palette";
import { circle, line, rect, type KCtx } from "./draw";

export interface PlayerDrawOpt {
  animTime: number;
  invuln: boolean;
  holdingGun: boolean;
}

/** 物化帝（皇帝形象，用户 2026-11-22 补充）：龙袍、冕冠、圆框眼镜、呆毛。 */
export function drawPlayer(k: KCtx, p: PlayerState, opt: PlayerDrawOpt): void {
  const pal = getPalette(k);
  const x = p.x;
  const y = p.y;
  const moving = Math.abs(p.vx) > 12 && p.onGround;
  const swing = moving ? Math.sin(opt.animTime * 16) : 0;
  const bob = p.onGround ? Math.abs(Math.sin(opt.animTime * 10)) * (moving ? 1.2 : 0) : 0;
  const face = p.facing;
  const blink = opt.invuln && Math.floor(opt.animTime * 10) % 2 === 0;
  const alpha = blink ? 0.35 : 1;
  const baseY = y - bob;

  // 影子
  circle(k, x, y + 1, 10, pal.ink, { opacity: 0.22, fill: true });

  // 腿
  rect(k, x - 7, baseY - 7, 6, 8, { color: pal.ink, radius: 2, opacity: alpha });
  rect(k, x + 1, baseY - 7, 6, 8, { color: pal.ink, radius: 2, opacity: alpha });

  // 龙袍身体（梯形由两个矩形拼）
  rect(k, x - 10, baseY - 21, 20, 16, {
    color: pal.emperorRobe,
    outline: pal.ink,
    radius: 5,
    opacity: alpha,
  });
  rect(k, x - 11, baseY - 8, 22, 5, {
    color: pal.emperorRobeDark,
    outline: pal.ink,
    radius: 2,
    opacity: alpha,
  });
  // 红色领口
  rect(k, x - 7, baseY - 22, 14, 4, {
    color: pal.emperorCollar,
    outline: pal.ink,
    radius: 2,
    opacity: alpha,
  });
  // 玉带
  rect(k, x - 9, baseY - 10, 18, 3, {
    color: pal.emperorJade,
    outline: pal.ink,
    radius: 1,
    opacity: alpha,
  });

  // 手臂
  const armSwing = moving ? swing * 4 : 0;
  line(k, x - 10, baseY - 18, x - 13, baseY - 10 + armSwing, pal.ink, 2, alpha);
  line(k, x + 10, baseY - 18, x + 13, baseY - 10 - armSwing, pal.ink, 2, alpha);
  circle(k, x - 13, baseY - 9 + armSwing, 2.5, pal.skin, { outline: pal.ink, outlineWidth: 1, opacity: alpha });
  circle(k, x + 13, baseY - 9 - armSwing, 2.5, pal.skin, { outline: pal.ink, outlineWidth: 1, opacity: alpha });

  // 头
  circle(k, x, baseY - 26, 8, pal.skin, {
    outline: pal.ink,
    outlineWidth: 2,
    opacity: alpha,
  });
  // 头发 / 呆毛
  circle(k, x, baseY - 29, 7, pal.hairInk, { opacity: alpha });
  rect(k, x - 7, baseY - 30, 14, 4, { color: pal.hairInk, opacity: alpha });
  line(k, x + 2, baseY - 34, x + 5, baseY - 38, pal.hairInk, 2, alpha);

  // 冕冠
  rect(k, x - 8, baseY - 37, 16, 4, {
    color: pal.emperorCrown,
    outline: pal.ink,
    radius: 1,
    opacity: alpha,
  });
  rect(k, x - 5, baseY - 41, 10, 4, {
    color: pal.emperorRobe,
    outline: pal.ink,
    radius: 1,
    opacity: alpha,
  });
  for (const dx of [-11, -6, 0, 6, 11]) {
    line(k, x + dx, baseY - 37, x + dx, baseY - 32, pal.emperorCrown, 1.5, alpha);
    circle(k, x + dx, baseY - 31, 1.6, pal.emperorJade, { opacity: alpha });
  }

  // 圆框眼镜 + 眼睛
  const eyeX = x + face * 2;
  circle(k, eyeX - 3, baseY - 26, 2.8, pal.white, {
    outline: pal.ink,
    outlineWidth: 1,
    opacity: alpha,
  });
  circle(k, eyeX + 3, baseY - 26, 2.8, pal.white, {
    outline: pal.ink,
    outlineWidth: 1,
    opacity: alpha,
  });
  circle(k, eyeX - 3 + face, baseY - 26, 1.1, pal.hairInk, { opacity: alpha });
  circle(k, eyeX + 3 + face, baseY - 26, 1.1, pal.hairInk, { opacity: alpha });
  line(k, eyeX - 1, baseY - 26, eyeX + 1, baseY - 26, pal.ink, 1, alpha);

  // 嘴
  line(k, x + face * 1, baseY - 21, x + face * 4, baseY - 21, pal.ink, 1.5, alpha);

  // 持枪
  if (opt.holdingGun) {
    rect(k, face > 0 ? x + 10 : x - 20, baseY - 14, 10, 4, {
      color: pal.suitGray,
      outline: pal.ink,
      outlineWidth: 1,
      radius: 1,
      opacity: alpha,
    });
    rect(k, face > 0 ? x + 10 : x - 14, baseY - 12, 4, 6, {
      color: pal.suitGray,
      outline: pal.ink,
      outlineWidth: 1,
      radius: 1,
      opacity: alpha,
    });
  }
}
