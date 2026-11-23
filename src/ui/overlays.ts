import type { LevelDef } from "../content/types";
import type { SaveSettings } from "../save/schema";
import { BALANCE } from "../config/balance";
import { formatTime } from "../core/types";
import { button, el, setClass } from "./dom";

export interface TitleCallbacks {
  onStart: () => void;
  onContinue: () => void;
  onSettings: () => void;
}

export interface PauseCallbacks {
  onResume: () => void;
  onRetryRoom: () => void;
  onSettings: () => void;
  onTitle: () => void;
}

export interface FailCallbacks {
  onRetry: () => void;
  onTitle: () => void;
}

export interface ClearCallbacks {
  onContinue: () => void;
  onTitle: () => void;
}

export interface TbcCallbacks {
  onTitle: () => void;
}

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

/** 所有 DOM 弹层 / 标题 / 失败 / 结算 / 未完待续 / Toast / 世界气泡。 */
export class Overlays {
  private root: HTMLElement;
  private title: HTMLElement | null = null;
  private intro: HTMLElement | null = null;
  private pause: HTMLElement | null = null;
  private fail: HTMLElement | null = null;
  private failRaf: number | null = null;
  private clear: HTMLElement | null = null;
  private tbc: HTMLElement | null = null;
  private settings: HTMLElement | null = null;
  private confirmModal: HTMLElement | null = null;
  private toastLayer: HTMLElement;
  private worldLayer: HTMLElement;
  private worldBubble: HTMLElement | null = null;
  private flashLayer: HTMLElement;
  private vignette: HTMLElement;
  private scale = 1;
  private worldLeft = 0;
  private worldTop = 0;
  private bubbleTimer: number | null = null;
  private cutsceneSkip: HTMLElement | null = null;

  constructor(root: HTMLElement, canvas: HTMLCanvasElement) {
    this.root = root;
    this.toastLayer = el("div", { class: "toast-layer" });
    this.worldLayer = el("div", {
      class: "world-layer",
      style:
        "position:absolute;left:0;top:0;width:960px;height:540px;transform-origin:top left;pointer-events:none;z-index:200;",
    });
    this.flashLayer = el("div", { class: "flash-layer" });
    this.vignette = el("div", { class: "vignette" });
    root.append(this.worldLayer, this.vignette, this.flashLayer, this.toastLayer);
    this.updateWorldRect(canvas);
  }

  updateWorldRect(canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / 960;
    this.scale = scale;
    this.worldLeft = rect.left;
    this.worldTop = rect.top;
    this.worldLayer.style.left = `${rect.left}px`;
    this.worldLayer.style.top = `${rect.top}px`;
    this.worldLayer.style.transform = `scale(${scale})`;
    this.worldLayer.style.width = "960px";
    this.worldLayer.style.height = "540px";
  }

  // ---------------- Title ----------------
  showTitle(hasSave: boolean, callbacks: TitleCallbacks): void {
    this.hideTitle();
    const start = button("开始", "btn-primary", callbacks.onStart);
    const cont = button("继续", "btn-secondary", callbacks.onContinue, { disabled: !hasSave });
    const settings = button("设置", "btn-secondary", callbacks.onSettings);
    const foot =
      "v0.1 · A/D 移动 · 空格跳 · E 交互 · J 射击 · Esc 暂停";
    const screen = el("div", { class: "screen screen-title" }, [
      el("div", { class: "title-wrap" }, [
        el("div", { class: "title-deco" }),
        el("h1", { class: "title-main", text: "物化帝笑传" }),
        el("p", { class: "title-sub", text: "物化帝 · 校园篇" }),
        el("div", { class: "title-actions" }, [start, cont, settings]),
        el("p", { class: "title-foot", text: foot }),
      ]),
    ]);
    this.root.append(screen);
    this.title = screen;
    start.focus({ preventScroll: true });
  }

  hideTitle(): void {
    this.title?.remove();
    this.title = null;
  }

