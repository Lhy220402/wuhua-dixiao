import { describe, expect, it } from "vitest";
import { Fsm } from "../app/fsm";

describe("Fsm", () => {
  it("walks the happy path", () => {
    const f = new Fsm();
    expect(f.goState("Title")).toBe(true);
    expect(f.goState("LevelIntro")).toBe(true);
    expect(f.goState("Playing")).toBe(true);
    expect(f.goState("LevelClear")).toBe(true);
    expect(f.goState("ToBeContinued")).toBe(true);
  });
  it("rejects illegal transitions", () => {
    const f = new Fsm();
    expect(f.goState("Playing")).toBe(false);
    expect(f.state).toBe("Boot");
  });
  it("pushes and closes overlays", () => {
    const f = new Fsm();
    f.goState("Title");
    f.goState("LevelIntro");
    f.goState("Playing");
    f.goState("Dialogue");
    expect(f.peekOverlay()).toBe("Playing");
    expect(f.closeOverlay()).toBe("Playing");
    expect(f.state).toBe("Playing");
  });
  it("allows Fail -> Retry (Playing)", () => {
    const f = new Fsm();
    f.goState("Title");
    f.goState("LevelIntro");
    f.goState("Playing");
    f.goState("Fail");
    expect(f.goState("Playing")).toBe(true);
  });
  it("freezes the world in overlays", () => {
    const f = new Fsm();
    f.goState("Title");
    f.goState("LevelIntro");
    f.goState("Playing");
    f.goState("Paused");
    expect(f.isWorldFrozen()).toBe(true);
    f.goState("Playing");
    expect(f.isWorldFrozen()).toBe(false);
  });
  it("notifies listeners", () => {
    const f = new Fsm();
    const seen: string[] = [];
    f.onChange((next) => seen.push(next));
    f.goState("Title");
    f.goState("LevelIntro");
    expect(seen).toEqual(["Title", "LevelIntro"]);
  });
  it("rejects Boot -> Playing even with overlays", () => {
    const f = new Fsm();
    expect(f.goState("LevelIntro")).toBe(false);
  });
});
