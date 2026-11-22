import type { ActionId } from "../core/types";

type Dir = "left" | "right";

interface DirSource {
  id: string;
  dir: Dir;
  order: number;
}

const KEY_ACTIONS: Record<string, ActionId[]> = {
  KeyA: ["moveLeft"],
  ArrowLeft: ["moveLeft"],
  KeyD: ["moveRight"],
  ArrowRight: ["moveRight"],
  Space: ["jump", "confirm", "skip"],
  KeyW: ["jump"],
  ArrowUp: ["jump"],
  KeyZ: ["jump"],
  KeyK: ["jump"],
  KeyE: ["interact"],
  KeyF: ["interact"],
  Enter: ["interact", "confirm", "skip"],
  KeyJ: ["shoot"],
  KeyX: ["shoot"],
  Escape: ["pause", "skip"],
  KeyP: ["pause"],
};

const MOVE_KEYS: Record<string, Dir> = {
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
};

export function actionsForCode(code: string): ActionId[] {
  return KEY_ACTIONS[code] ?? [];
}

export function directionForCode(code: string): "left" | "right" | null {
  return MOVE_KEYS[code] ?? null;
}

const GAME_KEY_CODES = new Set([
  ...Object.keys(KEY_ACTIONS),
  "KeyR",
  "Tab",
  "ArrowDown",
]);

/** 键盘 / 鼠标 / 触控 → 8 个抽象 action（docs/50 §5 / docs/41 §5.7）。 */
export class InputSystem {
  private heldSet = new Set<ActionId>();
  private pressedSet = new Set<ActionId>();
  private dirSources: DirSource[] = [];
  private order = 0;
  private keyboardCodes = new Set<string>();
  private pointerActions = new Map<number, ActionId>();
  private pointerDirs = new Map<number, Dir>();
  private buttonHolds = new Map<string, ActionId>();
  private mouseShooting = false;
  private bound = false;
  private shortcutHandlers = new Set<(code: string) => void>();

  held(action: ActionId): boolean {
    return this.heldSet.has(action);
  }

  pressed(action: ActionId): boolean {
    return this.pressedSet.has(action);
  }

  consumePressed(action: ActionId): boolean {
    if (!this.pressedSet.has(action)) return false;
    this.pressedSet.delete(action);
    return true;
  }

  clearPressed(): void {
    this.pressedSet.clear();
  }

  axis(): number {
    const last = this.dirSources[this.dirSources.length - 1];
    if (!last) return 0;
    return last.dir === "left" ? -1 : 1;
  }

  /** 每帧开始：held 保留；pressed 在帧末由 endFrame 清理。 */
  update(_dt: number): void {
    // 不在这里清理 pressed：键盘/触控事件可能在本帧 update 之后才到达，
    // 过早清空会让 UI（对话/过场跳过）丢一次按键。清理统一放帧末。
  }

  /** 兼容 50 §2.3 的每帧顺序；目前边沿在 update 清理。 */
  endFrame(): void {
    this.pressedSet.clear();
  }

  get lastDir(): Dir | null {
    return this.dirSources[this.dirSources.length - 1]?.dir ?? null;
  }

  onShortcut(handler: (code: string) => void): () => void {
    this.shortcutHandlers.add(handler);
    return () => this.shortcutHandlers.delete(handler);
  }

