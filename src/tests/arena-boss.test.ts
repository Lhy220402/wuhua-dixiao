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
  it("A1 追踪弹发数由 balance.count 驱动（难度调参后 4 发）", () => {
    const boss = new ArenaBoss(BOSS2, DESKS);
    advanceUntil(boss, () => boss.state.attackId === "a1" && boss.state.mode === "active", {
      playerAt: () => 60,
      maxSeconds: 20,
    });
    let maxHoming = 0;
    for (let t = 0; t < 1.2; t += DT) {
      boss.update(DT, { x: 60, y: 512 }, noop);
      maxHoming = Math.max(maxHoming, boss.state.homing.length);
    }
    expect(maxHoming).toBe(BALANCE.attacks.a1.count);
  });

  it("A2 粉笔雨按玩家过去 1.5s 的位置采样，落点不再叠在一列", () => {
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

describe("ArenaBoss 审计问题回归", () => {
  it("玩家站桩时 A2 的 5 个落点也会铺开，不叠成一列", () => {
    const boss = new ArenaBoss(BOSS2, DESKS);
    advanceUntil(
      boss,
      () => boss.state.attackId === "a2" && boss.state.telegraph,
      { playerAt: () => 480, maxSeconds: 20 },
    );
    const xs = boss.state.warnings.filter((w) => w.kind === "chalk").map((w) => w.x);
    expect(new Set(xs.map((x) => Math.round(x))).size).toBeGreaterThanOrEqual(4);
  });

  it("巨大化 A5/A6 的预警间隔不再被 telegraph 冻结拉长", () => {
    const times = new Map<string, number[]>();
    const cbs: ArenaCallbacks = {
      ...noop,
      onAttack: (id) => {
        if (id === "a5" || id === "a6") {
          const arr = times.get(id) ?? [];
          arr.push(t);
          times.set(id, arr);
        }
      },
    };
    let t = 0;
    const boss = new ArenaBoss(BOSS2, DESKS);
    boss.beginGiant();
    for (let i = 0; i < 10 / DT; i++) {
      t += DT;
      boss.update(DT, { x: 480, y: 512 }, cbs);
    }
    const a5 = times.get("a5") ?? [];
    const a6 = times.get("a6") ?? [];
    expect(a5.length).toBeGreaterThanOrEqual(3);
    expect(a6.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < a5.length; i++) {
      expect(a5[i]! - a5[i - 1]!).toBeGreaterThan(1.7);
      expect(a5[i]! - a5[i - 1]!).toBeLessThan(2.3);
    }
    for (let i = 1; i < a6.length; i++) {
      expect(a6[i]! - a6[i - 1]!).toBeGreaterThan(2.8);
      expect(a6[i]! - a6[i - 1]!).toBeLessThan(3.8);
    }
  });

  it("打到 40 触发巨大化的那一发不额外掉 2500 金币", () => {
    const boss = new ArenaBoss(BOSS2, DESKS);
    boss.debugSetHp(BALANCE.level2.giantThreshold + BALANCE.level2.bulletDamage);
    const res = boss.hitByBullet();
    expect(res.triggerGiant).toBe(true);
    expect(res.dropCoin).toBe(false);
    expect(res.hp).toBe(BALANCE.level2.giantThreshold);
  });

  it("CP2 重试后不再重复弹「别碰我鞋」气泡", () => {
    let bubbleCount = 0;
    const cbs: ArenaCallbacks = {
      ...noop,
      onShoeNear: () => {
        bubbleCount += 1;
      },
    };
    const boss = new ArenaBoss(BOSS2, DESKS);
    boss.restoreGiant();
    for (let i = 0; i < 120; i++) boss.update(DT, { x: 700, y: 512 }, cbs);
    expect(bubbleCount).toBe(0);
  });
});


describe("ArenaBoss 巨型攻击长时间程不变量", () => {
  function simulateGiant(seconds: number, dt: number) {
    const boss = new ArenaBoss(BOSS2, DESKS);
    boss.beginGiant();
    const a5: number[] = [];
    const a6: number[] = [];
    let prev5 = 0;
    let prev6 = 0;
    let t = 0;
    for (let i = 0; i < seconds / dt; i++) {
      t += dt;
      boss.update(dt, { x: 480, y: 512 }, noop);
      const st = boss.state;
      const n5 = st.shockwaves.filter((s) => s.vx !== 0).length;
      const n6 = st.shockwaves.filter((s) => s.vx === 0).length;
      if (n5 > prev5) a5.push(t);
      if (n6 > prev6) a6.push(t);
      prev5 = n5;
      prev6 = n6;
    }
    return { a5, a6 };
  }

  it("60s 内 A5≈2s/A6≈3s，任意两发巨招 spawn 不贴近（>=0.25s）", () => {
    const { a5, a6 } = simulateGiant(60, 1 / 60);
    expect(a5.length).toBeGreaterThanOrEqual(20);
    expect(a6.length).toBeGreaterThanOrEqual(10);
    for (let i = 1; i < a5.length; i++) {
      expect(a5[i]! - a5[i - 1]!).toBeGreaterThan(1.9);
      expect(a5[i]! - a5[i - 1]!).toBeLessThan(2.15);
    }
    for (let i = 1; i < a6.length; i++) {
      expect(a6[i]! - a6[i - 1]!).toBeGreaterThan(2.9);
      expect(a6[i]! - a6[i - 1]!).toBeLessThan(3.6);
    }
    const all = [...a5, ...a6].sort((x, y) => x - y);
    for (let i = 1; i < all.length; i++) {
      expect(all[i]! - all[i - 1]!).toBeGreaterThanOrEqual(0.25);
    }
  });

  it("低帧 50ms 下 20s 内不出现同帧双 spawn", () => {
    const { a5, a6 } = simulateGiant(20, 0.05);
    const all = [...a5, ...a6].sort((x, y) => x - y);
    for (let i = 1; i < all.length; i++) {
      expect(all[i]! - all[i - 1]!).toBeGreaterThanOrEqual(0.12);
    }
  });
});
