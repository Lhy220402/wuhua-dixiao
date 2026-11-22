import type { LevelDef, RoomDef } from "../types";

/**
 * 第一关：3 个平台跳跃房 + 礼堂（docs/20）。
 * 坐标约定：脚底 y=512；逻辑 960×540；平台/危险区全为像素矩形。
 */
const FLOOR: Rect = { x: 0, y: 512, w: 960, h: 28 };
const WALL_L: Rect = { x: 0, y: 0, w: 16, h: 540 };
const WALL_R: Rect = { x: 944, y: 0, w: 16, h: 540 };

type Rect = { x: number; y: number; w: number; h: number };

const r1: RoomDef = {
  id: "l1-r1",
  name: "第一节课 · 跑",
  bg: "school",
  platforms: [
    FLOOR,
    WALL_L,
    WALL_R,
    { x: 352, y: 256, w: 256, h: 20 },
    { x: 96, y: 352, w: 192, h: 20 },
    { x: 64, y: 448, w: 160, h: 20 },
    { x: 672, y: 448, w: 160, h: 20 },
  ],
  hazards: [
    { type: "spike", rect: { x: 128, y: 480, w: 96, h: 32 }, failReason: "pit" },
    { type: "spike", rect: { x: 608, y: 480, w: 96, h: 32 }, failReason: "pit" },
  ],
  coins: [
    { x: 592, y: 240 },
    { x: 208, y: 336 },
    { x: 144, y: 432 },
    { x: 720, y: 432 },
    { x: 880, y: 496 },
  ],
  npcs: [],
  exits: [
    {
      id: "to-r2",
      at: { x: 920, y: 0 },
      w: 40,
      h: 540,
      toRoom: "l1-r2",
      spawnAt: { x: 48, y: 512 },
    },
  ],
  spawn: { x: 48, y: 512 },
};

const r2: RoomDef = {
  id: "l1-r2",
  name: "第二节课 · 抬头",
  bg: "school",
  platforms: [
    { x: 0, y: 512, w: 288, h: 28 },
    { x: 352, y: 512, w: 608, h: 28 },
    WALL_L,
    WALL_R,
    { x: 288, y: 256, w: 224, h: 20 },
    { x: 96, y: 352, w: 192, h: 20 },
    { x: 128, y: 448, w: 256, h: 20 },
    { x: 736, y: 448, w: 128, h: 20 },
  ],
  hazards: [{ type: "spike", rect: { x: 608, y: 480, w: 96, h: 32 }, failReason: "pit" }],
  coins: [
    { x: 400, y: 240 },
    { x: 176, y: 336 },
    { x: 752, y: 368 },
    { x: 336, y: 432 },
    { x: 880, y: 496 },
  ],
  npcs: [
    { npcId: "laowu", at: { x: 416, y: 512 } },
    { npcId: "shijun", at: { x: 768, y: 512 } },
  ],
  exits: [
    {
      id: "to-r3",
      at: { x: 920, y: 0 },
      w: 40,
      h: 540,
      toRoom: "l1-r3",
      spawnAt: { x: 48, y: 512 },
    },
  ],
  spawn: { x: 48, y: 512 },
  eyes: [{ x: 224, y: 192 }],
};

const r3: RoomDef = {
  id: "l1-r3",
  name: "第三节课 · 别往上看",
  bg: "school",
  platforms: [
    { x: 0, y: 512, w: 224, h: 28 },
    { x: 288, y: 512, w: 160, h: 28 },
    { x: 448, y: 512, w: 224, h: 28 },
    { x: 736, y: 512, w: 224, h: 28 },
    WALL_L,
    WALL_R,
    { x: 288, y: 256, w: 288, h: 20 },
    { x: 64, y: 352, w: 160, h: 20 },
    { x: 192, y: 448, w: 192, h: 20 },
    { x: 736, y: 448, w: 160, h: 20 },
  ],
  hazards: [
    { type: "spike", rect: { x: 96, y: 480, w: 96, h: 32 }, failReason: "pit" },
    { type: "spike", rect: { x: 576, y: 480, w: 96, h: 32 }, failReason: "pit" },
  ],
  coins: [
    { x: 560, y: 240 },
    { x: 112, y: 336 },
    { x: 848, y: 336 },
    { x: 304, y: 432 },
  ],
  npcs: [{ npcId: "xiaoming", at: { x: 800, y: 512 } }],
  exits: [
    {
      id: "to-r4",
      at: { x: 920, y: 0 },
      w: 40,
      h: 540,
      toRoom: "l1-r4",
      spawnAt: { x: 80, y: 512 },
    },
  ],
  spawn: { x: 48, y: 512 },
  checkpoint: { x: 416, y: 512 },
  eyes: [
    { x: 160, y: 192 },
    { x: 704, y: 192 },
  ],
};

const r4: RoomDef = {
  id: "l1-r4",
  name: "礼堂 · 笑长在看你",
  bg: "hall",
  platforms: [
    FLOOR,
    WALL_L,
    WALL_R,
    { x: 96, y: 256, w: 160, h: 20 },
    { x: 384, y: 256, w: 160, h: 20 },
    { x: 672, y: 256, w: 160, h: 20 },
  ],
  hazards: [],
  coins: [],
  npcs: [],
  boss: { bossId: "xiaochang", at: { x: 480, y: 512 }, onEnter: "l1-enter-hall" },
  shop: { shopId: "hall_shop", at: { x: 864, y: 512 }, trigger: "timer", delayMs: 45000 },
  exits: [],
  spawn: { x: 80, y: 512 },
  checkpoint: { x: 176, y: 512 },
  eyes: [
    { x: 432, y: 64 },
    { x: 512, y: 64 },
  ],
  plaques: [
    { x: 96, y: 256, w: 160, h: 20 },
    { x: 384, y: 256, w: 160, h: 20 },
    { x: 672, y: 256, w: 160, h: 20 },
  ],
};

export const LEVEL1: LevelDef = {
  id: "level1",
  title: "第一关 · 笑长的凝视",
  rooms: [r1, r2, r3, r4],
  intro: {
    title: "第一关 · 笑长的凝视",
    hint: "物化帝，去礼堂。别在笑长的视线里站太久。",
    durationMs: 1800,
  },
  music: "bgm.level1",
  bossId: "xiaochang",
  clearText: "第一关 · 通关",
  startRoom: 0,
};
