import { BALANCE } from "../config/balance";
import type { DialogueDef, DialogueLine } from "../content/types";

export interface DialogueCallbacks {
  onFinished: (skipped: boolean) => void;
  onLineChanged?: (line: DialogueLine) => void;
}

/** 逐字机 + 三层跳过（docs/30 §2.1 / §4）。 */
export class DialogueRunner {
  private def: DialogueDef | null = null;
  private callbacks: DialogueCallbacks | null = null;
  private lineIndex = 0;
  private visibleChars = 0;
  private charTimer = 0;
  private holdTimer = 0;
  private typing = false;
  private elapsed = 0;
  private canSkip = true;
  private finished = false;

  start(def: DialogueDef, callbacks: DialogueCallbacks, canSkip = true): void {
    this.def = def;
    this.callbacks = callbacks;
    this.lineIndex = 0;
    this.visibleChars = 0;
    this.charTimer = 0;
    this.holdTimer = 0;
    this.typing = true;
    this.elapsed = 0;
    this.canSkip = canSkip;
    this.finished = false;
    this.callbacks.onLineChanged?.(this.currentLine);
  }

  get isOpen(): boolean {
    return this.def !== null && !this.finished;
  }

  get currentLine(): DialogueLine {
    return (
      this.def?.lines[this.lineIndex] ?? {
        speaker: "",
        text: "",
        style: "narration",
      }
    );
  }

  get currentVisibleText(): string {
    const text = this.currentLine.text;
    return text.slice(0, Math.max(0, Math.floor(this.visibleChars)));
  }

  get isTyping(): boolean {
    return this.typing;
  }

  get lineDone(): boolean {
    return !this.typing;
  }

  get skipAllowed(): boolean {
    return this.canSkip && this.elapsed >= BALANCE.dialogue.minShowForSkip;
  }

  update(dt: number): void {
    if (!this.isOpen) return;
    this.elapsed += dt;
    const line = this.currentLine;
    if (this.typing) {
      const cps = line.typeSpeed ?? Math.round(1 / BALANCE.dialogue.charInterval);
      this.charTimer += dt;
      const interval = 1 / Math.max(1, cps);
      while (this.charTimer >= interval && this.visibleChars < line.text.length) {
        this.charTimer -= interval;
        const ch = line.text[Math.floor(this.visibleChars)] ?? "";
        this.visibleChars += 1;
        if ("，。！？；：、…—".includes(ch)) this.charTimer -= BALANCE.dialogue.punctExtra;
      }
      if (this.visibleChars >= line.text.length) {
        this.visibleChars = line.text.length;
        this.typing = false;
        this.holdTimer = 0;
      }
    } else {
      this.holdTimer += dt;
      if (this.holdTimer >= (line.holdMs ?? BALANCE.dialogue.lineHold * 1000) / 1000) {
        this.nextLine();
      }
    }
  }

  /** 点击/空格：打字中补全，已显示则下一句。 */
  advance(): void {
    if (!this.isOpen) return;
    if (this.typing) {
      this.visibleChars = this.currentLine.text.length;
      this.typing = false;
      this.holdTimer = 0;
      return;
    }
    this.nextLine();
  }

  /** 整段跳过；假生 canSkip=false 时只补全当前句。 */
  skip(): void {
    if (!this.isOpen) return;
    if (!this.canSkip) {
      this.advance();
      return;
    }
    this.finish(true);
  }

  forceEnd(): void {
    if (!this.isOpen) return;
    this.finish(true);
  }

  private nextLine(): void {
    if (!this.def) return;
    if (this.lineIndex >= this.def.lines.length - 1) {
      this.finish(false);
      return;
    }
    this.lineIndex += 1;
    this.visibleChars = 0;
    this.charTimer = 0;
    this.holdTimer = 0;
    this.typing = true;
    this.callbacks?.onLineChanged?.(this.currentLine);
  }

  private finish(skipped: boolean): void {
    if (this.finished) return;
    this.finished = true;
    const cb = this.callbacks;
    this.def = null;
    this.callbacks = null;
    cb?.onFinished(skipped);
  }
}
