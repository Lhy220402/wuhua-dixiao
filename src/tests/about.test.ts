import { describe, expect, it } from "vitest";
import { ABOUT } from "../content/about";

describe("About 内容（docs/40 §5.12）", () => {
  it("仓库链接指向 GitHub 与 Gitee，且为 https 外链", () => {
    expect(ABOUT.links.map((link) => link.url)).toEqual([
      "https://github.com/idealismo10/WUHUADIxiaozhuan",
      "https://gitee.com/idealismo10/WUHUADIxiaozhuan",
    ]);
    for (const link of ABOUT.links) {
      expect(link.url.startsWith("https://")).toBe(true);
      expect(link.label.length).toBeGreaterThan(0);
      expect(link.note).toContain("idealismo10");
    }
  });

  it("玩法简介非空，且不写入任何小明台词", () => {
    expect(ABOUT.intro.length).toBeGreaterThan(20);
    expect(ABOUT.bullets.length).toBe(3);
    expect(ABOUT.bullets.every((line) => line.length > 0)).toBe(true);
    const all = [ABOUT.intro, ...ABOUT.bullets, ABOUT.footer].join("\n");
    expect(all).not.toContain("小明");
  });
});
