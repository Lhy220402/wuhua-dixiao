import { BALANCE } from "../config/balance";
import type { CutsceneDef, CutsceneStep } from "../content/types";

export interface CutsceneCallbacks {
  onStep: (step: CutsceneStep) => void;
  onEnd: (skipped: boolean) => void;
}

/** 数据驱动过场播放器（docs/31 §4.1）。时间轴按真实时间推进。 */
export class CutscenePlayer {
  private def: CutsceneDef | null = null;
  private callbacks: CutsceneCallbacks | null = null;
  private elapsedMs = 0;
  private nextStep = 0;
  private skipping = false;
  private skipCount = 0;
  private finished = true;
  private lastTick = 0;

  start(def: CutsceneDef, callbacks: CutsceneCallbacks): void {
    this.def = def;
    this.callbacks = callbacks;
    this.elapsedMs = 0;
    this.nextStep = 0;
    this.skipping = false;
    this.skipCount = 0;
    this.finished = false;
    this.lastTick = 0;
  }

  get isOpen(): boolean {
    return this.def !== null && !this.finished;
  }

  get id(): string {
    return this.def?.id ?? "";
  }

  get progress(): number {
    if (!this.def) return 0;
    return Math.max(0, Math.min(1, this.elapsedMs / Math.max(1, this.def.totalMs)));
  }

  get elapsed(): number {
    return this.elapsedMs;
  }

  update(dt: number): void {
    if (!this.isOpen || !this.def) return;
    const scale = this.skipping ? BALANCE.cutscene.skipSpeed : 1;
    this.elapsedMs += dt * 1000 * scale;
    const steps = this.def.steps;
    while (this.nextStep < steps.length && this.elapsedMs >= (steps[this.nextStep]?.at ?? 0)) {
      const step = steps[this.nextStep]!;
      this.nextStep += 1;
      this.callbacks?.onStep(step);
    }
    if (this.elapsedMs >= this.def.totalMs) {
      this.finish(this.skipCount > 0);
    }
  }

  /** 0.3s 保护期后第一次加速，再按一次直接跳到收尾。 */
  skip(): void {
    if (!this.isOpen) return;
    if (this.elapsedMs < BALANCE.cutscene.skipGuard * 1000) return;
    this.skipCount += 1;
    if (this.skipCount === 1) {
      this.skipping = true;
    } else if (this.def) {
      this.elapsedMs = Math.max(this.elapsedMs, this.def.totalMs - BALANCE.cutscene.skipTail * 1000);
    }
  }

  forceEnd(): void {
    if (!this.isOpen) return;
    this.finish(true);
  }

  /** 强制关闭且不触发 onEnd（重试/回标题/状态清理用）。 */
  abort(): void {
    this.def = null;
    this.callbacks = null;
    this.finished = true;
    this.elapsedMs = 0;
    this.nextStep = 0;
    this.skipping = false;
    this.skipCount = 0;
  }

  private finish(skipped: boolean): void {
    if (!this.def) return;
    this.finished = true;
    const cb = this.callbacks;
    this.def = null;
    this.callbacks = null;
    cb?.onEnd(skipped);
  }

  get canSkipNow(): boolean {
    return this.isOpen && this.elapsedMs >= BALANCE.cutscene.skipGuard * 1000;
  }

  get isSkipping(): boolean {
    return this.skipping;
  }

  get currentDef(): CutsceneDef | null {
    return this.def;
  }

  get tick(): number {
    return this.lastTick;
  }
}
