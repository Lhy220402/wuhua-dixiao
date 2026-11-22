import type { Vec } from "../core/types";
import { getPalette } from "./palette";
import { circle, line, rect, text, type KCtx } from "./draw";

export type NpcArtId = "laowu" | "xiaoming" | "shijun" | "jiasheng" | "chao";

export interface NpcDrawOpt {
  animTime: number;
  hint: boolean;
  facing: 1 | -1;
  talking: boolean;
}

export function drawNpc(
  k: KCtx,
  id: NpcArtId,
  at: Vec,
  opt: NpcDrawOpt,
): void {
  const pal = getPalette(k);
  const x = at.x;
  const footY = at.y;
  const bob = Math.sin(opt.animTime * (opt.talking ? 6 : 2)) * 1.5;
  const y = footY + bob;

  // 影子
  circle(k, x, footY, 13, pal.ink, { opacity: 0.16 });

  switch (id) {
    case "laowu": {
      rect(k, x - 12, y - 34, 24, 30, {
        color: pal.mushroom,
        outline: pal.ink,
        radius: 5,
      });
      circle(k, x, y - 40, 9, pal.skin, { outline: pal.ink, outlineWidth: 2 });
      circle(k, x, y - 43, 8, pal.hairInk, { opacity: 0.9 });
      // 吉他
      line(k, x + 12, y - 34, x + 26, y - 52, pal.deskWood, 4);
      circle(k, x + 28, y - 30, 12, pal.deskWood, { outline: pal.ink, outlineWidth: 2 });
      circle(k, x + 28, y - 30, 4, pal.ink);
      // 闭眼唱歌
      line(k, x - 3, y - 40, x - 0.5, y - 40, pal.ink, 1.6);
      line(k, x + 2.5, y - 40, x + 5, y - 40, pal.ink, 1.6);
      if (opt.talking) {
        circle(k, x + 16, y - 58, 3, pal.expose, { opacity: 0.9 });
        circle(k, x + 22, y - 66, 2, pal.expose, { opacity: 0.7 });
      }
      break;
    }
    case "xiaoming": {
      rect(k, x - 9, y - 28, 18, 24, {
        color: pal.chalk2,
        outline: pal.ink,
        radius: 4,
      });
      circle(k, x, y - 34, 8, pal.skin, { outline: pal.ink, outlineWidth: 2 });
      circle(k, x, y - 37, 7, pal.hairInk, { opacity: 0.85 });
      // 永远看着空气
      const look = Math.sin(opt.animTime * 0.8) * 1.5;
      circle(k, x - 3 + look, y - 34, 1.2, pal.ink);
      circle(k, x + 3 + look, y - 34, 1.2, pal.ink);
      // 对空气说话的语气泡（三个点）
      if (opt.talking) {
        const phase = Math.floor(opt.animTime * 2) % 3;
        for (let i = 0; i < 3; i++) {
          circle(k, x + 14 + i * 6, y - 54 - (i === phase ? 2 : 0), 2.2, pal.chalk, {
            opacity: i <= phase ? 0.95 : 0.35,
          });
        }
      }
      break;
    }
    case "shijun": {
      rect(k, x - 12, y - 30, 24, 26, {
        color: pal.mushroom,
        outline: pal.ink,
        radius: 5,
      });
      // 蘑菇帽
      circle(k, x, y - 36, 13, pal.chalkWhite, { outline: pal.ink, outlineWidth: 2 });
      circle(k, x - 5, y - 38, 2, pal.pen, { opacity: 0.7 });
      circle(k, x + 4, y - 35, 1.6, pal.pen, { opacity: 0.7 });
      circle(k, x, y - 27, 7, pal.skin, { outline: pal.ink, outlineWidth: 2 });
      line(k, x - 3, y - 28, x - 1, y - 28, pal.ink, 1.2);
      line(k, x + 1, y - 28, x + 3, y - 28, pal.ink, 1.2);
      break;
    }
    case "jiasheng": {
      rect(k, x - 11, y - 34, 22, 30, {
        color: pal.suitGray,
        outline: pal.ink,
        radius: 4,
      });
      circle(k, x, y - 40, 8, pal.skin, { outline: pal.ink, outlineWidth: 2 });
      circle(k, x, y - 43, 7, pal.hairInk, { opacity: 0.9 });
      // 方框眼镜
      rect(k, x - 7, y - 42, 6, 5, { color: pal.white, outline: pal.ink, outlineWidth: 1 });
      rect(k, x + 1, y - 42, 6, 5, { color: pal.white, outline: pal.ink, outlineWidth: 1 });
      line(k, x - 1, y - 39, x + 1, y - 39, pal.ink, 1);
      // 秒表
      circle(k, x + 14, y - 24, 6, pal.schoolGold, { outline: pal.ink, outlineWidth: 1.5 });
      const tick = opt.animTime % 1;
      line(k, x + 14, y - 24, x + 14 + Math.cos(tick * Math.PI * 2) * 4, y - 24 + Math.sin(tick * Math.PI * 2) * 4, pal.ink, 1);
      break;
    }
    case "chao": {
      // 过场限定：蒙面剪影，无台词
      rect(k, x - 11, y - 42, 22, 40, {
        color: pal.ink,
        outline: pal.chalk2,
        outlineWidth: 1,
        radius: 4,
      });
      circle(k, x, y - 50, 12, pal.ink, { outline: pal.chalk2, outlineWidth: 1 });
      rect(k, x - 8, y - 54, 16, 5, { color: pal.chalk2, opacity: 0.9 });
      line(k, x - 10, y - 34, x - 20, y - 20, pal.ink, 4);
      line(k, x + 10, y - 34, x + 20, y - 20, pal.ink, 4);
      break;
    }
  }

  if (opt.hint) {
    circle(k, x, y - 64, 11, pal.chalk, { outline: pal.ink, outlineWidth: 2 });
    text(k, "E", x, y - 70, 12, pal.ink, { align: "center", width: 22, font: "monospace" });
  }
}
