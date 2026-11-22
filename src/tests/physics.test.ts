import { describe, expect, it } from "vitest";
import { BALANCE } from "../config/balance";
import { createPlayerState, stepPlayer } from "../systems/physics";

const floor = { x: 0, y: 512, w: 960, h: 28 };
const solids = [floor];

function settle() {
  const p = createPlayerState(100, 512);
  for (let i = 0; i < 10; i++) {
    stepPlayer(p, { axis: 0, jumpHeld: false, jumpPressed: false }, solids, 1 / 120);
  }
  return p;
}

function jumpHeight(tap: boolean): number {
  const p = settle();
  let minY = p.y;
  for (let i = 0; i < 120; i++) {
    const first = i === 0;
    stepPlayer(
      p,
      { axis: 0, jumpHeld: tap ? false : true, jumpPressed: first },
      solids,
      1 / 120,
    );
    if (p.y < minY) minY = p.y;
  }
  return 512 - minY;
}

describe("player jump", () => {
  it("a tap still clears about two tiles (jumpCutDelay)", () => {
    const h = jumpHeight(true);
    expect(h).toBeGreaterThan(60);
    expect(h).toBeLessThan(85);
  });

  it("holding jump reaches the full ~3.2-3.4 tile height", () => {
    const h = jumpHeight(false);
    expect(h).toBeGreaterThan(95);
    expect(h).toBeLessThan(120);
  });

  it("jumpCut is settled at most once (gravity only afterwards)", () => {
    const p = settle();
    stepPlayer(p, { axis: 0, jumpHeld: false, jumpPressed: true }, solids, 1 / 120);
    // 跑过 jumpCutDelay，让短跳结算
    for (let i = 0; i < 20; i++) {
      stepPlayer(p, { axis: 0, jumpHeld: false, jumpPressed: false }, solids, 1 / 120);
    }
    const before = p.vy;
    stepPlayer(p, { axis: 0, jumpHeld: false, jumpPressed: false }, solids, 1 / 120);
    // 只应有重力增量，不应再次乘 jumpCut
    expect(p.vy).toBeCloseTo(before + BALANCE.player.gravity / 120, 1);
  });

  it("does not allow a second jump in the air", () => {
    const p = settle();
    stepPlayer(p, { axis: 0, jumpHeld: true, jumpPressed: true }, solids, 1 / 120);
    const vyAfterJump = p.vy;
    stepPlayer(p, { axis: 0, jumpHeld: true, jumpPressed: true }, solids, 1 / 120);
    expect(p.vy).toBeGreaterThan(vyAfterJump);
  });

  it("balance keeps jumpCutDelay below one full jump", () => {
    expect(BALANCE.player.jumpCutDelay).toBeGreaterThan(0);
    expect(BALANCE.player.jumpCutDelay).toBeLessThan(0.3);
  });
});
