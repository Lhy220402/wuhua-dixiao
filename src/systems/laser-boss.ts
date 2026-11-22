import { BALANCE } from "../config/balance";
import { LAYOUT } from "../config/layout";
import type { BossDef, LaserPatternDef } from "../content/types";
import type { Rect, Vec } from "../core/types";

export interface LaserBeam {
  eye: Vec;
  x: number;
  top: number;
  bottom: number;
}

export interface LaserBossState {
  beams: LaserBeam[];
  blink: boolean;
  telegraph: boolean;
  eyeRed: boolean;
  phaseLabel: string;
}

/** 数据缺失时的兜底模式（内容层始终提供完整 patterns，这里只保证不崩）。 */
const FALLBACK_PATTERN: LaserPatternDef = {
  id: "p1",
  label: "单眼横扫",
  kind: "sweep",
  startX: BALANCE.level1.p1StartX,
  endX: BALANCE.level1.p1EndX,
  speed: BALANCE.level1.p1Speed,
};

/** 第一关笑长视线激光状态机（docs/20 §2.3 / §4）。 */
export class LaserBoss {
  private def: BossDef;
  private eyes: Vec[];
  private plaques: Rect[];
  private blinkPeriod: number;
  private blinkWindow: number;
  private blinkClock = 0;
  private blinkRemain = 0;
  private mode: "idle" | "telegraph" | "sweep" | "recover" = "idle";
  private modeTimer = 0;
  private round = 0;
  private pattern: LaserPatternDef;
  private beamX: number[] = [];
  private active = false;
  private wasActiveBeforeBlink = false;
  private frozen = false;

  constructor(def: BossDef, eyes: Vec[], plaques: Rect[]) {
    this.def = def;
    this.eyes = eyes;
    this.plaques = plaques;
    this.blinkPeriod = (def.blinkPeriodMs ?? BALANCE.level1.blinkPeriod * 1000) / 1000;
    this.blinkWindow = (def.blinkWindowMs ?? BALANCE.level1.blinkWindow * 1000) / 1000;
    this.pattern = def.patterns?.find((p) => p.id === "p1") ?? FALLBACK_PATTERN;
    this.beamX = eyes.map(() => LAYOUT.cameraX);
    this.beginIdle();
  }

  get state(): LaserBossState {
    return {
      beams: this.active && !this.blink ? this.beams : [],
      blink: this.blink,
      telegraph: this.telegraph,
      eyeRed: this.eyeRed,
      phaseLabel: this.pattern.label,
    };
  }

  get debugInfo(): Record<string, unknown> {
    return {
      mode: this.mode,
      timer: this.modeTimer,
      round: this.round,
      active: this.active,
      blinkRemain: this.blinkRemain,
      blinkClock: this.blinkClock,
      pattern: this.pattern.id,
      beamX: this.beamX,
    };
  }

  get beams(): LaserBeam[] {
    return this.beamX
      .map((x, i) => {
        const eye = this.eyes[i]!;
        return { eye, x, top: eye.y + BALANCE.level1.gazeBeamTopOffset, bottom: this.beamBottom(x, eye.y) };
      })
      .filter((_, i) => this.pattern.kind !== "sweep" || this.eyes.length === 1 || i === this.eyes.length - 1);
  }

  get telegraph(): boolean {
    return this.mode === "telegraph";
  }

  get eyeRed(): boolean {
    return this.mode === "telegraph" || this.mode === "sweep";
  }

  get blink(): boolean {
    return this.blinkRemain > 0;
  }

  reset(): void {
    this.mode = "idle";
    this.modeTimer = BALANCE.level1.gazeIdleDuration;
    this.round = 0;
    this.active = false;
    this.wasActiveBeforeBlink = false;
    this.blinkClock = 0;
    this.blinkRemain = 0;
    this.beamX = this.eyes.map(() => LAYOUT.cameraX);
    this.frozen = false;
    this.beginIdle();
  }

  pause(): void {
    this.frozen = true;
  }

  resume(): void {
    this.frozen = false;
  }

  update(dt: number, playerX: number): void {
    if (this.frozen) return;
    this.blinkClock += dt;
    if (this.blinkRemain > 0) {
      this.blinkRemain = Math.max(0, this.blinkRemain - dt);
      if (this.blinkRemain === 0) this.active = this.wasActiveBeforeBlink;
      return;
    }
    if (this.blinkClock >= this.blinkPeriod) {
      this.blinkClock = 0;
      this.blinkRemain = this.blinkWindow;
      this.wasActiveBeforeBlink = this.active;
      this.active = false;
      return;
    }

    this.modeTimer -= dt;
    if (this.modeTimer > 0) {
      this.advanceBeams(dt, playerX);
      return;
    }

    switch (this.mode) {
      case "idle":
        this.startTelegraph(playerX);
        break;
      case "telegraph":
        this.startSweep();
        break;
      case "sweep":
        this.startRecover();
        break;
      case "recover":
        this.round++;
        this.beginIdle();
        break;
    }
  }

