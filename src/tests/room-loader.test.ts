import { describe, expect, it } from "vitest";
import { LEVEL1 } from "../content/levels/level1";
import { resolveEntry } from "../systems/room-loader";

describe("room-loader", () => {
  it("resolves an exit spawn", () => {
    const entry = resolveEntry(LEVEL1, "l1-r2");
    expect(entry.room.id).toBe("l1-r2");
    expect(entry.spawn.x).toBe(48);
    expect(entry.spawn.y).toBe(512);
  });
  it("falls back to spawn for an unknown room", () => {
    const entry = resolveEntry(LEVEL1, "nope", 0);
    expect(entry.room.id).toBe("l1-r1");
    expect(entry.spawn).toEqual(LEVEL1.rooms[0]!.spawn);
  });
  it("resolves the requested room index", () => {
    const entry = resolveEntry(LEVEL1, null, 2);
    expect(entry.index).toBe(2);
    expect(entry.room.id).toBe("l1-r3");
  });
});
