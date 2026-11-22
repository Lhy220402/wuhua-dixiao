import type { LevelDef, RoomDef } from "../types";

const FLOOR: Rect = { x: 0, y: 512, w: 960, h: 28 };
const WALL_L: Rect = { x: 0, y: 0, w: 16, h: 540 };
const WALL_R: Rect = { x: 944, y: 0, w: 16, h: 540 };

type Rect = { x: number; y: number; w: number; h: number };

/** 第二关：一屏竞技场（docs/21 §2.2）。 */
const arena: RoomDef = {
  id: "l2-r1",
  name: "第二关 · 消耗战",
  bg: "arena",
  platforms: [
    FLOOR,
    WALL_L,
    WALL_R,
    { x: 224, y: 448, w: 96, h: 64 },
    { x: 480, y: 448, w: 96, h: 64 },
  ],
  hazards: [],
  coins: [],
  npcs: [{ npcId: "jiasheng", at: { x: 160, y: 512 } }],
  boss: { bossId: "boss2", at: { x: 816, y: 512 }, onEnter: "l2-intro" },
  exits: [],
  spawn: { x: 64, y: 512 },
  desks: [
    { x: 224, y: 448, w: 96, h: 64 },
    { x: 480, y: 448, w: 96, h: 64 },
  ],
  bossHurtbox: { x: 736, y: 256, w: 160, h: 256 },
  shoe: { x: 640, y: 448, w: 192, h: 64 },
};

export const LEVEL2: LevelDef = {
  id: "level2",
  title: "第二关 · 消耗战",
  rooms: [arena],
  intro: {
    title: "第二关 · 消耗战",
    hint: "金币也能续命。打不动的时候，看看它脚上有什么。",
    durationMs: 1800,
  },
  music: "bgm.level2",
  bossId: "boss2",
  clearText: "第二关 · 通关",
  startRoom: 0,
};
