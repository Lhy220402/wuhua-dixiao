import { describe, expect, it } from "vitest";
import { playerRect } from "../core/types";
import { BALANCE } from "../config/balance";
import { beamHitsPlayer, updateExposure } from "../systems/vision";

describe("updateExposure", () => {
  it("accumulates while visible", () => {
    const s = updateExposure(1, true, { value: 0, warned: false });
    expect(s.value).toBeCloseTo(1);
    expect(s.warned).toBe(false);
  });
  it("decays at 3x", () => {
    const s = updateExposure(0.2, false, { value: 2, warned: true });
    expect(s.value).toBeCloseTo(1.4);
  });
  it("clamps to threshold", () => {
    const s = updateExposure(10, true, { value: 0, warned: false });
    expect(s.value).toBe(2.5);
  });
  it("never goes below zero", () => {
    const s = updateExposure(10, false, { value: 0.5, warned: false });
    expect(s.value).toBe(0);
  });
  it("warns at 50%", () => {
    expect(updateExposure(1.24, true, { value: 0, warned: false }).warned).toBe(false);
    expect(updateExposure(1.25, true, { value: 0, warned: false }).warned).toBe(true);
    expect(updateExposure(0.5, true, { value: 1, warned: false }).warned).toBe(true);
  });
  it("applies the buff multiplier", () => {
    const s = updateExposure(1, true, { value: 0, warned: false }, { rateMul: 0.6 });
    expect(s.value).toBeCloseTo(0.6);
  });
});

describe("beamHitsPlayer", () => {
  const w = BALANCE.level1.gazeBeamWidth;
  // 脚底 y=512、20×28 的玩家碰撞盒：x 470–490、y 484–512
  const body = playerRect(480, 512, 20, 28);

  it("beam overlaps the body", () => {
    expect(beamHitsPlayer(480, 72, 512, w, body)).toBe(true);
  });

  it("beam grazes the body edge (touching edges do not count)", () => {
    expect(beamHitsPlayer(492, 72, 512, w, body)).toBe(true);
    expect(beamHitsPlayer(493, 72, 512, w, body)).toBe(false);
    expect(beamHitsPlayer(468, 72, 512, w, body)).toBe(true);
    expect(beamHitsPlayer(466, 72, 512, w, body)).toBe(false);
  });

  it("beam truncated above the feet (plaque shadow) does not hit", () => {
    expect(beamHitsPlayer(480, 72, 484, w, body)).toBe(false);
    expect(beamHitsPlayer(480, 72, 485, w, body)).toBe(true);
  });

  it("degenerate or inverted beams never hit", () => {
    expect(beamHitsPlayer(480, 512, 512, w, body)).toBe(false);
    expect(beamHitsPlayer(480, 512, 72, w, body)).toBe(false);
  });
});
