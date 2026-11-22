import { BALANCE } from "../config/balance";
import type { BossDef, BossPhaseDef } from "../content/types";

/** 按血量选择 Boss 阶段；阈值边界 41/40（docs/51 §2.5）。阶段只进不退由调用方保证。 */
export function nextPhase(hp: number, phases: readonly BossPhaseDef[]): BossPhaseDef | null {
  for (const phase of phases) {
    if (hp >= phase.hpMin && hp <= phase.hpMax) return phase;
  }
  return null;
}

export function phaseIndex(boss: BossDef, phaseId: string): number {
  return boss.phases.findIndex((p) => p.id === phaseId);
}

export function shouldGiant(hp: number, threshold = BALANCE.level2.giantThreshold): boolean {
  return hp <= threshold;
}

export interface BulletHitResult {
  hp: number;
  damage: number;
  scraped: boolean;
  defeated: boolean;
}

/** 阶段 2/巨大化：子弹刮痧，伤害 0；阶段 1 正常扣血。 */
export function applyBulletDamage(
  hp: number,
  invulnerable: "none" | "bullets" | "all" | undefined,
  giant: boolean,
  damage = BALANCE.level2.bulletDamage,
): BulletHitResult {
  if (invulnerable === "all" || invulnerable === "bullets" || giant) {
    return { hp, damage: 0, scraped: true, defeated: false };
  }
  const next = Math.max(0, hp - damage);
  return { hp: next, damage, scraped: false, defeated: next <= 0 };
}

export function hitDropsCoin(
  hits: number,
  perCoin = BALANCE.economy.bossHitsPerCoin,
): boolean {
  return hits > 0 && hits % perCoin === 0;
}

export function bossHpPct(hp: number, maxHp: number): number {
  if (maxHp <= 0) return 0;
  return Math.max(0, Math.min(1, hp / maxHp));
}

export function nextAttackId(attackIds: readonly string[], lastId: string, round: number): string {
  if (attackIds.length === 0) return "";
  let idx = (round - 1) % attackIds.length;
  let id = attackIds[idx] ?? attackIds[0]!;
  if (id === lastId && attackIds.length > 1) {
    idx = (idx + 1) % attackIds.length;
    id = attackIds[idx] ?? attackIds[0]!;
  }
  return id;
}
