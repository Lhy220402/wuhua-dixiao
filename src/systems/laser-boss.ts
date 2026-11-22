import { BALANCE } from "../config/balance";
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
    this.blinkPeriod = (def.blinkPeriodMs ?? 4000) / 1000;
    this.blinkWindow = (def.blinkWindowMs ?? 1200) / 1000;
    this.pattern = def.patterns?.find((p) => p.id === "p1") ?? {
      id: "p1",
      label: "单眼横扫",
      kind: "sweep",
      startX: 160,
      endX: 800,
      speed: 340,
    };
    this.beamX = eyes.map(() => 480);
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
        return { eye, x, top: eye.y + 8, bottom: this.beamBottom(x, eye.y) };
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
    this.modeTimer = 0.4;
    this.round = 0;
    this.active = false;
    this.wasActiveBeforeBlink = false;
    this.blinkClock = 0;
    this.blinkRemain = 0;
    this.beamX = this.eyes.map(() => 480);
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
      if (this.mode === "sweep" || this.mode === "telegraph") this.updateBeamX(dt, playerX);
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
    this.modeTimer = 0.4;
    this.active = false;
  }

  private startTelegraph(playerX: number): void {
    this.mode = "telegraph";
    this.modeTimer = BALANCE.level1.gazeTelegraphDuration;
    this.active = false;
    const cycle = this.def.attackCycle ?? ["p1", "p1", "p2", "p3"];
    const patternId = cycle[this.round % cycle.length] ?? "p1";
    this.pattern =
      this.def.patterns?.find((p) => p.id === patternId) ??
      this.def.patterns?.[0] ?? {
        id: "p1",
        label: "单眼横扫",
        kind: "sweep",
        startX: 160,
        endX: 800,
        speed: 340,
      };
    if (this.pattern.kind === "sweep") {
      this.beamX = this.eyes.map(() => this.pattern.startX ?? 160);
    } else if (this.pattern.kind === "cross") {
      this.beamX = this.eyes.map((_, i) =>
        this.eyes.length > 1 && i === 0 ? 160 : 800,
      );
    } else {
      this.beamX = this.eyes.map(() => playerX);
    }
  }

  private startSweep(): void {
    this.mode = "sweep";
    this.active = true;
    if (this.pattern.kind === "lock") {
      this.modeTimer = this.pattern.durationMs ? this.pattern.durationMs / 1000 : BALANCE.level1.p3LockHold;
    } else {
      this.modeTimer = BALANCE.level1.gazeSweepDuration;
    }
  }

  private startRecover(): void {
    this.mode = "recover";
    this.modeTimer = BALANCE.level1.gazeRecoverDuration;
    this.active = false;
  }

  private updateBeamX(dt: number, playerX: number): void {
    if (this.pattern.kind === "sweep") {
      const start = this.pattern.startX ?? 160;
      const end = this.pattern.endX ?? 800;
      const dir = end >= start ? 1 : -1;
      const speed = this.pattern.speed ?? 340;
      this.beamX = this.beamX.map((x) => x + dir * speed * dt);
      this.beamX = this.beamX.map((x) => (dir > 0 ? Math.min(end, x) : Math.max(end, x)));
    } else if (this.pattern.kind === "cross") {
      const speed = this.pattern.speed ?? 300;
      this.beamX = this.beamX.map((x, i) => {
        const other = this.eyes.length > 1 ? 1 - i : 0;
        const target = other === 0 ? 800 : 160;
        return x < target ? Math.min(target, x + speed * dt) : Math.max(target, x - speed * dt);
      });
    } else {
      const speed = this.pattern.speed ?? 240;
      this.beamX = this.beamX.map((x) => {
        const diff = playerX - x;
        if (Math.abs(diff) <= speed * dt) return playerX;
        return x + Math.sign(diff) * speed * dt;
      });
    }
  }

  private beamBottom(x: number, eyeY: number): number {
    let bottom = 512;
    for (const plaque of this.plaques) {
      if (x >= plaque.x && x <= plaque.x + plaque.w) {
        bottom = Math.min(bottom, plaque.y);
      }
    }
    return Math.max(eyeY + 8, bottom);
  }
}
