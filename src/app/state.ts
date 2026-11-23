import { BALANCE } from "../config/balance";
import type { LevelId } from "../core/types";
import { createPlayerState, type PlayerState } from "../systems/physics";
import type { SaveV1 } from "../save/schema";

export interface Checkpoint {
  levelId: LevelId;
  roomIndex: number;
  roomId: string;
  x: number;
  y: number;
  hp: number;
  coins: number;
  bossHp: number;
  bossPhase: string;
  items: string[];
  npcFlags: Record<string, boolean>;
  buffs: Record<string, number>;
  label: string;
}

export interface RuntimeState {
  levelId: LevelId;
  roomIndex: number;
  roomId: string;
  coins: number;
  hp: number;
  maxHp: number;
  items: string[];
  npcFlags: Record<string, boolean>;
  memes: string[];
  shopPurchased: boolean;
  seenCutscenes: string[];
  deaths: number;
  clears: { level1?: number; level2?: number };
  playSeconds: number;
  levelStartedAt: number;
  runElapsed: number;
  player: PlayerState;
  bossHp: number;
  bossPhase: string;
  buffs: Record<string, number>;
  checkpoint: Checkpoint | null;
  shopUnlockedAt: number;
  shopAvailable: boolean;
  shopSpawned: boolean;
  shopLoaned: boolean;
  shopTimer: number;
  shopSpawnTimer: number;
  shopImpatientShown: boolean;
  pickedCoins: string[];
  npcCooldowns: Record<string, number>;
  metShijun: boolean;
  firstDeathHintShown: boolean;
  visitedRooms: string[];
  roomEnterCount: Record<string, number>;
  exposure: number;
  exposureWarned: boolean;
  levelCompletePending: boolean;
  failReason: "gaze" | "hp" | "coins" | "pit" | null;
  // 第二关
  hitCounts: number;
  hitsThisPhase: number;
  giant: boolean;
  shoeActiveAt: number;
  giantCutsceneDone: boolean;
  victory: boolean;
  introDone: boolean;
  lastAttackId: string;
  nextAttackAt: number;
  attackStartedAt: number;
  attackTelegraphing: boolean;
  attackActive: boolean;
  bossInvuln: boolean;
  bossDefeated: boolean;
  fakeJiashengBitten: boolean;
  bossBubbleShown: boolean;
  giantBubbleShown: boolean;
  grabbedGun: boolean;
  level2StartCoins: number;
}

export interface ResumePlan {
  levelId: LevelId;
  roomIndex: number;
  /** 第一关 R4 买枪后过场被刷新打断：重进后补播夺枪过场 */
  replayGunCutscene: boolean;
  /** 直接进入第二关时是否补发 15000 开局金币（防止低金币直接开打） */
  grantStipend: boolean;
}

/**
 * 继续游戏时决定从哪恢复（docs/20 §2.5 + 存档软锁修复）：
 * - 第一关 R4 已买枪但还没拿到枪（过场中刷新）→ 回 R4 并补播过场；
 * - 第一关 R4 已通关 / 枪已入包（过场已完成但还没点继续）→ 直接进第二关并补发开局金币；
 * - 其它情况按 currentLevel/currentRoom 恢复。
 *
 * 用 npcFlags.l1_cleared 标记第一关是否已结算（buyGun 时显式写 false，markLevelComplete 写 true）：
 * 5.3s grantItem 到 6.0s markLevelComplete 之间的 0.7s 窗口里，枪已入包但还没记通关；
 * 新档有 marker=false → 回 R4 补播，避免少记通关/跳过结算；旧版本存档没有该键时用
 * 「有枪 + 已看过夺枪过场」推断已通关。
 */
export function planResume(save: SaveV1): ResumePlan {
  const levelId: LevelId = save.progress.currentLevel === 2 ? "level2" : "level1";
  const roomIndex = save.progress.currentRoom ?? 0;
  if (levelId === "level1" && roomIndex === 3 && save.progress.shopPurchased) {
    const hasGun = save.progress.items.some((i) => i.itemId === "bullet_gun");
    const flags = save.progress.npcFlags;
    const markerKnown = Object.prototype.hasOwnProperty.call(flags, "l1_cleared");
    const cleared =
      flags["l1_cleared"] === true ||
      (!markerKnown && hasGun && save.progress.seenCutscenes.includes("l1_gun_gag"));
    if (cleared && hasGun) {
      return { levelId: "level2", roomIndex: 0, replayGunCutscene: false, grantStipend: true };
    }
    return { levelId, roomIndex, replayGunCutscene: true, grantStipend: false };
  }
  return { levelId, roomIndex, replayGunCutscene: false, grantStipend: false };
}

