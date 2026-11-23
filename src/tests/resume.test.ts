import { describe, expect, it } from "vitest";
import { planResume } from "../app/state";
import { defaultSave, type SaveV1 } from "../save/schema";

function withProgress(patch: Partial<SaveV1["progress"]>): SaveV1 {
  const save = defaultSave();
  save.progress = { ...save.progress, ...patch };
  return save;
}

const GUN = [{ itemId: "bullet_gun", count: 1 }];

describe("planResume（继续游戏）", () => {
  it("普通第一关从中断房间继续", () => {
    const plan = planResume(withProgress({ currentLevel: 1, currentRoom: 1 }));
    expect(plan).toEqual({
      levelId: "level1",
      roomIndex: 1,
      replayGunCutscene: false,
      grantStipend: false,
    });
  });

  it("R4 已买枪但枪还没入包（过场中刷新）→ 回 R4 补播过场，避免软锁", () => {
    const plan = planResume(
      withProgress({ currentLevel: 1, currentRoom: 3, shopPurchased: true, items: [] }),
    );
    expect(plan).toEqual({
      levelId: "level1",
      roomIndex: 3,
      replayGunCutscene: true,
      grantStipend: false,
    });
  });

  it("5.3s~6.0s 窗口（枪已入包但 l1_cleared=false）→ 补播过场，避免少记通关", () => {
    const plan = planResume(
      withProgress({
        currentLevel: 1,
        currentRoom: 3,
        shopPurchased: true,
        items: GUN,
        seenCutscenes: ["l1_gun_gag"],
        npcFlags: { l1_cleared: false },
      }),
    );
    expect(plan.replayGunCutscene).toBe(true);
    expect(plan.grantStipend).toBe(false);
  });

  it("旧档没有 l1_cleared 键：有枪 + 已看夺枪过场 → 视为通关，直接进第二关", () => {
    const plan = planResume(
      withProgress({
        currentLevel: 1,
        currentRoom: 3,
        shopPurchased: true,
        items: GUN,
        seenCutscenes: ["l1_gun_gag"],
        npcFlags: {},
      }),
    );
    expect(plan.levelId).toBe("level2");
    expect(plan.roomIndex).toBe(0);
    expect(plan.replayGunCutscene).toBe(false);
    expect(plan.grantStipend).toBe(true);
  });

  it("已通关（l1_cleared=true + 枪）→ 直接进第二关并补发开局金币", () => {
    const plan = planResume(
      withProgress({
        currentLevel: 1,
        currentRoom: 3,
        shopPurchased: true,
        items: GUN,
        npcFlags: { l1_cleared: true },
      }),
    );
    expect(plan.levelId).toBe("level2");
    expect(plan.grantStipend).toBe(true);
  });

  it("矛盾档（l1_cleared=true 但没枪）→ 仍补播过场，保证不卡死", () => {
    const plan = planResume(
      withProgress({
        currentLevel: 1,
        currentRoom: 3,
        shopPurchased: true,
        items: [],
        npcFlags: { l1_cleared: true },
      }),
    );
    expect(plan.levelId).toBe("level1");
    expect(plan.replayGunCutscene).toBe(true);
  });

  it("第二关按存档房间继续", () => {
    const plan = planResume(withProgress({ currentLevel: 2, currentRoom: 0 }));
    expect(plan.levelId).toBe("level2");
    expect(plan.replayGunCutscene).toBe(false);
    expect(plan.grantStipend).toBe(false);
  });
});
