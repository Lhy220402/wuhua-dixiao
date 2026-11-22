import { describe, expect, it } from "vitest";
import { updateExposure } from "../systems/vision";

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
