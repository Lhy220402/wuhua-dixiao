export type Vec = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type LevelId = "level1" | "level2";

export type ActionId =
  | "moveLeft"
  | "moveRight"
  | "jump"
  | "interact"
  | "shoot"
  | "pause"
  | "confirm"
  | "skip";

export type GameState =
  | "Boot"
  | "Title"
  | "LevelIntro"
  | "Playing"
  | "Dialogue"
  | "Shop"
  | "Cutscene"
  | "Paused"
  | "LevelClear"
  | "Fail"
  | "ToBeContinued";

export type FailReason = "gaze" | "hp" | "coins" | "pit";

export interface PlayerDamagePayload {
  source: string;
  hpLoss: number;
  coinLoss: number;
  hpAfter: number;
  coinsAfter: number;
}

export interface GameEventMap {
  "game:level-start": { levelId: LevelId };
  "game:room-enter": { levelId: LevelId; roomId: string; index: number };
  "game:coin-changed": {
    coins: number;
    delta: number;
    reason: "pickup" | "purchase" | "hit" | "cheat" | "loan";
  };
  "game:player-damaged": PlayerDamagePayload;
  "game:player-died": { reason: FailReason };
  "game:item-acquired": { itemId: string; silent?: boolean; displayName?: string };
  "game:shop-opened": { shopId: string };
  "game:shop-purchased": { shopId: string; itemId: string; price: number };
  "game:dialogue-start": { dialogueId: string; npcId?: string };
  "game:dialogue-end": { dialogueId: string; npcId?: string; skipped?: boolean };
  "game:cutscene-start": { cutsceneId: string };
  "game:cutscene-end": { cutsceneId: string; skipped: boolean };
  "game:buff-applied": { buffId: string; durationMs: number };
  "game:buff-ended": { buffId: string };
  "game:boss-phase": { bossId: string; phase: string; hp: number };
  "game:boss-defeated": { bossId: string; method: "npc" | "shoe" | "gun" | "chao" };
  "game:level-complete": { levelId: LevelId; timeMs: number; deaths: number; coins: number };
  "game:fail": { levelId: LevelId; reason: FailReason };
  "game:retry": { levelId: LevelId; checkpointId: string };
  "game:meme-unlocked": { memeId: string };
  "game:toast": { text: string; tone?: "info" | "danger" | "success" };
}

export type GameEventName = keyof GameEventMap;

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeInQuad = (t: number): number => t * t;

export const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);

export const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const approach = (value: number, target: number, delta: number): number => {
  if (value < target) return Math.min(value + delta, target);
  return Math.max(value - delta, target);
};

export const rectsOverlap = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const pointInRect = (p: Vec, r: Rect): boolean =>
  p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

export const playerRect = (x: number, y: number, w: number, h: number): Rect => ({
  x: x - w / 2,
  y: y - h,
  w,
  h,
});

export const distance = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

export const formatTime = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const formatCoins = (n: number): string => String(Math.max(0, Math.floor(n)));
