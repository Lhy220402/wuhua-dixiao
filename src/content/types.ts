import type { LevelId, Rect, Vec } from "../core/types";

/** docs/02 §3 —— 内容数据 schema。引擎只读数据，新增内容不改引擎。 */

export interface GameContent {
  levels: LevelDef[];
  bosses: Record<string, BossDef>;
  npcs: NpcDef[];
  dialogue: Record<string, DialogueDef>;
  items: ItemDef[];
  shops: Record<string, ShopDef>;
  buffs: Record<string, BuffDef>;
  memes: MemeDef[];
  cutscenes: Record<string, CutsceneDef>;
  audio: Record<string, AudioDef>;
}

export interface LevelDef {
  id: LevelId;
  title: string;
  rooms: RoomDef[];
  intro: { title: string; hint: string; durationMs: number };
  music: string;
  bossId?: string;
  clearText: string;
  startRoom?: number;
}

export interface RoomDef {
  id: string;
  name: string;
  /** 房间背景类型，art/tiles 根据它画不同底 */
  bg: "school" | "hall" | "arena";
  platforms: Rect[];
  hazards: HazardDef[];
  coins: Vec[];
  npcs: { npcId: string; at: Vec }[];
  shop?: { shopId: string; at: Vec; trigger: "timer" | "enter"; delayMs?: number };
  boss?: { bossId: string; at: Vec; onEnter?: string };
  exits: { id: string; at: Vec; w: number; h: number; toRoom: string; spawnAt: Vec }[];
  spawn: Vec;
  checkpoint?: Vec;
  /** Boss 房专用：激光眼与挂牌掩体 */
  eyes?: Vec[];
  plaques?: Rect[];
  /** 第二关竞技场专用 */
  desks?: Rect[];
  shoe?: Rect;
  bossHurtbox?: Rect;
}

export interface HazardDef {
  type: "spike" | "pit";
  rect: Rect;
  failReason: "pit" | "gaze";
}

export interface BossDef {
  id: string;
  name: string;
  hp: number;
  behavior: "laserGaze" | "arena";
  art: string;
  phases: BossPhaseDef[];
  giantThreshold?: number;
  shoeHitbox?: Rect;
  defeatMethod: "npc" | "shoe" | "gun";
  hitbox?: Rect;
  eyes?: Vec[];
  /** 激光 Boss 的模式表 */
  patterns?: LaserPatternDef[];
  blinkPeriodMs?: number;
  blinkWindowMs?: number;
  attackCycle?: string[];
}

export interface BossPhaseDef {
  id: string;
  hpMin: number;
  hpMax: number;
  attacks: AttackDef[];
  enterCutscene?: string;
  invulnerable?: "none" | "bullets" | "all";
  victory?: "defeat" | "shoe";
}

export interface AttackDef {
  id: string;
  type:
    | "laserSweep"
    | "homingBurst"
    | "shockwave"
    | "bananaTrap"
    | "stompRing"
    | "chalkRain"
    | "giantShockwave"
    | "stomp";
  telegraphMs: number;
  durationMs: number;
  cooldownMs: number;
  damage: { hp: number; coins: number };
  params: Record<string, number | string>;
}

export interface LaserPatternDef {
  id: "p1" | "p2" | "p3";
  label: string;
  /** p1 单眼横扫；p2 双眼交叉；p3 凝视锁定 */
  kind: "sweep" | "cross" | "lock";
  startX?: number;
  endX?: number;
  speed?: number;
  durationMs?: number;
}

export interface NpcDef {
  id: string;
  name: string;
  art: string;
  dialogueId: string;
  shortDialogueId?: string;
  interactRadius?: number;
  trigger: "interact" | "auto";
  repeat: "once" | "cooldown" | "infinite";
  cooldownMs?: number;
  facing?: 1 | -1;
  effect?:
    | { type: "buff"; buffId: string }
    | { type: "damage"; hpCost: number; preventLethal: boolean; once: boolean }
    | { type: "item"; itemId: string; once: boolean }
    | { type: "none" };
}

export interface DialogueDef {
  id: string;
  once?: boolean;
  canSkip?: boolean;
  lines: DialogueLine[];
  onEnd?: { event: string; payload?: unknown };
}

export interface DialogueLine {
  speaker: string;
  text: string;
  style?: "speech" | "shout" | "whisper" | "silent" | "system" | "narration";
  emote?: string;
  typeSpeed?: number;
  holdMs?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  subtitle?: string;
  desc: string;
  icon: string;
  stacks: boolean;
  persistent: boolean;
  displayName?: string;
}

export interface ShopDef {
  id: string;
  title: string;
  items: { itemId: string; price: number; stock: number }[];
  purchaseCutscene?: string;
  soldOutText?: string;
}

export interface BuffDef {
  id: string;
  name: string;
  durationMs: number;
  icon: string;
  effects: {
    maxHp?: number;
    heal?: number;
    coinMultiplier?: number;
    shieldHits?: number;
    exposureRateMul?: number;
  };
  hudText: string;
}

export interface MemeDef {
  id: string;
  title: string;
  desc: string;
  unlockBy: string;
}

export interface AudioDef {
  src: string;
  volume: number;
  loop: boolean;
  priority?: number;
}

export interface CutsceneDef {
  id: string;
  skippable: boolean;
  totalMs: number;
  steps: CutsceneStep[];
}

export interface CutsceneStep {
  at: number;
  action:
    | "bubble"
    | "move"
    | "shake"
    | "flash"
    | "slowmo"
    | "sfx"
    | "text"
    | "wait"
    | "grantItem"
    | "bossDie"
    | "enterChao"
    | "gunshot"
    | "throwGun"
    | "giantGrow"
    | "victory";
  target?: string;
  params?: Record<string, unknown>;
  durationMs?: number;
  easing?: string;
}
