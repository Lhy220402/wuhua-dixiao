import { describe, expect, it } from "vitest";
import { defaultSave } from "../save/schema";
import { normalizeSave, parseSave, serializeSave } from "../save/serialize";

describe("save", () => {
  it("returns a default save", () => {
    const s = defaultSave();
    expect(s.version).toBe(1);
    expect(s.progress.coins).toBe(0);
    expect(s.settings.masterVolume).toBe(0.8);
  });
  it("roundtrips", () => {
    const s = defaultSave();
    s.progress.coins = 14;
    s.progress.items = [{ itemId: "bullet_gun", count: 1 }];
    const parsed = parseSave(serializeSave(s));
    expect(parsed.status).toBe("ok");
    expect(parsed.save.progress.coins).toBe(14);
    expect(parsed.save.progress.items[0]?.itemId).toBe("bullet_gun");
  });
  it("handles empty storage", () => {
    expect(parseSave(null).status).toBe("empty");
  });
  it("handles corrupt JSON", () => {
    const r = parseSave("{nope");
    expect(r.status).toBe("corrupt");
    expect(r.save.progress.coins).toBe(0);
  });
  it("fills missing fields", () => {
    const s = normalizeSave({ version: 1 });
    expect(s.settings.masterVolume).toBe(0.8);
    expect(s.progress.unlockedLevel).toBe(1);
  });
  it("drops unknown fields", () => {
    const s = normalizeSave({ version: 1, hack: true, progress: { coins: 5, evil: 1 } });
    expect("hack" in s).toBe(false);
    expect((s.progress as unknown as Record<string, unknown>)["evil"]).toBeUndefined();
  });
  it("flags a future version as read-only", () => {
    const r = parseSave(JSON.stringify({ version: 99, progress: { coins: 5 } }));
    expect(r.status).toBe("version");
    expect(r.readOnly).toBe(true);
  });
  it("normalizes old versions", () => {
    const r = parseSave(JSON.stringify({ version: 0, progress: { coins: 3 } }));
    expect(r.status).toBe("version");
    expect(r.readOnly).toBe(false);
    expect(r.save.progress.coins).toBe(3);
  });
});
