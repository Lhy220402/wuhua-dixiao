import type { BuffDef } from "./types";

/** 老吴「纱魔罗托」：视线读条增速 ×0.6 / 25s / 冷却 60s（docs/10 §2.7）。 */
export const BUFFS: Record<string, BuffDef> = {
  shamoluotuo: {
    id: "shamoluotuo",
    name: "纱魔罗托",
    durationMs: 25000,
    icon: "art/buff/music",
    effects: { exposureRateMul: 0.6 },
    hudText: "纱魔罗托：笑长视线读条 ×0.6（25s）",
  },
  shield: {
    id: "shield",
    name: "护盾",
    durationMs: 30000,
    icon: "art/buff/shield",
    effects: { shieldHits: 1 },
    hudText: "护盾：挡一次伤害（30s）",
  },
  coinBonus: {
    id: "coinBonus",
    name: "金币加成",
    durationMs: 15000,
    icon: "art/buff/coin",
    effects: { coinMultiplier: 1.5 },
    hudText: "金币加成：+50%（15s）",
  },
};
