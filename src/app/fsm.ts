import type { GameState } from "../core/types";

const TRANSITIONS: Record<GameState, readonly GameState[]> = {
  Boot: ["Title"],
  Title: ["LevelIntro"],
  LevelIntro: ["Playing", "Title"],
  Playing: ["Dialogue", "Shop", "Cutscene", "Paused", "Fail", "LevelClear", "Title"],
  Dialogue: ["Playing", "Fail", "Cutscene"],
  Shop: ["Playing", "Cutscene", "Fail", "Paused"],
  Cutscene: ["LevelClear", "Playing", "ToBeContinued", "Fail"],
  Paused: ["Playing", "Title", "Fail"],
  LevelClear: ["LevelIntro", "ToBeContinued", "Title"],
  Fail: ["Playing", "Title"],
  ToBeContinued: ["Title", "LevelIntro"],
};

export type FsmListener = (next: GameState, prev: GameState) => void;

/** 顶层状态机：goState 是唯一入口（docs/50 §4）。 */
export class Fsm {
  private current: GameState = "Boot";
  private listeners = new Set<FsmListener>();
  private overlayStack: GameState[] = [];

  get state(): GameState {
    return this.current;
  }

  canTransition(next: GameState, from: GameState = this.current): boolean {
    return TRANSITIONS[from]?.includes(next) ?? false;
  }

  goState(next: GameState): boolean {
    if (next === this.current) return true;
    if (!this.canTransition(next)) {
      console.warn(`[fsm] illegal transition ${this.current} -> ${next}`);
      return false;
    }
    const prev = this.current;
    this.current = next;
    if (next === "Dialogue" || next === "Shop" || next === "Paused") {
      this.overlayStack.push(prev);
    } else if (prev === "Dialogue" || prev === "Shop" || prev === "Paused") {
      this.overlayStack.pop();
    }
    for (const listener of Array.from(this.listeners)) listener(next, prev);
    return true;
  }

  /** 关闭 overlay 时回到打开它的状态（默认 Playing）。 */
  closeOverlay(fallback: GameState = "Playing"): GameState {
    const target = this.overlayStack[this.overlayStack.length - 1] ?? fallback;
    this.overlayStack.pop();
    const prev = this.current;
    this.current = target;
    for (const listener of Array.from(this.listeners)) listener(target, prev);
    return target;
  }

  peekOverlay(): GameState | undefined {
    return this.overlayStack[this.overlayStack.length - 1];
  }

  isWorldFrozen(): boolean {
    return (
      this.current === "Dialogue" ||
      this.current === "Shop" ||
      this.current === "Paused" ||
      this.current === "Cutscene" ||
      this.current === "LevelIntro" ||
      this.current === "LevelClear" ||
      this.current === "Fail" ||
      this.current === "ToBeContinued" ||
      this.current === "Title"
    );
  }

  onChange(listener: FsmListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset(): void {
    this.current = "Boot";
    this.overlayStack = [];
  }
}
