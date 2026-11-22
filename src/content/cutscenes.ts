import type { CutsceneDef } from "./types";

/**
 * 过场时间轴（docs/31 §5.1 / 21 §2.5 / §2.6）。
 * 播放器只消费数据；新增过场不改引擎。
 */
export const CUTSCENES: Record<string, CutsceneDef> = {
  l1_gun_gag: {
    id: "l1_gun_gag",
    skippable: true,
    totalMs: 6000,
    steps: [
      {
        at: 0,
        action: "bubble",
        target: "xiaochang",
        durationMs: 2200,
        params: { text: "你这玩意能大四人你知道不" },
      },
      { at: 2200, action: "enterChao", durationMs: 400 },
      { at: 2600, action: "gunshot", durationMs: 300 },
      { at: 2900, action: "bossDie", durationMs: 1500 },
      { at: 3800, action: "throwGun", durationMs: 500 },
      {
        at: 5300,
        action: "grantItem",
        params: { itemId: "bullet_gun" },
      },
      { at: 5300, action: "text", durationMs: 700, params: { text: "第一关 · 过关" } },
      { at: 6000, action: "wait", durationMs: 0 },
    ],
  },
  l2_giant: {
    id: "l2_giant",
    skippable: true,
    totalMs: 3000,
    steps: [
      { at: 0, action: "shake", durationMs: 400, params: { amp: 2 } },
      {
        at: 400,
        action: "bubble",
        target: "boss2",
        durationMs: 800,
        params: { text: "你打不动的。" },
      },
      { at: 1200, action: "flash", durationMs: 120, params: { color: "white" } },
      { at: 1200, action: "giantGrow", durationMs: 1200 },
      { at: 2400, action: "shake", durationMs: 600, params: { amp: 8 } },
      { at: 3000, action: "wait", durationMs: 0 },
    ],
  },
  l2_shoe: {
    id: "l2_shoe",
    skippable: true,
    totalMs: 3000,
    steps: [
      { at: 0, action: "victory", durationMs: 800 },
      {
        at: 800,
        action: "bubble",
        target: "boss2",
        durationMs: 600,
        params: { text: "哎哎哎——" },
      },
      { at: 800, action: "bossDie", durationMs: 1200 },
      { at: 2000, action: "flash", durationMs: 400, params: { color: "black" } },
      { at: 3000, action: "wait", durationMs: 0 },
    ],
  },
};
