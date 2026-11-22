import { describe, expect, it } from "vitest";
import { applyBulletDamage, hitDropsCoin, nextPhase, shouldGiant } from "../systems/boss";
import { BOSS2 } from "../content/bosses/boss2";

describe("boss", () => {
  it("picks phase by hp with 41/40 boundaries", () => {
    expect(nextPhase(41, BOSS2.phases)?.id).toBe("p1");
    expect(nextPhase(40, BOSS2.phases)?.id).toBe("p2_giant");
    expect(nextPhase(100, BOSS2.phases)?.id).toBe("p1");
  });
  it("enters giant at 40", () => {
    expect(shouldGiant(41)).toBe(false);
    expect(shouldGiant(40)).toBe(true);
  });
  it("scrapes bullets in giant phase", () => {
    const r = applyBulletDamage(40, "bullets", true);
    expect(r.hp).toBe(40);
    expect(r.damage).toBe(0);
    expect(r.scraped).toBe(true);
  });
  it("deals 4 damage in phase 1", () => {
    const r = applyBulletDamage(100, "none", false);
    expect(r.hp).toBe(96);
    expect(r.damage).toBe(4);
  });
  it("drops a coin every 3rd hit", () => {
    expect(hitDropsCoin(1)).toBe(false);
    expect(hitDropsCoin(3)).toBe(true);
    expect(hitDropsCoin(6)).toBe(true);
  });
});