  bind(): void {
    if (this.bound || typeof window === "undefined") return;
    this.bound = true;
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp, { passive: false });
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("contextmenu", this.onContextMenu);
  }

  unbind(): void {
    if (!this.bound || typeof window === "undefined") return;
    this.bound = false;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("contextmenu", this.onContextMenu);
    this.clearAll();
  }

  bindDirectionButton(el: HTMLElement, dir: Dir): () => void {
    const pointerIds = new Set<number>();
    const down = (ev: PointerEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      pointerIds.add(ev.pointerId);
      this.pointerDirs.set(ev.pointerId, dir);
      this.recomputeDirection();
      this.trySetPointerCapture(el, ev.pointerId);
      el.classList.add("held");
    };
    const up = (ev: PointerEvent) => {
      pointerIds.delete(ev.pointerId);
      this.pointerDirs.delete(ev.pointerId);
      this.recomputeDirection();
      if (pointerIds.size === 0) el.classList.remove("held");
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("lostpointercapture", up);
    };
  }

  bindActionButton(el: HTMLElement, action: ActionId): () => void {
    const down = (ev: PointerEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      this.pointerActions.set(ev.pointerId, action);
      this.heldSet.add(action);
      this.pressedSet.add(action);
      this.buttonHolds.set(ev.pointerId.toString(), action);
      this.trySetPointerCapture(el, ev.pointerId);
      el.classList.add("held");
    };
    const up = (ev: PointerEvent) => {
      const prev = this.pointerActions.get(ev.pointerId);
      this.pointerActions.delete(ev.pointerId);
      this.buttonHolds.delete(ev.pointerId.toString());
      if (prev) {
        this.recomputeHeld();
        el.classList.remove("held");
      }
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("lostpointercapture", up);
    };
  }

  clearAll(): void {
    this.heldSet.clear();
    this.pressedSet.clear();
    this.dirSources = [];
    this.keyboardCodes.clear();
    this.pointerActions.clear();
    this.pointerDirs.clear();
    this.buttonHolds.clear();
    this.mouseShooting = false;
  }

  private recomputeDirection(): void {
    this.dirSources = this.dirSources.filter((s) => s.id.startsWith("kbd:"));
    let i = 0;
    for (const [pointerId, dir] of this.pointerDirs) {
      this.dirSources.push({ id: `ptr:${pointerId}`, dir, order: this.order + i++ });
    }
    this.order += i;
    this.recomputeHeld();
  }

  private recomputeHeld(): void {
    for (const action of ["moveLeft", "moveRight", "jump", "interact", "shoot"] as ActionId[]) {
      this.heldSet.delete(action);
    }
    // 键盘方向
    const dir = this.dirSources[this.dirSources.length - 1]?.dir;
    if (dir === "left") this.heldSet.add("moveLeft");
    if (dir === "right") this.heldSet.add("moveRight");
    // 键盘动作
    for (const code of this.keyboardCodes) {
      for (const action of KEY_ACTIONS[code] ?? []) this.heldSet.add(action);
    }
    // 触控动作
    for (const action of this.pointerActions.values()) this.heldSet.add(action);
    // 鼠标射击
    if (this.mouseShooting) this.heldSet.add("shoot");
  }

  private setKeyboardDir(code: string, pressed: boolean): void {
    const dir = MOVE_KEYS[code];
    if (!dir) return;
    const id = `kbd:${dir}`;
    this.dirSources = this.dirSources.filter((s) => s.id !== id);
    if (pressed) this.dirSources.push({ id, dir, order: this.order++ });
    this.recomputeHeld();
  }

  private onKeyDown = (ev: KeyboardEvent): void => {
    const code = ev.code;
    if (GAME_KEY_CODES.has(code)) {
      // 浏览器滚动/快捷键防误触；F5/F12 等不拦。
      if (code !== "Tab") ev.preventDefault();
    }
    if (code === "Tab") return;
    const actions = KEY_ACTIONS[code];
    if (!actions) {
      if (!ev.repeat && this.shortcutHandlers.size > 0) {
        for (const handler of this.shortcutHandlers) handler(code);
      }
      return;
    }
    if (ev.repeat) {
      // 移动键 repeat 不重复加 action；pressed 只在首次按下。
      return;
    }
    this.keyboardCodes.add(code);
    for (const action of actions) this.pressedSet.add(action);
    this.setKeyboardDir(code, true);
    this.recomputeHeld();
    for (const handler of this.shortcutHandlers) handler(code);
  };

  private onKeyUp = (ev: KeyboardEvent): void => {
    const code = ev.code;
    if (!KEY_ACTIONS[code]) return;
    this.keyboardCodes.delete(code);
    this.setKeyboardDir(code, false);
    this.recomputeHeld();
  };

  private onBlur = (): void => {
    this.clearAll();
  };

  private onVisibility = (): void => {
    if (document.visibilityState === "hidden") this.clearAll();
  };

  private onMouseDown = (ev: MouseEvent): void => {
    if (ev.button !== 0) return;
    const target = ev.target as HTMLElement | null;
    if (target?.closest("button, a, .interactive, [data-ui]")) return;
    this.mouseShooting = true;
    this.heldSet.add("shoot");
    this.pressedSet.add("shoot");
  };

  private onMouseUp = (): void => {
    if (!this.mouseShooting) return;
    this.mouseShooting = false;
    this.recomputeHeld();
  };

  private onContextMenu = (ev: Event): void => {
    ev.preventDefault();
  };

  private trySetPointerCapture(el: HTMLElement, pointerId: number): void {
    try {
      el.setPointerCapture(pointerId);
    } catch {
      /* ignore */
    }
  }
}