  // ---------------- Level Intro ----------------
  showIntro(level: LevelDef, onSkip: () => void): void {
    this.hideIntro();
    const screen = el("div", { class: "screen intro-screen" }, [
      el("div", { class: "intro-inner" }, [
        el("div", { class: "intro-kicker", text: "LEVEL " + (level.id === "level2" ? "2" : "1") }),
        el("h1", { class: "intro-title", text: level.intro.title }),
        el("p", { class: "intro-hint", text: level.intro.hint }),
        el("p", { class: "intro-skip", text: "点击 / 任意键跳过" }),
      ]),
    ]);
    screen.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      onSkip();
    });
    this.root.append(screen);
    this.intro = screen;
  }

  hideIntro(): void {
    this.intro?.remove();
    this.intro = null;
  }

  // ---------------- Pause ----------------
  showPause(run: { levelId: string; coins: number; deaths: number }, callbacks: PauseCallbacks): void {
    this.hidePause();
    const retry = button("重试本房间", "btn-secondary", callbacks.onRetryRoom);
    const title = button("返回标题", "btn-danger", callbacks.onTitle);
    const settings = button("设置", "btn-secondary", callbacks.onSettings);
    const cont = button("继续", "btn-primary", callbacks.onResume);
    const card = el("div", { class: "modal-card" }, [
      el("h2", { class: "modal-title", text: "游戏已暂停" }),
      el("p", { class: "modal-sub", text: "世界停止，物化帝先喘口气" }),
      el("div", { class: "modal-stats" }, [
        el("span", { text: `金币 ${run.coins}` }),
        el("span", { text: `死亡 ${run.deaths}` }),
      ]),
      el("div", { class: "modal-actions" }, [cont, settings, retry, title]),
      el("p", { class: "modal-hint", text: "Esc 继续 · R 重试本房间" }),
    ]);
    const modal = el("div", { class: "modal-scrim" }, [card]);
    this.root.append(modal);
    this.pause = modal;
    cont.focus({ preventScroll: true });
  }

  hidePause(): void {
    this.pause?.remove();
    this.pause = null;
  }

  // ---------------- Fail ----------------
  showFail(
    opts: {
      title?: string;
      reason: string;
      stats: string;
      hint: string;
      levelId: string;
      /** 死亡计数：失败页大数字 + 500ms 计数滚动（减少动效时直接显示终值） */
      deaths?: number;
    },
    callbacks: FailCallbacks,
  ): void {
    this.hideFail();
    const retry = button("重试", "btn-primary", callbacks.onRetry);
    const title = button("返回标题", "btn-secondary", callbacks.onTitle);
    const numEl =
      opts.deaths === undefined
        ? null
        : el("span", { class: "death-big-num", text: String(opts.deaths) });
    const deathBig =
      numEl === null
        ? null
        : el("div", { class: "death-big" }, [
            numEl,
            el("span", { class: "death-big-label", text: "死亡次数" }),
          ]);
    const card = el("div", { class: "modal-card" }, [
      deathBig,
      el("h2", { class: "modal-title danger", text: opts.title ?? "败了" }),
      el("p", { class: "modal-sub", text: opts.reason }),
      el("div", { class: "modal-stats" }, [el("span", { text: opts.stats })]),
      el("p", { class: "modal-sub", text: opts.hint }),
      el("div", { class: "modal-actions" }, [retry, title]),
      el("p", { class: "modal-hint", text: "R / Enter 也可以重试" }),
    ]);
    const modal = el("div", { class: "modal-scrim" }, [card]);
    this.root.append(modal);
    this.fail = modal;
    // 死亡数字滚动：0 → N，配合 CSS 的放大回弹；减少动效/无 rAF 时直接显示终值
    if (numEl !== null && opts.deaths !== undefined && !this.prefersReducedMotion()) {
      const target = opts.deaths;
      const duration = 480;
      const startedAt = performance.now();
      const tick = (now: number): void => {
        if (this.fail !== modal) {
          this.failRaf = null;
          return;
        }
        const u = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - u, 3);
        numEl.textContent = String(Math.round(target * eased));
        if (u < 1) {
          this.failRaf = requestAnimationFrame(tick);
        } else {
          numEl.textContent = String(target);
          this.failRaf = null;
        }
      };
      this.failRaf = requestAnimationFrame(tick);
    }
    retry.focus({ preventScroll: true });
  }

  private prefersReducedMotion(): boolean {
    return (
      document.body.classList.contains("reduce-motion") ||
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
    );
  }

  hideFail(): void {
    if (this.failRaf !== null) {
      cancelAnimationFrame(this.failRaf);
      this.failRaf = null;
    }
    this.fail?.remove();
    this.fail = null;
  }

  // ---------------- Clear ----------------
  showClear(
    opts: {
      title: string;
      timeMs: number;
      coins: number;
      deaths: number;
      memes: number;
      isLastLevel: boolean;
    },
    callbacks: ClearCallbacks,
  ): void {
    this.hideClear();
    const cont = button(opts.isLastLevel ? "继续" : "继续", "btn-primary", callbacks.onContinue);
    const title = button("返回标题", "btn-secondary", callbacks.onTitle);
    const stat = (label: string, value: string) =>
      el("div", { class: "clear-stat" }, [el("b", { text: value }), el("span", { text: label })]);
    const card = el("div", { class: "modal-card" }, [
      el("div", { class: "stamp", text: "通关" }),
      el("h2", { class: "clear-title", text: opts.title }),
      el("div", { class: "clear-stats" }, [
        stat("用时", formatTime(opts.timeMs)),
        stat("金币", String(opts.coins)),
        stat("死亡", String(opts.deaths)),
        stat("梗", `${opts.memes}/${5}`),
      ]),
      el("div", { class: "modal-actions" }, [cont, title]),
    ]);
    const modal = el("div", { class: "modal-scrim" }, [card]);
    this.root.append(modal);
    this.clear = modal;
    cont.focus({ preventScroll: true });
  }

  hideClear(): void {
    this.clear?.remove();
    this.clear = null;
  }

  // ---------------- To be continued ----------------
  showTbc(stats: string, callbacks: TbcCallbacks): void {
    this.hideTbc();
    const back = button("回到标题", "btn-primary", callbacks.onTitle);
    const screen = el("div", { class: "tbc-screen" }, [
      el("div", {}, [
        el("h1", { class: "tbc-title", text: "未完待续" }),
        el("p", { class: "tbc-sub", text: "第二关 · 完" }),
        el("p", { class: "modal-sub", text: stats }),
        el("div", { class: "modal-actions" }, [back]),
        el("p", { class: "modal-hint", text: "物化帝的下一关还在路上。" }),
        el("p", { class: "modal-hint", text: `v0.1` }),
      ]),
    ]);
    this.root.append(screen);
    this.tbc = screen;
    back.focus({ preventScroll: true });
  }

  hideTbc(): void {
    this.tbc?.remove();
    this.tbc = null;
  }

  // ---------------- Settings / Confirm ----------------
  showSettings(settings: SaveSettings, onChange: (next: SaveSettings) => void, onClose: () => void): void {
    this.hideSettings();
    const next: SaveSettings = { ...settings };
    const row = (label: string, control: HTMLElement) =>
      el("label", { class: "settings-row" }, [el("span", { text: label }), control]);
    const slider = (key: "masterVolume" | "musicVolume" | "sfxVolume", label: string) => {
      const input = el("input", {
        type: "range",
        min: "0",
        max: "100",
        step: "1",
        value: String(Math.round(next[key] * 100)),
        class: "settings-range",
      }) as HTMLInputElement;
      const val = el("span", { class: "settings-value", text: `${input.value}` });
      input.addEventListener("input", () => {
        next[key] = Number(input.value) / 100;
        val.textContent = input.value;
        onChange({ ...next });
      });
      return row(label, el("span", { class: "settings-slider" }, [input, val]));
    };
    const reduce = el("input", { type: "checkbox", class: "settings-check" }) as HTMLInputElement;
    reduce.checked = next.reduceMotion;
    reduce.addEventListener("change", () => {
      next.reduceMotion = reduce.checked;
      onChange({ ...next });
    });
    const scheme = el("select", { class: "settings-select" }) as HTMLSelectElement;
    for (const [value, label] of [
      ["auto", "自动"],
      ["keyboard", "键盘"],
      ["touch", "触控"],
    ] as const) {
      const opt = el("option", { value, text: label });
      scheme.append(opt);
    }
    scheme.value = next.controlScheme;
    scheme.addEventListener("change", () => {
      next.controlScheme = scheme.value as SaveSettings["controlScheme"];
      onChange({ ...next });
    });
    const card = el("div", { class: "modal-card" }, [
      el("h2", { class: "modal-title", text: "设置" }),
      slider("masterVolume", "主音量"),
      slider("musicVolume", "音乐"),
      slider("sfxVolume", "音效"),
      row("减少动效", reduce),
      row("控制方案", scheme),
      el("div", { class: "modal-actions" }, [button("返回", "btn-primary", () => {
        this.hideSettings();
        onClose();
      })]),
    ]);
    const modal = el("div", { class: "modal-scrim" }, [card]);
    this.root.append(modal);
    this.settings = modal;
  }

  hideSettings(): void {
    this.settings?.remove();
    this.settings = null;
  }

  confirm(opts: ConfirmOptions): void {
    this.hideConfirm();
    const ok = button(opts.confirmLabel ?? "确定", "btn-danger", () => {
      this.hideConfirm();
      opts.onConfirm();
    });
    const cancel = button(opts.cancelLabel ?? "取消", "btn-secondary", () => {
      this.hideConfirm();
      opts.onCancel?.();
    });
    const card = el("div", { class: "modal-card" }, [
      el("h2", { class: "modal-title", text: opts.title }),
      ...(opts.body ? [el("p", { class: "modal-sub", text: opts.body })] : []),
      el("div", { class: "modal-actions row" }, [cancel, ok]),
    ]);
    const modal = el("div", { class: "modal-scrim" }, [card]);
    this.root.append(modal);
    this.confirmModal = modal;
    cancel.focus({ preventScroll: true });
  }

  hideConfirm(): void {
    this.confirmModal?.remove();
    this.confirmModal = null;
  }

  // ---------------- Toast ----------------
  toast(text: string, tone: "info" | "danger" | "success" = "info", durationMs = 1800): void {
    const node = el("div", { class: `toast ${tone === "info" ? "" : tone}`, text });
    this.toastLayer.append(node);
    window.setTimeout(() => node.remove(), durationMs);
    while (this.toastLayer.children.length > 3) this.toastLayer.firstElementChild?.remove();
  }

  // ---------------- World bubble ----------------
  showWorldBubble(text: string, x: number, y: number, durationMs = 2000): void {
    this.hideWorldBubble();
    const bubble = el("div", { class: "world-bubble", text });
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
    bubble.style.transform = "translate(-50%, -100%)";
    this.worldLayer.append(bubble);
    this.worldBubble = bubble;
    this.bubbleTimer = window.setTimeout(() => this.hideWorldBubble(), durationMs);
  }

  hideWorldBubble(): void {
    if (this.bubbleTimer !== null) {
      window.clearTimeout(this.bubbleTimer);
      this.bubbleTimer = null;
    }
    this.worldBubble?.remove();
    this.worldBubble = null;
  }

  // ---------------- Cutscene skip ----------------
  showCutsceneSkip(onSkip: () => void): void {
    this.hideCutsceneSkip();
    const btn = button("跳过 ▸▸", "btn-secondary btn-small cutscene-skip", onSkip);
    const layer = el("div", { class: "cutscene-skip-layer" }, [btn]);
    layer.addEventListener("pointerdown", (ev) => {
      if (ev.target === layer) onSkip();
    });
    this.root.append(layer);
    this.cutsceneSkip = layer;
  }

  hideCutsceneSkip(): void {
    this.cutsceneSkip?.remove();
    this.cutsceneSkip = null;
  }

  // ---------------- Flash / vignette ----------------
  flash(color: "red" | "white", alpha = 0.3, durationMs = 120): void {
    this.flashLayer.classList.toggle("white", color === "white");
    this.flashLayer.style.background = color === "white" ? "#fff" : "";
    this.flashLayer.style.opacity = String(alpha);
    window.setTimeout(() => {
      this.flashLayer.style.opacity = "0";
    }, durationMs);
  }

  setVignette(on: boolean): void {
    setClass(this.vignette, "on", on);
  }

  setReduceMotion(on: boolean): void {
    document.body.classList.toggle("reduce-motion", on);
  }

  hideAll(): void {
    this.hideTitle();
    this.hideIntro();
    this.hidePause();
    this.hideFail();
    this.hideClear();
    this.hideTbc();
    this.hideSettings();
    this.hideConfirm();
    this.hideWorldBubble();
    this.hideCutsceneSkip();
  }

  get hasModal(): boolean {
    return Boolean(this.pause || this.fail || this.clear || this.tbc || this.settings || this.confirmModal);
  }

  get worldScale(): number {
    return this.scale;
  }
}