  private beginIdle(): void {
    this.mode = "idle";
    this.modeTimer = BALANCE.level1.gazeIdleDuration;
    this.active = false;
  }

  private startTelegraph(playerX: number): void {
    this.mode = "telegraph";
    this.modeTimer = BALANCE.level1.gazeTelegraphDuration;
    this.active = false;
    const cycle = this.def.attackCycle ?? [...BALANCE.level1.patternCycle];
    const patternId = cycle[this.round % cycle.length] ?? "p1";
    this.pattern = this.def.patterns?.find((p) => p.id === patternId) ?? this.def.patterns?.[0] ?? FALLBACK_PATTERN;
    if (this.pattern.kind === "sweep") {
      const startX = this.pattern.startX ?? BALANCE.level1.p1StartX;
      this.beamX = this.eyes.map(() => startX);
    } else if (this.pattern.kind === "cross") {
      const startX = this.pattern.startX ?? BALANCE.level1.p1StartX;
      const endX = this.pattern.endX ?? BALANCE.level1.p1EndX;
      this.beamX = this.eyes.map((_, i) => (i % 2 === 0 ? startX : endX));
    } else {
      this.beamX = this.eyes.map(() => playerX);
    }
  }

  private startSweep(): void {
    this.mode = "sweep";
    this.active = true;
    if (this.pattern.kind === "lock") {
      this.modeTimer = this.pattern.durationMs ? this.pattern.durationMs / 1000 : BALANCE.level1.p3LockHold;
    } else if (this.pattern.kind === "sweep") {
      // P1：按「行程 / 速度」推导，保证 160→800 扫满（640/340≈1.882s），
      // 否则 balance 的 1.8s 只能扫 612px，终点停在 ~772。
      const startX = this.pattern.startX ?? BALANCE.level1.p1StartX;
      const endX = this.pattern.endX ?? BALANCE.level1.p1EndX;
      const speed = this.pattern.speed ?? BALANCE.level1.p1Speed;
      this.modeTimer = this.pattern.durationMs
        ? this.pattern.durationMs / 1000
        : speed > 0
          ? Math.abs(endX - startX) / speed
          : BALANCE.level1.gazeSweepDuration;
    } else {
      this.modeTimer = BALANCE.level1.gazeSweepDuration;
    }
  }

  private startRecover(): void {
    this.mode = "recover";
    this.modeTimer = BALANCE.level1.gazeRecoverDuration;
    this.active = false;
  }

  /**
   * 光束推进（docs/20 §2.3）：
   * - 预警期没有判定，横扫/交叉停在起始位置（预警线即落点）；只有 P3 锁定在这段时间追踪玩家；
   * - 开火后 P1 匀速横扫、P2 双束反向对扫；P3 已锁定，停在锁定点不再跟人。
   */
  private advanceBeams(dt: number, playerX: number): void {
    if (this.mode === "telegraph") {
      if (this.pattern.kind === "lock") this.trackBeamX(dt, playerX);
      return;
    }
    if (this.mode !== "sweep") return;
    if (this.pattern.kind === "sweep") this.sweepBeamX(dt);
    else if (this.pattern.kind === "cross") this.crossBeamX(dt);
  }

  private sweepBeamX(dt: number): void {
    const startX = this.pattern.startX ?? BALANCE.level1.p1StartX;
    const endX = this.pattern.endX ?? BALANCE.level1.p1EndX;
    const dir = endX >= startX ? 1 : -1;
    const speed = this.pattern.speed ?? BALANCE.level1.p1Speed;
    this.beamX = this.beamX.map((x) => {
      const next = x + dir * speed * dt;
      return dir > 0 ? Math.min(endX, next) : Math.max(endX, next);
    });
  }

  /** 双眼反向对扫：左束往右端、右束往左端（原来两束都朝自己起点，永远不动）。 */
  private crossBeamX(dt: number): void {
    const startX = this.pattern.startX ?? BALANCE.level1.p1StartX;
    const endX = this.pattern.endX ?? BALANCE.level1.p1EndX;
    const speed = this.pattern.speed ?? BALANCE.level1.p2Speed;
    this.beamX = this.beamX.map((x, i) => {
      const target = i % 2 === 0 ? endX : startX;
      return x < target ? Math.min(target, x + speed * dt) : Math.max(target, x - speed * dt);
    });
  }

  private trackBeamX(dt: number, playerX: number): void {
    const speed = this.pattern.speed ?? BALANCE.level1.p3TrackSpeed;
    this.beamX = this.beamX.map((x) => {
      const diff = playerX - x;
      if (Math.abs(diff) <= speed * dt) return playerX;
      return x + Math.sign(diff) * speed * dt;
    });
  }

  private beamBottom(x: number, eyeY: number): number {
    let bottom: number = LAYOUT.floorTop;
    for (const plaque of this.plaques) {
      if (x >= plaque.x && x <= plaque.x + plaque.w) {
        bottom = Math.min(bottom, plaque.y);
      }
    }
    return Math.max(eyeY + BALANCE.level1.gazeBeamTopOffset, bottom);
  }
}
