import { BALANCE } from "../config/balance";
import { LAYOUT } from "../config/layout";
import type { BossDef, LaserPatternDef } from "../content/types";
import type { Rect, Vec } from "../core/types";
import { segmentRectEntryT } from "./geom";

/** 一条「目光」：从瞳孔射出的扇形视线（判定按扇形，渲染用采样射线）。 */
export interface GazeBeam {
  /** 瞳孔位置（扇形原点） */
  eye: Vec;
  /** 扇形中心单位方向 */
  dir: Vec;
  /** 扇形半角（弧度） */
  halfAngle: number;
  /** 地面瞄点 x（状态机的扫描值；P1 160→800、P2 交叉、P3 玩家 x） */
  aimX: number;
  /** 中心射线被挂牌/地面截断后的终点 */
  end: Vec;
  /** 扇形边界采样点（-halfAngle → +halfAngle，含两端），用于渲染 */
  fan: Vec[];
}

export interface LaserBossState {
  beams: GazeBeam[];
  blink: boolean;
  telegraph: boolean;
  eyeRed: boolean;
  phaseLabel: string;
  /** 本轮哪几只眼在“看”（P1 只右眼，P2/P3 双眼） */
  firingEyes: number[];
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

const FAN_HALF_ANGLE = (BALANCE.level1.gazeFanHalfAngle * Math.PI) / 180;
const FAN_SLICES = Math.max(2, BALANCE.level1.gazeFanSlices);

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
  /** 每只眼的地面瞄点 x（状态机维度；几何在 beams getter 里由它推导） */
  private beamX: number[] = [];
  private active = false;
  private wasActiveBeforeBlink = false;
  private frozen = false;
  /** 商店 60s 不耐烦加速：>1 时整个状态机（含预警/扫射/眨眼）按比例加快。 */
  private haste = 1;
  private impatient = false;

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
      firingEyes: this.firingEyes,
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
      firingEyes: this.firingEyes,
      haste: this.haste,
      impatient: this.impatient,
    };
  }

  /** 本轮出束的眼睛下标：P1 单眼横扫只右眼；P2 交叉 / P3 锁定双眼。 */
  get firingEyes(): number[] {
    if (this.eyes.length === 0) return [];
    if (this.pattern.kind === "sweep") return [this.eyes.length - 1];
    return this.eyes.map((_, i) => i);
  }

  get beams(): GazeBeam[] {
    return this.firingEyes.map((i) => this.makeBeam(this.eyes[i]!, this.beamX[i] ?? LAYOUT.cameraX));
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
    this.haste = 1;
    this.impatient = false;
    this.beginIdle();
  }

  pause(): void {
    this.frozen = true;
  }

  resume(): void {
    this.frozen = false;
  }

  /**
   * 商店 60s 未购买：笑长不耐烦，攻击轮每轮加速 10%（docs/20 L1-10），
   * 下限 `shopImpatientMinPeriod`（2.4s）。由 app 在礼堂每帧按商店状态设置。
   */
  setImpatient(active: boolean): void {
    if (!active) {
      if (this.impatient) {
        this.impatient = false;
        this.haste = 1;
      }
      return;
    }
    if (this.impatient) return;
    this.impatient = true;
    // 当前轮不打断，从下一轮开始提速；第一轮先记一次 10%（见 startTelegraph）。
  }

  /** 基础攻击轮 ≈ idle + 预警 + 扫射 + 收束（docs/20：3.6~4.08s，取 balance 的 4.0s 基准）。 */
  private maxHaste(): number {
    const base =
      BALANCE.level1.gazeIdleDuration +
      BALANCE.level1.gazeTelegraphDuration +
      BALANCE.level1.gazeSweepDuration +
      BALANCE.level1.gazeRecoverDuration;
    return Math.max(1, base / Math.max(0.1, BALANCE.level1.shopImpatientMinPeriod));
  }

  update(dt: number, playerX: number): void {
    if (this.frozen) return;
    const step = dt * this.haste;
    this.blinkClock += step;
    if (this.blinkRemain > 0) {
      this.blinkRemain = Math.max(0, this.blinkRemain - step);
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

    this.modeTimer -= step;
    if (this.modeTimer > 0) {
      this.advanceBeams(step, playerX);
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
    if (this.impatient) {
      this.haste = Math.min(this.maxHaste(), this.haste / (1 - BALANCE.level1.shopImpatientAccel));
    }
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
   * 视线推进（docs/20 §2.3）：
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

  /** 双眼反向对扫：左束往右端、右束往左端。 */
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

  /** 从瞳孔到地面瞄点，构造扇形视线 + 被挂牌/地面截断的采样端点。 */
  private makeBeam(eye: Vec, aimX: number): GazeBeam {
    const floorY = LAYOUT.floorTop;
    const dx = aimX - eye.x;
    const dy = floorY - eye.y;
    const len = Math.hypot(dx, dy) || 1;
    const baseX = dx / len;
    const baseY = dy / len;
    const dirAt = (offset: number): Vec => {
      const c = Math.cos(offset);
      const s = Math.sin(offset);
      return { x: baseX * c - baseY * s, y: baseX * s + baseY * c };
    };
    const dir = dirAt(0);
    const fan: Vec[] = [];
    for (let i = 0; i <= FAN_SLICES; i++) {
      const offset = -FAN_HALF_ANGLE + (2 * FAN_HALF_ANGLE * i) / FAN_SLICES;
      fan.push(this.clipRay(eye, dirAt(offset)));
    }
    return {
      eye,
      dir,
      halfAngle: FAN_HALF_ANGLE,
      aimX,
      end: this.clipRay(eye, dir),
      fan,
    };
  }

  /** 射线先撞地面或被挂牌挡住就截断；之后是阴影。 */
  private clipRay(eye: Vec, dir: Vec): Vec {
    const floorY = LAYOUT.floorTop;
    let maxDist: number = BALANCE.level1.gazeBeamLength;
    if (dir.y > 1e-4) {
      const toFloor = (floorY - eye.y) / dir.y;
      if (toFloor > 0) maxDist = Math.min(maxDist, toFloor);
    }
    if (this.plaques.length > 0) {
      const farDist = maxDist;
      const far: Vec = { x: eye.x + dir.x * farDist, y: eye.y + dir.y * farDist };
      for (const plaque of this.plaques) {
        const t = segmentRectEntryT(eye, far, plaque);
        if (t !== null) maxDist = Math.min(maxDist, t * farDist);
      }
    }
    return { x: eye.x + dir.x * maxDist, y: eye.y + dir.y * maxDist };
  }
}
