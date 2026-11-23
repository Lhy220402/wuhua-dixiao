import { describe, expect, it } from "vitest";
import { playerRect } from "../core/types";
import { BALANCE } from "../config/balance";
import { gazeFanHitsPlayer, updateExposure } from "../systems/vision";

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

describe("gazeFanHitsPlayer", () => {
  const eye = { x: 480, y: 64 };
  const dir = { x: 0, y: 1 };
  const half = (BALANCE.level1.gazeFanHalfAngle * Math.PI) / 180;
  const bodyAt = (x: number, feetY = 512) => playerRect(x, feetY, BALANCE.player.w, BALANCE.player.h);

  it("玩家身体在扇形正中会被照到", () => {
    expect(gazeFanHitsPlayer(eye, dir, half, bodyAt(480))).toBe(true);
  });

  it("扇形边缘按身体采样点判定（半宽约 8°）", () => {
    expect(gazeFanHitsPlayer(eye, dir, half, bodyAt(530))).toBe(true);
    expect(gazeFanHitsPlayer(eye, dir, half, bodyAt(545))).toBe(true);
    expect(gazeFanHitsPlayer(eye, dir, half, bodyAt(560))).toBe(false);
    expect(gazeFanHitsPlayer(eye, dir, half, bodyAt(430))).toBe(true);
    expect(gazeFanHitsPlayer(eye, dir, half, bodyAt(400))).toBe(false);
  });

  it("挂牌挡住到玩家的连线（斜向阴影安全），移开挂牌后同位置会被照到", () => {
    const plaque = { x: 432, y: 256, w: 96, h: 20 };
    expect(gazeFanHitsPlayer(eye, dir, half, bodyAt(530), [plaque])).toBe(false);
    expect(gazeFanHitsPlayer(eye, dir, half, bodyAt(530), [])).toBe(true);
  });

  it("站在挂牌顶面仍会被照到（挂牌只挡它后面的区域）", () => {
    const plaque = { x: 432, y: 256, w: 96, h: 20 };
    expect(gazeFanHitsPlayer(eye, dir, half, bodyAt(480, 256), [plaque])).toBe(true);
  });

  it("半角为 0 或方向反转时不命中", () => {
    expect(gazeFanHitsPlayer(eye, dir, 0, bodyAt(480))).toBe(false);
    expect(gazeFanHitsPlayer(eye, { x: 0, y: -1 }, half, bodyAt(480))).toBe(false);
  });
});
