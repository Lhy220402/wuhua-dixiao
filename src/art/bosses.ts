import type { Vec } from "../core/types";
import { getPalette } from "./palette";
import { circle, line, poly, rect, type KCtx } from "./draw";

export interface EyeState {
  open: boolean;
  red: boolean;
  telegraph: boolean;
}

/** 第一关 · 笑长（校长梗）：礼帽 + 方框眼镜 + 紫色西装 + 高背椅。 */
export function drawBoss1(
  k: KCtx,
  eyes: Vec[],
  eye: EyeState,
  animTime: number,
  firingEyes?: readonly number[],
): void {
  const pal = getPalette(k);
  const cx = 480;
  const headY = 96;
  const headR = 64;

  // 高背椅
  rect(k, cx - 110, 300, 220, 212, {
    color: pal.bossPurple,
    outline: pal.ink,
    radius: 12,
  });
  rect(k, cx - 92, 280, 184, 180, {
    color: pal.emperorRobeDark,
    outline: pal.ink,
    radius: 10,
  });
  rect(k, cx - 150, 470, 300, 42, {
    color: pal.emperorRobeDark,
    outline: pal.ink,
    radius: 8,
  });
  rect(k, cx - 130, 300, 260, 18, {
    color: pal.schoolGold,
    outline: pal.ink,
    radius: 4,
  });

  // 身体
  poly(
    k,
    [
      [cx - 80, 300],
      [cx + 80, 300],
      [cx + 60, 470],
      [cx - 60, 470],
    ],
    pal.bossPurple,
    { outline: pal.ink, outlineWidth: 2 },
  );
  // 领带
  poly(
    k,
    [
      [cx - 10, 300],
      [cx + 10, 300],
      [cx + 14, 360],
      [cx, 390],
      [cx - 14, 360],
    ],
    pal.schoolGold,
    { outline: pal.ink, outlineWidth: 2 },
  );
  // 西装领
  line(k, cx - 34, 300, cx - 10, 360, pal.ink, 2);
  line(k, cx + 34, 300, cx + 10, 360, pal.ink, 2);

  // 头
  circle(k, cx, headY + 24, headR, pal.skin, {
    outline: pal.ink,
    outlineWidth: 3,
  });
  // 头发
  circle(k, cx, headY + 4, headR - 3, pal.hairInk, { opacity: 0.95 });
  rect(k, cx - headR, headY + 2, headR * 2, 18, { color: pal.hairInk });
  // 礼帽
  rect(k, cx - 62, headY - 48, 124, 12, {
    color: pal.hairInk,
    outline: pal.ink,
    radius: 4,
  });
  rect(k, cx - 44, headY - 88, 88, 44, {
    color: pal.hairInk,
    outline: pal.ink,
    radius: 6,
  });
  rect(k, cx - 44, headY - 62, 88, 8, { color: pal.schoolGold, opacity: 0.85 });

  // 方框眼镜
  rect(k, cx - 54, headY + 8, 42, 32, {
    color: pal.white,
    outline: pal.ink,
    radius: 4,
  });
  rect(k, cx + 12, headY + 8, 42, 32, {
    color: pal.white,
    outline: pal.ink,
    radius: 4,
  });
  line(k, cx - 12, headY + 24, cx + 12, headY + 24, pal.ink, 3);

  // 眼睛（房间眼位与视觉对齐；只有本轮出束的眼睛变红/发亮）
  eyes.forEach((eyePos, i) => {
    const ex = eyePos.x;
    const ey = eyePos.y;
    const firing = !firingEyes || firingEyes.includes(i);
    if (!eye.open) {
      line(k, ex - 13, ey, ex + 13, ey, pal.ink, 3);
    } else {
      circle(k, ex, ey, 13, pal.white, { outline: pal.ink, outlineWidth: 2 });
      const red = eye.red && firing;
      const pupil = eye.telegraph && firing ? pal.laser : red ? pal.laser : pal.hairInk;
      circle(k, ex, ey, eye.telegraph && firing ? 5 : 7, pupil);
      if (red) {
        circle(k, ex, ey, 16, pal.laser, { opacity: 0.25, fill: true });
        // 朝向瞳孔外的细光晕，强化“目光”感
        circle(k, ex, ey, 22, pal.laser, { fill: false, outline: pal.laser, outlineWidth: 1, opacity: 0.35 });
      }
    }
  });

  // 嘴
  line(k, cx - 24, headY + 62, cx + 24, headY + 62, pal.ink, 3);

  // 领结 / 校徽
  circle(k, cx - 60, 330, 9, pal.schoolGold, { outline: pal.ink, outlineWidth: 2 });
  circle(k, cx - 60, 330, 4, pal.emperorRobeDark);
}

export interface Boss2DrawOpt {
  giant: boolean;
  animTime: number;
  hurtFlash: number;
  bubbleNearShoe: boolean;
}

