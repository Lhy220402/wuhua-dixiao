import type { DialogueLine } from "../content/types";
import { button, el, setClass } from "./dom";

export interface DialogueCallbacks {
  onAdvance: () => void;
  onSkip: () => void;
}

/** 底部对话框（docs/40 §5.3）。由 DialogueSystem 驱动逐字与推进。 */
export class DialogueBox {
  private layer: HTMLElement;
  private box: HTMLElement;
  private name: HTMLElement;
  private text: HTMLElement;
  private next: HTMLElement;
  private skip: HTMLButtonElement;
  private callbacks: DialogueCallbacks | null = null;
  private visible = false;
  private longPressTimer: number | null = null;

  constructor(root: HTMLElement) {
    this.layer = el("div", { class: "dialogue-layer hidden" });
    this.name = el("div", { class: "dialogue-name hidden" });
    this.text = el("p", { class: "dialogue-text" });
    this.next = el("span", { class: "dialogue-next hidden", text: "▼ 点击 / 空格" });
    this.skip = button("跳过", "btn-ghost btn-small dialogue-skip", () => this.callbacks?.onSkip());
    this.box = el("div", { class: "dialogue-box", role: "dialog", "aria-modal": "true" }, [
      this.name,
      this.text,
      this.next,
      this.skip,
    ]);
    this.box.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      this.longPressTimer = window.setTimeout(() => {
        this.longPressTimer = null;
        this.callbacks?.onSkip();
      }, 500);
    });
    const up = () => {
      if (this.longPressTimer !== null) {
        window.clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
        this.callbacks?.onAdvance();
      }
    };
    this.box.addEventListener("pointerup", up);
    this.box.addEventListener("pointercancel", () => {
      if (this.longPressTimer !== null) {
        window.clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    });
    this.layer.append(this.box);
    root.append(this.layer);
  }

  open(callbacks: DialogueCallbacks, canSkip: boolean): void {
    this.callbacks = callbacks;
    this.visible = true;
    setClass(this.layer, "hidden", false);
    setClass(this.skip, "hidden", !canSkip);
    setClass(this.next, "hidden", true);
  }

  setLine(line: DialogueLine, visibleText: string, typing: boolean): void {
    if (!this.visible) return;
    const isNarration = !line.speaker || line.style === "narration";
    this.name.textContent = line.speaker;
    setClass(this.name, "hidden", isNarration);
    setClass(this.text, "narration", Boolean(isNarration));
    this.text.textContent = visibleText;
    setClass(this.next, "hidden", typing);
    // 打字光标
    if (typing) {
      const cursor = el("span", { class: "dialogue-cursor" });
      this.text.append(cursor);
    }
  }

  setSkipEnabled(enabled: boolean): void {
    this.skip.disabled = !enabled;
  }

  close(): void {
    this.visible = false;
    setClass(this.layer, "hidden", true);
    this.callbacks = null;
  }

  get isOpen(): boolean {
    return this.visible;
  }
}