export function createRuntime(save: SaveV1): RuntimeState {
  const levelId = (save.progress.currentLevel === 2 ? "level2" : "level1") as LevelId;
  return {
    levelId,
    roomIndex: 0,
    roomId: "",
    coins: save.progress.coins,
    hp: save.progress.maxHp,
    maxHp: Math.max(save.progress.maxHp, BALANCE.level2.playerHp),
    items: save.progress.items.map((i) => i.itemId),
    npcFlags: { ...save.progress.npcFlags },
    memes: [...save.progress.memes],
    shopPurchased: save.progress.shopPurchased,
    seenCutscenes: [...save.progress.seenCutscenes],
    deaths: save.stats.deaths,
    clears: { ...save.stats.clears },
    playSeconds: save.stats.playSeconds,
    levelStartedAt: 0,
    runElapsed: 0,
    player: createPlayerState(48, 512),
    bossHp: BALANCE.level2.boss2Hp,
    bossPhase: "p1",
    buffs: {},
    checkpoint: null,
    shopUnlockedAt: 0,
    shopAvailable: false,
    shopSpawned: false,
    shopLoaned: false,
    shopTimer: 0,
    shopSpawnTimer: 0,
    shopImpatientShown: false,
    pickedCoins: [],
    npcCooldowns: {},
    metShijun: false,
    firstDeathHintShown: false,
    visitedRooms: [],
    roomEnterCount: {},
    exposure: 0,
    exposureWarned: false,
    levelCompletePending: false,
    failReason: null,
    hitCounts: 0,
    hitsThisPhase: 0,
    giant: false,
    shoeActiveAt: 0,
    giantCutsceneDone: false,
    victory: false,
    introDone: false,
    lastAttackId: "",
    nextAttackAt: 0,
    attackStartedAt: 0,
    attackTelegraphing: false,
    attackActive: false,
    bossInvuln: false,
    bossDefeated: false,
    fakeJiashengBitten: false,
    bossBubbleShown: false,
    giantBubbleShown: false,
    grabbedGun: false,
    level2StartCoins: BALANCE.level2.startCoins,
  };
}

export function applyRunToSave(save: SaveV1, run: RuntimeState): SaveV1 {
  return {
    ...save,
    progress: {
      ...save.progress,
      currentLevel: run.levelId === "level2" ? 2 : 1,
      currentRoom: run.roomIndex,
      unlockedLevel: Math.max(save.progress.unlockedLevel, run.levelId === "level2" ? 2 : 1) as 1 | 2,
      coins: run.coins,
      maxHp: run.maxHp,
      items: run.items.map((itemId) => ({ itemId, count: 1 })),
      seenCutscenes: [...run.seenCutscenes],
      shopPurchased: run.shopPurchased,
      npcFlags: { ...run.npcFlags },
      memes: [...run.memes],
    },
    stats: {
      deaths: run.deaths,
      clears: { ...run.clears },
      playSeconds: run.playSeconds,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function snapshotCheckpoint(
  run: RuntimeState,
  label: string,
  overrides: Partial<Checkpoint> = {},
): Checkpoint {
  const cp: Checkpoint = {
    levelId: run.levelId,
    roomIndex: run.roomIndex,
    roomId: run.roomId,
    x: overrides.x ?? run.player.x,
    y: overrides.y ?? run.player.y,
    hp: overrides.hp ?? run.hp,
    coins: overrides.coins ?? run.coins,
    bossHp: overrides.bossHp ?? run.bossHp,
    bossPhase: overrides.bossPhase ?? run.bossPhase,
    items: [...run.items],
    npcFlags: { ...run.npcFlags },
    buffs: { ...run.buffs },
    label,
  };
  return cp;
}

export function applyCheckpoint(run: RuntimeState, cp: Checkpoint): void {
  run.hp = Math.max(1, cp.hp);
  run.coins = Math.max(0, cp.coins);
  run.bossHp = cp.bossHp;
  run.bossPhase = cp.bossPhase;
  run.items = [...cp.items];
  run.npcFlags = { ...cp.npcFlags };
  run.buffs = { ...cp.buffs };
  run.roomIndex = cp.roomIndex;
  run.roomId = cp.roomId;
  run.player = createPlayerState(cp.x, cp.y);
  run.exposure = 0;
  run.shopAvailable = false;
  run.shopSpawned = false;
  run.attackTelegraphing = false;
  run.attackActive = false;
  run.giant = cp.bossPhase === "p2_giant";
  run.shoeActiveAt = 0;
  run.giantCutsceneDone = run.giant;
  run.victory = false;
}

export function addCoins(run: RuntimeState, delta: number): number {
  const capped = Math.min(BALANCE.economy.maxCoins, Math.max(0, run.coins + delta));
  const actual = capped - run.coins;
  run.coins = capped;
  return actual;
}

export function addItem(run: RuntimeState, itemId: string): boolean {
  if (run.items.includes(itemId)) return false;
  run.items.push(itemId);
  return true;
}

export function hasItem(run: RuntimeState, itemId: string): boolean {
  return run.items.includes(itemId);
}

export function addMeme(run: RuntimeState, memeId: string): boolean {
  if (run.memes.includes(memeId)) return false;
  run.memes.push(memeId);
  return true;
}

export function markSeenCutscene(run: RuntimeState, cutsceneId: string): void {
  if (!run.seenCutscenes.includes(cutsceneId)) run.seenCutscenes.push(cutsceneId);
}