/** 第二关 Boss（学生形象，用户 2026-11-22 补充）：校服 + 方框眼镜 + 领带。 */
export function drawBoss2(k: KCtx, opt: Boss2DrawOpt): void {
  const pal = getPalette(k);
  const flash = opt.hurtFlash > 0;
  const uniform = flash ? pal.white : pal.boss2Teal;
  const uniformDark = flash ? pal.chalk2 : pal.studentPants;

  if (!opt.giant) {
    const cx = 816;
    const footY = 512;
    // 影子
    circle(k, cx, footY, 68, pal.ink, { opacity: 0.16 });

    // 腿
    rect(k, cx - 52, footY - 76, 42, 80, {
      color: uniformDark,
      outline: pal.ink,
      radius: 6,
    });
    rect(k, cx + 10, footY - 76, 42, 80, {
      color: uniformDark,
      outline: pal.ink,
      radius: 6,
    });
    // 身体（校服）
    rect(k, cx - 80, 292, 160, 156, {
      color: uniform,
      outline: pal.ink,
      radius: 14,
    });
    // 领带
    poly(
      k,
      [
        [cx - 10, 300],
        [cx + 10, 300],
        [cx + 14, 366],
        [cx, 392],
        [cx - 14, 366],
      ],
      pal.studentTie,
      { outline: pal.ink, outlineWidth: 2 },
    );
    // 校徽
    circle(k, cx - 54, 330, 10, pal.schoolGold, { outline: pal.ink, outlineWidth: 2 });
    // 手臂
    line(k, cx - 78, 320, cx - 104, 408, pal.ink, 10);
    line(k, cx + 78, 320, cx + 104, 408, pal.ink, 10);
    circle(k, cx - 106, 416, 14, pal.skin, { outline: pal.ink, outlineWidth: 2 });
    circle(k, cx + 106, 416, 14, pal.skin, { outline: pal.ink, outlineWidth: 2 });
    // 头
    circle(k, cx, 260, 38, pal.skin, { outline: pal.ink, outlineWidth: 2 });
    // 头发
    circle(k, cx, 246, 35, pal.hairInk, { opacity: 0.95 });
    rect(k, cx - 35, 244, 70, 14, { color: pal.hairInk });
    // 眼镜
    rect(k, cx - 30, 250, 25, 22, {
      color: pal.white,
      outline: pal.ink,
      radius: 4,
    });
    rect(k, cx + 5, 250, 25, 22, {
      color: pal.white,
      outline: pal.ink,
      radius: 4,
    });
    line(k, cx - 5, 260, cx + 5, 260, pal.ink, 2);
    circle(k, cx - 17, 261, 3, pal.hairInk);
    circle(k, cx + 18, 261, 3, pal.hairInk);
    // 嘴
    line(k, cx - 8, 278, cx + 8, 278, pal.ink, 2);

    // 皮鞋（阶段 2 才可见，这里阶段 1 也画一只）
    drawShoe(k, 640, 448, 192, 64, false);
  } else {
    // 巨大化：填满右半屏
    const cx = 760;
    const footY = 540;
    rect(k, cx - 200, 90, 400, 450, {
      color: uniform,
      outline: pal.ink,
      radius: 22,
    });
    // 领带
    poly(
      k,
      [
        [cx - 18, 100],
        [cx + 18, 100],
        [cx + 26, 240],
        [cx, 290],
        [cx - 26, 240],
      ],
      pal.studentTie,
      { outline: pal.ink, outlineWidth: 3 },
    );
    // 手臂
    line(k, cx - 198, 160, cx - 300, 380, pal.ink, 26);
    line(k, cx + 198, 160, cx + 300, 340, pal.ink, 26);
    circle(k, cx - 306, 392, 36, pal.skin, { outline: pal.ink, outlineWidth: 3 });
    circle(k, cx + 306, 340, 36, pal.skin, { outline: pal.ink, outlineWidth: 3 });
    // 头
    circle(k, cx, 46, 92, pal.skin, { outline: pal.ink, outlineWidth: 3 });
    circle(k, cx, 26, 86, pal.hairInk, { opacity: 0.95 });
    rect(k, cx - 86, 20, 172, 26, { color: pal.hairInk });
    // 眼镜（白光）
    rect(k, cx - 70, 24, 58, 52, { color: pal.white, outline: pal.ink, radius: 6 });
    rect(k, cx + 12, 24, 58, 52, { color: pal.white, outline: pal.ink, radius: 6 });
    line(k, cx - 12, 50, cx + 12, 50, pal.ink, 3);
    // 咆哮
    rect(k, cx - 26, 100, 52, 22, {
      color: pal.ink,
      outline: pal.ink,
      radius: 6,
    });
    for (let i = 0; i < 4; i++) {
      line(k, cx - 20 + i * 13, 102, cx - 20 + i * 13, 120, pal.white, 3);
    }

    // 巨大皮鞋
    drawShoe(k, 640, 448, 192, 64, true, opt.animTime);
  }
}

/** 鞋判定框 192×64，阶段 2 唯一胜点。 */
export function drawShoe(
  k: KCtx,
  x: number,
  y: number,
  w: number,
  h: number,
  giant: boolean,
  animTime = 0,
): void {
  const pal = getPalette(k);
  const lift = giant ? Math.max(0, Math.sin(animTime * 2)) * 6 : 0;
  const top = y - lift;
  // 白袜
  rect(k, x + 18, top + 2, 90, 18, {
    color: pal.white,
    outline: pal.ink,
    radius: 4,
  });
  // 鞋身
  rect(k, x + 10, top + 14, w - 20, h - 14, {
    color: pal.shoeBlack,
    outline: pal.ink,
    radius: 14,
  });
  // 鞋头
  circle(k, x + 30, top + h - 16, 26, pal.shoeBlack, {
    outline: pal.ink,
    outlineWidth: 2,
  });
  // 鞋带
  for (let i = 0; i < 3; i++) {
    line(k, x + 66 + i * 22, top + 24, x + 78 + i * 22, top + 24, pal.chalk2, 3);
  }
  // 金扣
  circle(k, x + 120, top + 36, 10, pal.schoolGold, { outline: pal.ink, outlineWidth: 2 });
  circle(k, x + 120, top + 36, 4, pal.emperorRobeDark);
  // 鞋底
  rect(k, x + 10, top + h - 8, w - 20, 8, {
    color: pal.chalk2,
    outline: pal.ink,
    radius: 3,
  });
}
