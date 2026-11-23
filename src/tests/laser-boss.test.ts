import { describe, expect, it } from "vitest";
import { BALANCE } from "../config/balance";
import { XIAOCHANG } from "../content/bosses/boss1";
import type { BossDef, LaserPatternDef } from "../content/types";
import { playerRect, type Rect, type Vec } from "../core/types";
import { LaserBoss } from "../systems/laser-boss";
import { exposureFailed, gazeFanHitsPlayer, updateExposure } from "../systems/vision";

/**
 * 笑长视线激光状态机回归测试（docs/20 §2.3 / §4）。
 * 用固定步长直接驱动纯逻辑类，不依赖 WebGL / DOM。
 */

const DT = 1 / 120;

const HALL_EYES: Vec[] = [
  { x: BALANCE.level1.boss1EyeLeftX, y: BALANCE.level1.boss1EyeY },
  { x: BALANCE.level1.boss1EyeRightX, y: BALANCE.level1.boss1EyeY },
];

interface BossOptions {
  eyes?: Vec[];
  plaques?: Rect[];
  patterns?: LaserPatternDef[];
  cycle?: string[];
  blinkPeriodMs?: number;
  blinkWindowMs?: number;
}

function makeBoss(opts: BossOptions = {}): LaserBoss {
  const def: BossDef = {
    ...XIAOCHANG,
    blinkPeriodMs: opts.blinkPeriodMs ?? 1_000_000,
    blinkWindowMs: opts.blinkWindowMs ?? 0,
    patterns: opts.patterns ?? XIAOCHANG.patterns,
    attackCycle: opts.cycle ?? [...BALANCE.level1.patternCycle],
  };
  return new LaserBoss(def, opts.eyes ?? HALL_EYES, opts.plaques ?? []);
}

interface BossInfo {
  mode: string;
  timer: number;
  pattern: string;
  beamX: number[];
}

const info = (boss: LaserBoss): BossInfo => boss.debugInfo as unknown as BossInfo;

function tick(boss: LaserBoss, seconds: number, playerX = 480): void {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) boss.update(DT, playerX);
}

function advanceUntil(
  boss: LaserBoss,
  pred: () => boolean,
  playerX = 480,
  maxSeconds = 40,
): void {
  if (pred()) return;
  const steps = Math.ceil(maxSeconds / DT);
  for (let i = 0; i < steps; i++) {
    boss.update(DT, playerX);
    if (pred()) return;
  }
  throw new Error(`condition not reached: ${JSON.stringify(info(boss))}`);
}

const beamXs = (boss: LaserBoss): number[] => boss.beams.map((b) => Math.round(b.aimX));

describe("LaserBoss P1 单眼横扫", () => {
  it("预警期光束停在起始位置，预警线就是落点；预警期无判定", () => {
    const boss = makeBoss();
    advanceUntil(boss, () => info(boss).mode === "telegraph");
    expect(info(boss).pattern).toBe("p1");
    expect(boss.state.telegraph).toBe(true);
    expect(boss.state.beams).toHaveLength(0);

    tick(boss, BALANCE.level1.gazeTelegraphDuration * 0.9);
    expect(info(boss).mode).toBe("telegraph");
    expect(beamXs(boss)).toEqual([BALANCE.level1.p1StartX]);
  });

  it("开火后从起始位置匀速横扫，而不是提前从预警漂移后的位置开始", () => {
    const boss = makeBoss();
    advanceUntil(boss, () => info(boss).mode === "sweep");
    expect(info(boss).pattern).toBe("p1");
    expect(beamXs(boss)).toEqual([BALANCE.level1.p1StartX]);

    tick(boss, 0.5);
    expect(boss.beams).toHaveLength(1);
    expect(boss.beams[0]!.aimX).toBeCloseTo(
      BALANCE.level1.p1StartX + BALANCE.level1.p1Speed * 0.5,
      0,
    );
  });

  it("扫射时长由 行程/速度 推导（≈1.882s），能覆盖到 x=800", () => {
    const boss = makeBoss();
    advanceUntil(boss, () => info(boss).mode === "sweep");
    let frames = 0;
    while (info(boss).mode === "sweep" && frames < 400) {
      boss.update(DT, 480);
      frames++;
    }
    // 640/340≈1.882s；状态切换那一帧只结算迁移、不推进光束
    expect(frames / 120).toBeCloseTo(
      (BALANCE.level1.p1EndX - BALANCE.level1.p1StartX) / BALANCE.level1.p1Speed,
      1,
    );
    const endX = boss.beams[0]!.aimX;
    expect(endX).toBeGreaterThan(BALANCE.level1.p1EndX - 6);
    expect(endX).toBeLessThanOrEqual(BALANCE.level1.p1EndX);
  });
});

describe("LaserBoss P2 双眼交叉", () => {
  it("两束分别停在 160/800 预警，开火后反向移动并真正交叉", () => {
    const boss = makeBoss();
    advanceUntil(boss, () => info(boss).pattern === "p2" && info(boss).mode === "telegraph");
    tick(boss, BALANCE.level1.gazeTelegraphDuration * 0.5);
    expect(beamXs(boss)).toEqual([BALANCE.level1.p1StartX, BALANCE.level1.p1EndX]);

    advanceUntil(boss, () => info(boss).mode === "sweep");
    expect(beamXs(boss)).toEqual([BALANCE.level1.p1StartX, BALANCE.level1.p1EndX]);

    tick(boss, 1.2);
    const moved = Math.round(BALANCE.level1.p2Speed * 1.2);
    expect(beamXs(boss)).toEqual([
      BALANCE.level1.p1StartX + moved,
      BALANCE.level1.p1EndX - moved,
    ]);
    // 左束已越过右束 → 确实交叉，而不是各走各的
    expect(beamXs(boss)[0]!).toBeGreaterThan(beamXs(boss)[1]!);
  });

  it("单眼房间（R2）的交叉段仍是一束横移光束，不是原地不动", () => {
    const boss = makeBoss({ eyes: [{ x: 224, y: 192 }] });
    advanceUntil(boss, () => info(boss).pattern === "p2" && info(boss).mode === "telegraph");
    expect(boss.beams).toHaveLength(1);
    tick(boss, BALANCE.level1.gazeTelegraphDuration * 0.5);
    expect(beamXs(boss)).toEqual([BALANCE.level1.p1StartX]);

    advanceUntil(boss, () => info(boss).mode === "sweep");
    tick(boss, 1.0);
    expect(boss.beams[0]!.aimX).toBeCloseTo(
      BALANCE.level1.p1StartX + BALANCE.level1.p2Speed * 1.0,
      0,
    );
  });
});

