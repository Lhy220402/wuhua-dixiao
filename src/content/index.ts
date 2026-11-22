import { AUDIO_MANIFEST } from "./audio-manifest";
import { BOSS2 } from "./bosses/boss2";
import { XIAOCHANG } from "./bosses/boss1";
import { BUFFS } from "./buffs";
import { CUTSCENES } from "./cutscenes";
import { DIALOGUE } from "./dialogue";
import { ITEMS, ITEM_BY_ID } from "./items";
import { LEVEL1 } from "./levels/level1";
import { LEVEL2 } from "./levels/level2";
import { MEMES } from "./memes";
import { NPCS } from "./npcs";
import { SHOPS } from "./shops";
import type { BossDef, DialogueDef, GameContent, ItemDef, LevelDef, NpcDef } from "./types";

export const CONTENT: GameContent = {
  levels: [LEVEL1, LEVEL2],
  bosses: { xiaochang: XIAOCHANG, boss2: BOSS2 },
  npcs: NPCS,
  dialogue: DIALOGUE,
  items: ITEMS,
  shops: SHOPS,
  buffs: BUFFS,
  memes: MEMES,
  cutscenes: CUTSCENES,
  audio: AUDIO_MANIFEST,
};

export const NPC_BY_ID: Record<string, NpcDef> = Object.fromEntries(
  NPCS.map((n) => [n.id, n]),
);
export const LEVEL_BY_ID: Record<string, LevelDef> = Object.fromEntries(
  CONTENT.levels.map((l) => [l.id, l]),
);
export const BOSS_BY_ID: Record<string, BossDef> = CONTENT.bosses;

export function getItem(id: string): ItemDef | undefined {
  return ITEM_BY_ID[id];
}

export function getDialogue(id: string): DialogueDef | undefined {
  return DIALOGUE[id];
}

export interface ValidationIssue {
  path: string;
  message: string;
}

/** dev 启动校验：字段、id 唯一、引用完整（docs/50 §2.6 / 51 T05）。 */
export function validateContent(content: GameContent = CONTENT): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const roomIds = new Set<string>();
  const levelIds = new Set<string>();

  for (const level of content.levels) {
    if (levelIds.has(level.id)) issues.push({ path: `levels.${level.id}`, message: "重复关卡 id" });
    levelIds.add(level.id);
    if (!level.title) issues.push({ path: `levels.${level.id}.title`, message: "缺少标题" });
    if (level.rooms.length === 0) issues.push({ path: `levels.${level.id}`, message: "没有房间" });
    level.rooms.forEach((room, index) => {
      if (roomIds.has(room.id)) {
        issues.push({ path: `levels.${level.id}.rooms[${index}]`, message: `重复房间 id ${room.id}` });
      }
      roomIds.add(room.id);
      if (!room.spawn) issues.push({ path: `rooms.${room.id}.spawn`, message: "缺少出生点" });
      if (room.boss && !content.bosses[room.boss.bossId]) {
        issues.push({ path: `rooms.${room.id}.boss`, message: `Boss 不存在：${room.boss.bossId}` });
      }
      if (room.shop && !content.shops[room.shop.shopId]) {
        issues.push({ path: `rooms.${room.id}.shop`, message: `商店不存在：${room.shop.shopId}` });
      }
      for (const npc of room.npcs) {
        if (!content.npcs.some((n) => n.id === npc.npcId)) {
          issues.push({ path: `rooms.${room.id}.npcs`, message: `NPC 不存在：${npc.npcId}` });
        }
      }
      for (const exit of room.exits) {
        if (!level.rooms.some((r) => r.id === exit.toRoom)) {
          issues.push({ path: `rooms.${room.id}.exits`, message: `出口指向不存在的房间：${exit.toRoom}` });
        }
      }
    });
  }

  for (const boss of Object.values(content.bosses)) {
    if (!boss.name) issues.push({ path: `bosses.${boss.id}.name`, message: "缺少名字" });
    if (boss.phases.length === 0) {
      issues.push({ path: `bosses.${boss.id}.phases`, message: "没有阶段" });
    }
  }

  for (const npc of content.npcs) {
    const d = content.dialogue[npc.dialogueId];
    if (!d) issues.push({ path: `npcs.${npc.id}.dialogueId`, message: `对白不存在：${npc.dialogueId}` });
    if (npc.id === "xiaoming" && d && d.lines.length !== 0) {
      issues.push({ path: `npcs.xiaoming`, message: "小明不能有任何台词（docs/30 §2.3）" });
    }
    if (npc.shortDialogueId && !content.dialogue[npc.shortDialogueId]) {
      issues.push({ path: `npcs.${npc.id}.shortDialogueId`, message: "短对白不存在" });
    }
    if (npc.effect?.type === "item") {
      const itemId = npc.effect.itemId;
      if (!content.items.some((i) => i.id === itemId)) {
        issues.push({ path: `npcs.${npc.id}.effect`, message: `道具不存在：${itemId}` });
      }
    }
    if (npc.effect?.type === "buff" && !content.buffs[npc.effect.buffId]) {
      issues.push({ path: `npcs.${npc.id}.effect`, message: `Buff 不存在：${npc.effect.buffId}` });
    }
  }

  for (const dialogue of Object.values(content.dialogue)) {
    if (dialogue.id !== "xiaoming_air" && dialogue.lines.some((l) => !l.text && l.style !== "silent")) {
      issues.push({ path: `dialogue.${dialogue.id}`, message: "空台词行" });
    }
  }

  for (const shop of Object.values(content.shops)) {
    for (const row of shop.items) {
      if (!content.items.some((i) => i.id === row.itemId)) {
        issues.push({ path: `shops.${shop.id}`, message: `商品不存在：${row.itemId}` });
      }
      if (row.price < 0) issues.push({ path: `shops.${shop.id}`, message: "价格为负" });
    }
    if (shop.purchaseCutscene && !content.cutscenes[shop.purchaseCutscene]) {
      issues.push({ path: `shops.${shop.id}.purchaseCutscene`, message: "过场不存在" });
    }
  }

  for (const level of content.levels) {
    if (level.bossId && !content.bosses[level.bossId]) {
      issues.push({ path: `levels.${level.id}.bossId`, message: "关卡 Boss 不存在" });
    }
  }

  return issues;
}

export type { GameContent, LevelDef, RoomDef, BossDef, NpcDef } from "./types";
