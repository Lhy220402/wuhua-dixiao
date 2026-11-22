import { BALANCE } from "../config/balance";

export interface DamageInput {
  hp: number;
  coins: number;
  hpLoss: number;
  coinLoss: number;
  preventLethal?: boolean;
  hpFloor?: number;
  shieldCharges?: number;
}

export interface DamageResult {
  hp: number;
  coins: number;
  hpLost: number;
  coinsLost: number;
  shieldAbsorbed: boolean;
  failed: boolean;
  failReason: "hp" | "coins" | null;
}

/** 唯一伤害结算入口的纯逻辑部分（docs/50 §2.5 / docs/10 §2.4）。 */
export function resolveDamage(input: DamageInput): DamageResult {
  if ((input.shieldCharges ?? 0) > 0) {
    return {
      hp: input.hp,
      coins: input.coins,
      hpLost: 0,
      coinsLost: 0,
      shieldAbsorbed: true,
      failed: false,
      failReason: null,
    };
  }
  const floor = input.preventLethal ? Math.max(1, input.hpFloor ?? 1) : 0;
  const nextHp = input.preventLethal
    ? Math.max(floor, input.hp - input.hpLoss)
    : Math.max(0, input.hp - input.hpLoss);
  const nextCoins = Math.max(0, input.coins - input.coinLoss);
  const hpLost = input.hp - nextHp;
  const coinsLost = input.coins - nextCoins;

  let failed = false;
  let failReason: "hp" | "coins" | null = null;
  if (nextHp <= 0) {
    failed = true;
    failReason = "hp";
  } else if (nextCoins <= 0) {
    failed = true;
    failReason = "coins";
  }
  return {
    hp: nextHp,
    coins: nextCoins,
    hpLost,
    coinsLost,
    shieldAbsorbed: false,
    failed,
    failReason,
  };
}

export function canTakeDamage(invuln: number): boolean {
  return invuln <= 0;
}

export function playerHitDamage(): { hp: number; coins: number } {
  return { hp: BALANCE.level2.hitHpCost, coins: BALANCE.level2.hitCoinCost };
}

/** 接触伤害 0.2s 冷却，一帧最多一次 player-damaged（docs/50 §2.5）。 */
export function contactCooldownReady(lastHitAt: number, now: number): boolean {
  return now - lastHitAt >= 0.2;
}
