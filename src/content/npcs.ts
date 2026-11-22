import type { NpcDef } from "./types";

/** 四名 NPC（docs/30 §2.6）。位置在 RoomDef.npcs 里，形象由 art/npcs.ts 画。 */
export const NPCS: NpcDef[] = [
  {
    id: "laowu",
    name: "老吴",
    art: "art/npc/laowu",
    dialogueId: "laowu_main",
    shortDialogueId: "laowu_cooldown",
    trigger: "interact",
    repeat: "cooldown",
    cooldownMs: 60000,
    facing: 1,
    effect: { type: "buff", buffId: "shamoluotuo" },
  },
  {
    id: "xiaoming",
    name: "小明",
    art: "art/npc/xiaoming",
    dialogueId: "xiaoming_air",
    trigger: "auto",
    repeat: "infinite",
    facing: -1,
    effect: { type: "none" },
  },
  {
    id: "shijun",
    name: "食菌",
    art: "art/npc/shijun",
    dialogueId: "shijun_main",
    shortDialogueId: "shijun_repeat",
    trigger: "interact",
    repeat: "once",
    facing: -1,
    effect: { type: "item", itemId: "banana", once: true },
  },
  {
    id: "jiasheng",
    name: "假生",
    art: "art/npc/jiasheng",
    dialogueId: "jiasheng_main",
    shortDialogueId: "jiasheng_repeat",
    trigger: "interact",
    repeat: "once",
    facing: -1,
    effect: { type: "damage", hpCost: 1, preventLethal: true, once: true },
  },
];
