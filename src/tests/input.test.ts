import { describe, expect, it } from "vitest";
import { actionsForCode, directionForCode } from "../systems/input";

describe("input mapping", () => {
  it("maps WASD/arrows", () => {
    expect(actionsForCode("KeyA")).toEqual(["moveLeft"]);
    expect(actionsForCode("ArrowRight")).toEqual(["moveRight"]);
    expect(directionForCode("KeyA")).toBe("left");
    expect(directionForCode("KeyD")).toBe("right");
  });
  it("maps jump aliases", () => {
    expect(actionsForCode("Space")).toContain("jump");
    expect(actionsForCode("KeyZ")).toContain("jump");
    expect(actionsForCode("KeyK")).toContain("jump");
  });
  it("maps interact and shoot", () => {
    expect(actionsForCode("KeyE")).toContain("interact");
    expect(actionsForCode("KeyJ")).toContain("shoot");
    expect(actionsForCode("KeyX")).toContain("shoot");
  });
  it("ignores unknown keys", () => {
    expect(actionsForCode("KeyQ")).toEqual([]);
    expect(directionForCode("KeyQ")).toBeNull();
  });
});
