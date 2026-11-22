import { describe, expect, it } from "vitest";
import { segmentHitsRect } from "../systems/geom";

const r = { x: 10, y: 10, w: 20, h: 20 };

describe("segmentHitsRect", () => {
  it("detects a segment passing through", () => {
    expect(segmentHitsRect({ x: 0, y: 20 }, { x: 40, y: 20 }, r)).toBe(true);
  });
  it("detects a tangent segment", () => {
    expect(segmentHitsRect({ x: 0, y: 10 }, { x: 40, y: 10 }, r)).toBe(true);
  });
  it("detects an endpoint inside", () => {
    expect(segmentHitsRect({ x: 15, y: 15 }, { x: 5, y: 5 }, r)).toBe(true);
  });
  it("detects zero-length segment inside", () => {
    expect(segmentHitsRect({ x: 20, y: 20 }, { x: 20, y: 20 }, r)).toBe(true);
  });
  it("rejects zero-length segment outside", () => {
    expect(segmentHitsRect({ x: 0, y: 0 }, { x: 0, y: 0 }, r)).toBe(false);
  });
  it("rejects a segment missing the rect", () => {
    expect(segmentHitsRect({ x: 0, y: 40 }, { x: 40, y: 40 }, r)).toBe(false);
  });
});
