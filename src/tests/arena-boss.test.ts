import { describe, expect, it } from "vitest";
import { BALANCE } from "../config/balance";
import { BOSS2 } from "../content/bosses/boss2";
import type { Rect } from "../core/types";
import { ArenaBoss, type ArenaCallbacks } from "../systems/arena-boss";

/**
 * 第二关 Boss 状态机回归测试（docs/21 §2.3 / §3）。
 * 重点覆盖：A2 粉笔雨按 1.5s 历史采样、A6 踩踏落点锁定、A3 预警位置、掩体来源。
 */

const DT = 1 / 120;

const DESKS: Rect[] = [
  { x: 224, y: 448, w: 96, h: 64 },
  { x: 480, y: 448, w: 96, h: 64 },
];

const noop: ArenaCallbacks = {
  onHurt: () => undefined,
  onBubble: () => undefined,
  onAttack: () => undefined,
  onShoeNear: () => undefined,
};

interface StepOptions {
  maxSeconds?: number;
  playerAt?: (t: number) => number;
}

function advanceUntil(
  boss: ArenaBoss,
  pred: () => boolean,
  opts: StepOptions = {},
): number {
  const max = Math.ceil((opts.maxSeconds ?? 20) / DT);
  let t = 0;
  for (let i = 0; i < max; i++) {
    if (pred()) return t;
    t += DT;
    const x = opts.playerAt ? opts.playerAt(t) : 480;
    boss.update(DT, { x, y: 512 }, noop);
  }
  if (pred()) return t;
  throw new Error(`condition not reached; mode=${boss.state.mode} attack=${boss.state.attackId}`);
}

describe("ArenaBoss 攻击判定修复", () => {
  it("A2 粉笔雨按玩家过去 1.5s 的位置采样，5 个落点不再叠在一列", () => {
    const boss = new ArenaBoss(BOSS2, DESKS);
    // 玩家以 120px/s 横移，6s 后到达 A2；1.5s 窗口内应覆盖约 180px
    advanceUntil(
      boss,
      () => boss.state.attackId === "a2" && boss.state.telegraph,
      { playerAt: (t) => 120 + 120 * t, maxSeconds: 20 },
    );
    const xs = boss.state.warnings.filter((w) => w.kind === "chalk").map((w) => w.x);
    expect(xs.length).toBe(BALANCE.attacks.a2.count);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(100);
  });

  it("A3 冲击波预警画在 Boss 脚下，而不是右墙", () => {
    const boss = new ArenaBoss(BOSS2, DESKS);
    advanceUntil(
      boss,
      () => boss.state.attackId === "a3" && boss.state.telegraph,
      { maxSeconds: 30 },
    );
    const warn = boss.state.warnings.find((w) => w.kind === "shock");
    expect(warn).toBeTruthy();
    expect(warn!.x).toBe(boss.hurtbox.x - 10);
  });

  it("A6 巨足踩踏的落点在预警时锁定，玩家离开阴影后不会追到新位置", () => {
    const boss = new ArenaBoss(BOSS2, DESKS);
    boss.beginGiant();
    // 先让 A5 过去，等 A6 预警出现
    advanceUntil(boss, () => boss.state.warnings.some((w) => w.kind === "stomp"), {
      playerAt: () => 320,
      maxSeconds: 8,
    });
    const warn = boss.state.warnings.find((w) => w.kind === "stomp")!;
    const warnedX = warn.x;
    // 预警后玩家跑到很远处
    advanceUntil(boss, () => boss.state.shockwaves.some((s) => s.vx === 0), {
      playerAt: () => 840,
      maxSeconds: 3,
    });
    const stomp = boss.state.shockwaves.find((s) => s.vx === 0)!;
    expect(stomp.x + stomp.w / 2).toBeCloseTo(warnedX, 0);
  });
});
