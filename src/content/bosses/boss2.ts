import { BALANCE } from "../../config/balance";
import type { AttackDef, BossDef } from "../types";

const b = BALANCE.level2;
const a = BALANCE.attacks;

const a1: AttackDef = {
  id: "a1",
  type: "homingBurst",
  telegraphMs: a.a1.telegraph * 1000,
  durationMs: 900,
  cooldownMs: b.attackGap * 1000,
  damage: { hp: a.a1.damageHp, coins: a.a1.damageCoins },
  params: {
    count: a.a1.count,
    interval: a.a1.interval,
    speed: a.a1.speed,
    turnRate: a.a1.turnRate,
    hitbox: a.a1.hitbox,
    lifetime: a.a1.lifetime,
  },
};

const a2: AttackDef = {
  id: "a2",
  type: "chalkRain",
  telegraphMs: a.a2.telegraph * 1000,
  durationMs: 1200,
  cooldownMs: b.attackGap * 1000,
  damage: { hp: a.a2.damageHp, coins: a.a2.damageCoins },
  params: {
    count: a.a2.count,
    interval: a.a2.interval,
    fallSpeed: a.a2.fallSpeed,
    hitbox: a.a2.hitbox,
    hitboxH: a.a2.hitboxH,
    sampleHistory: a.a2.sampleHistory,
  },
};

const a3: AttackDef = {
  id: "a3",
  type: "shockwave",
  telegraphMs: a.a3.telegraph * 1000,
  durationMs: 900,
  cooldownMs: b.attackGap * 1000,
  damage: { hp: a.a3.damageHp, coins: a.a3.damageCoins },
  params: {
    speed: a.a3.speed,
    hitboxW: a.a3.hitboxW,
    hitboxH: a.a3.hitboxH,
  },
};

const a4: AttackDef = {
  id: "a4",
  type: "bananaTrap",
  telegraphMs: a.a4.telegraph * 1000,
  durationMs: 700,
  cooldownMs: b.attackGap * 1000,
  damage: { hp: a.a4.damageHp, coins: a.a4.damageCoins },
  params: {
    count: a.a4.count,
    spacing: a.a4.spacing,
    hitboxW: a.a4.hitboxW,
    hitboxH: a.a4.hitboxH,
    lifetime: a.a4.lifetime,
    slipDuration: a.a4.slipDuration,
    slideSpeed: a.a4.slideSpeed,
  },
};

const a5: AttackDef = {
  id: "a5",
  type: "giantShockwave",
  telegraphMs: a.a5.telegraph * 1000,
  durationMs: 900,
  cooldownMs: a.a5.interval * 1000,
  damage: { hp: a.a5.damageHp, coins: a.a5.damageCoins },
  params: {
    speed: a.a5.speed,
    hitboxW: a.a5.hitboxW,
    hitboxH: a.a5.hitboxH,
    interval: a.a5.interval,
  },
};

const a6: AttackDef = {
  id: "a6",
  type: "stomp",
  telegraphMs: a.a6.telegraph * 1000,
  durationMs: 700,
  cooldownMs: a.a6.interval * 1000,
  damage: { hp: a.a6.damageHp, coins: a.a6.damageCoins },
  params: {
    hitboxW: a.a6.hitboxW,
    hitboxH: a.a6.hitboxH,
    hold: a.a6.hold,
    interval: a.a6.interval,
  },
};

/** 第二关 Boss（学生形象，用户 2026-11-22 补充；名字未给，UI 用 BOSS 占位）。 */
export const BOSS2: BossDef = {
  id: "boss2",
  name: "第二关 Boss",
  hp: b.boss2Hp,
  behavior: "arena",
  art: "art/boss2",
  defeatMethod: "shoe",
  giantThreshold: b.giantThreshold,
  hitbox: {
    x: b.bossHurtboxX,
    y: b.bossHurtboxY,
    w: b.bossHurtboxW,
    h: b.bossHurtboxH,
  },
  shoeHitbox: {
    x: b.shoeX,
    y: b.shoeY,
    w: b.shoeW,
    h: b.shoeH,
  },
  phases: [
    {
      id: "p1",
      hpMin: b.giantThreshold + 1,
      hpMax: b.boss2Hp,
      invulnerable: "none",
      victory: "defeat",
      attacks: [a1, a2, a3, a4],
    },
    {
      id: "p2_giant",
      hpMin: 0,
      hpMax: b.giantThreshold,
      enterCutscene: "l2_giant",
      invulnerable: "bullets",
      victory: "shoe",
      attacks: [a5, a6],
    },
  ],
};