describe("LaserBoss P3 凝视锁定", () => {
  it("预警期按 240px/s 追踪移动中的玩家，锁死后停在锁定点、不再跟人", () => {
    const boss = makeBoss();
    advanceUntil(boss, () => info(boss).pattern === "p3" && info(boss).mode === "telegraph");
    // 预警期把玩家从 480 移到 600：0.5s × 240px/s 后光束应跟到 600
    tick(boss, 0.5, 600);
    expect(beamXs(boss)).toEqual([600, 600]);

    advanceUntil(boss, () => info(boss).mode === "sweep", 600);
    // 锁定后玩家横移：光束必须停在锁定点，否则「锁定」变成无限追踪
    tick(boss, 0.5, 800);
    expect(info(boss).mode).toBe("sweep");
    expect(beamXs(boss)).toEqual([600, 600]);
    expect(boss.state.beams).toHaveLength(2);
  });

  it("锁定后站着不动 2.5s 读条打满，锁定瞬间横移则读条回落", () => {
    const scenario = (dodge: boolean): number => {
      const boss = makeBoss();
      advanceUntil(boss, () => info(boss).pattern === "p3" && info(boss).mode === "telegraph");
      let exposure = { value: 0, warned: false };
      let dodged = false;
      for (let t = 0; t < 3.4; t += DT) {
        const px = dodge && dodged ? 600 : 480;
        boss.update(DT, px);
        const body = playerRect(px, 512, BALANCE.player.w, BALANCE.player.h);
        const visible = boss.state.beams.some((b) =>
          gazeFanHitsPlayer(b.eye, b.dir, b.halfAngle, body, []),
        );
        exposure = updateExposure(DT, visible, exposure);
        if (dodge && !dodged && info(boss).mode === "sweep") dodged = true;
      }
      return exposure.value;
    };

    expect(exposureFailed(scenario(false))).toBe(true);
    expect(exposureFailed(scenario(true))).toBe(false);
  });
});

describe("LaserBoss 眨眼 / 挂牌", () => {
  it("眨眼时光束判定关闭，闭眼结束后恢复可开火状态", () => {
    const boss = makeBoss({
      blinkPeriodMs: BALANCE.level1.blinkPeriod * 1000,
      blinkWindowMs: BALANCE.level1.blinkWindow * 1000,
    });
    advanceUntil(boss, () => boss.state.blink, 480, 6);
    expect(boss.state.beams).toHaveLength(0);

    tick(boss, BALANCE.level1.blinkWindow + 0.1);
    expect(boss.state.blink).toBe(false);
  });

  it("扫射中眨眼：闭眼熄判，睁眼后恢复同一模式的光束判定", () => {
    // 2s 周期让第一次眨眼正好落在第一轮扫射（1.2s~3.0s）里
    const boss = makeBoss({ blinkPeriodMs: 2000, blinkWindowMs: 1200 });
    advanceUntil(boss, () => boss.state.blink, 480, 4);
    expect(info(boss).mode).toBe("sweep");
    expect(boss.state.beams).toHaveLength(0);

    tick(boss, BALANCE.level1.blinkWindow + 0.05);
    expect(boss.state.blink).toBe(false);
    expect(info(boss).mode).toBe("sweep");
    expect(boss.state.beams.length).toBeGreaterThan(0);
  });

  it("扇形视线从瞳孔发出，挂牌把中心射线截断在挂牌顶面（阴影安全）", () => {
    const plaque: Rect = { x: 432, y: 256, w: 96, h: 20 };
    const boss = makeBoss({
      eyes: [{ x: 480, y: 64 }],
      plaques: [plaque],
      patterns: [
        { id: "p1", label: "测试", kind: "sweep", startX: 480, endX: 480, speed: 0 },
      ],
      cycle: ["p1", "p1", "p1", "p1"],
    });
    advanceUntil(boss, () => info(boss).mode === "sweep");
    const beam = boss.beams[0]!;
    expect(beam.eye).toEqual({ x: 480, y: 64 });
    expect(beam.end.y).toBeCloseTo(plaque.y, 0);
    expect(beam.fan).toHaveLength(BALANCE.level1.gazeFanSlices + 1);

    const floorBody = playerRect(480, 512, BALANCE.player.w, BALANCE.player.h);
    expect(gazeFanHitsPlayer(beam.eye, beam.dir, beam.halfAngle, floorBody, [plaque])).toBe(false);
    // 没有挂牌时同位置会被照到
    expect(gazeFanHitsPlayer(beam.eye, beam.dir, beam.halfAngle, floorBody, [])).toBe(true);
    // 站在挂牌顶面（脚底 y=256）仍会被照到
    const onPlaque = playerRect(480, 256, BALANCE.player.w, BALANCE.player.h);
    expect(gazeFanHitsPlayer(beam.eye, beam.dir, beam.halfAngle, onPlaque, [plaque])).toBe(true);
  });
});
