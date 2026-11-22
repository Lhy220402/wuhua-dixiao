import { BALANCE } from "../config/balance";
import type { ItemDef } from "../content/types";
import type { LevelDef } from "../content/types";
import type { RuntimeState } from "../app/state";
import { coinNode, el, gunGlyph, heartNode, setClass } from "./dom";

export interface HudBossInfo {
  name: string;
  hp: number;
  maxHp: number;
  locked: boolean;
}

/** HUD：DOM 覆盖层（docs/40 §5.2 / docs/50 §2.2.1），事件驱动、不全量重建。 */
export class Hud {
  private root: HTMLElement;
  private hud: HTMLElement;
  private heartsBox: HTMLElement;
  private hpText: HTMLElement;
  private levelText: HTMLElement;
  private roomDots: HTMLElement;
  private exposure: HTMLElement;
  private exposureFill: HTMLElement;
  private exposureLabel: HTMLElement;
  private bossBar: HTMLElement;
  private bossFill: HTMLElement;
  private bossLabel: HTMLElement;
  private coinBox: HTMLElement;
  private coinValue: HTMLElement;
  private itemBox: HTMLElement;
  private buffIcon: HTMLElement | null = null;
  private pauseBtn: HTMLButtonElement;
  private itemCard: HTMLElement | null = null;
  private lastCoins = -1;
  private lastHp = -1;
  private lastMaxHp = -1;
  private lastLevelId = "";
  private lastRoom = -1;
  private lastBossHp = -1;
  private lastBossMax = -1;
  private lastExposurePct = -1;
  private lastBuffText = "";
  private onPause: () => void;
  private hasGun = false;
  private rootItemLayer: HTMLElement;
  private coinFlashTimer: number | null = null;
  private bumpTimer: number | null = null;

  constructor(root: HTMLElement, onPause: () => void) {
    this.root = root;
    this.onPause = onPause;
    this.rootItemLayer = el("div", { class: "item-card-layer" });
    this.hud = el("div", { class: "hud" });
    this.heartsBox = el("div", { class: "hud-hearts", "aria-label": "生命" });
    this.hpText = el("span", { class: "hud-hp-text" });
    this.levelText = el("span", { class: "hud-level-text" });
    this.roomDots = el("span", { class: "room-dots" });
    this.exposure = el("div", { class: "exposure", role: "progressbar" });
    this.exposureFill = el("div", { class: "exposure-fill" });
    this.exposureLabel = el("div", { class: "exposure-label" });
    this.exposure.append(this.exposureFill);
    this.bossBar = el("div", { class: "boss-bar hidden" });
    this.bossFill = el("div", { class: "boss-bar-fill" });
    this.bossLabel = el("div", { class: "boss-bar-label" });
    const bossTrack = el("div", { class: "boss-bar-track" });
    bossTrack.append(this.bossFill);
    this.bossBar.append(bossTrack, this.bossLabel);
    this.coinBox = el("div", { class: "hud-coins", "aria-live": "polite" });
    this.coinValue = el("span", { class: "coin-value", text: "0" });
    this.coinBox.append(coinNode(), this.coinValue);
    this.itemBox = el("div", { class: "hud-item empty", title: "道具" });
    this.pauseBtn = el("button", {
      class: "hud-pause",
      type: "button",
      "aria-label": "暂停",
      text: "Ⅱ",
    });
    this.pauseBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this.onPause();
    });
    const actions = el("div", { class: "hud-actions" }, [this.itemBox, this.pauseBtn]);
    const left = el("div", { class: "hud-left" }, [
      this.heartsBox,
      this.hpText,
      el("div", { class: "hud-level" }, [this.levelText, this.roomDots]),
    ]);
    const right = el("div", { class: "hud-right" }, [this.coinBox, actions]);
    const center = el("div", { class: "hud-center" }, [this.exposure, this.bossBar, this.exposureLabel]);
    const top = el("div", { class: "hud-top" }, [left, center, right]);
    this.hud.append(top);
    this.hud.classList.add("hidden");
    this.root.append(this.hud, this.rootItemLayer);
  }

  setVisible(visible: boolean): void {
    setClass(this.hud, "hidden", !visible);
    if (!visible) this.hideItemCard();
  }

  update(run: RuntimeState, level: LevelDef): void {
    this.setLevel(level, run.roomIndex);
    this.setCoins(run.coins);
    this.setHearts(run.hp, run.maxHp);
    this.setItem(run.items.includes("bullet_gun"));
    this.setBuff(run.buffs["shamoluotuo"] ?? 0, BALANCE.level1.laowuBuffDuration);
    this.setExposure(run.exposure / BALANCE.level1.exposureThreshold);
  }

  setLevel(level: LevelDef, roomIndex: number): void {
    if (this.lastLevelId !== level.id) {
      this.lastLevelId = level.id;
      this.levelText.textContent = level.id === "level2" ? "第二关 · 决战" : "第一关 · 笑长";
      this.roomDots.replaceChildren();
      for (let i = 0; i < level.rooms.length; i++) {
        const dot = el("span", { text: "●" });
        this.roomDots.append(dot);
      }
      const showHearts = level.id === "level2";
      setClass(this.heartsBox, "hidden", !showHearts);
      setClass(this.hpText, "hidden", !showHearts);
      setClass(this.bossBar, "hidden", level.id !== "level2");
      setClass(this.exposure, "hidden", level.id !== "level1");
    }
    if (this.lastRoom !== roomIndex) {
      this.lastRoom = roomIndex;
      const dots = Array.from(this.roomDots.children) as HTMLElement[];
      dots.forEach((dot, i) => dot.classList.toggle("on", i === roomIndex));
    }
  }

  setCoins(coins: number, delta = 0): void {
    if (this.lastCoins === coins) return;
    const prev = this.lastCoins;
    this.lastCoins = coins;
    this.coinValue.textContent = String(coins);
    if (prev >= 0 && coins !== prev) {
      setClass(this.coinBox, "bump", true);
      if (this.bumpTimer !== null) window.clearTimeout(this.bumpTimer);
      this.bumpTimer = window.setTimeout(() => setClass(this.coinBox, "bump", false), 220);
      if (delta <= -BALANCE.level2.hitCoinCost || coins < prev) {
        setClass(this.coinBox, "flash-red", true);
        if (this.coinFlashTimer !== null) window.clearTimeout(this.coinFlashTimer);
        this.coinFlashTimer = window.setTimeout(() => setClass(this.coinBox, "flash-red", false), 220);
      }
    }
  }

  setHearts(hp: number, maxHp: number): void {
    if (hp === this.lastHp && maxHp === this.lastMaxHp) return;
    const prevHp = this.lastHp;
    this.lastHp = hp;
    this.lastMaxHp = maxHp;
    this.heartsBox.replaceChildren();
    for (let i = 0; i < maxHp; i++) {
      const lost = i >= hp;
      const node = heartNode(lost);
      if (lost && prevHp > hp && i === hp) node.classList.add("hit");
      if (!lost && hp === 1) node.classList.add("beat");
      this.heartsBox.append(node);
    }
    this.hpText.textContent = hp === 1 ? "1/5" : "";
  }

  setExposure(value: number): void {
    const pct = Math.max(0, Math.min(1, value));
    const rounded = Math.round(pct * 100);
    if (rounded === this.lastExposurePct) return;
    this.lastExposurePct = rounded;
    this.exposureFill.style.width = `${pct * 100}%`;
    const warn = pct >= BALANCE.level1.exposureWarnAt;
    setClass(this.exposure, "warn", warn);
    this.exposureLabel.textContent = warn ? `暴露 ${rounded}%` : "";
  }

  setBoss(info: HudBossInfo): void {
    if (info.hp === this.lastBossHp && info.maxHp === this.lastBossMax) return;
    this.lastBossHp = info.hp;
    this.lastBossMax = info.maxHp;
    const pct = Math.max(0, Math.min(1, info.hp / Math.max(1, info.maxHp)));
    this.bossFill.style.width = `${pct * 100}%`;
    setClass(this.bossBar, "locked", info.locked);
    this.bossLabel.textContent = info.locked ? "打不动了" : info.name;
  }

  setItem(hasGun: boolean): void {
    if (this.hasGun === hasGun) return;
    this.hasGun = hasGun;
    setClass(this.itemBox, "empty", !hasGun);
    this.itemBox.replaceChildren();
    this.buffIcon = null;
    this.lastBuffText = "";
    if (hasGun) {
      this.itemBox.append(gunGlyph());
      this.itemBox.title = "子弹枪";
    } else {
      this.itemBox.title = "空";
    }
  }

  setBuff(remainSec: number, totalSec: number): void {
    if (remainSec <= 0) {
      if (this.buffIcon) {
        this.buffIcon.remove();
        this.buffIcon = null;
      }
      return;
    }
    if (!this.buffIcon) {
      this.buffIcon = el("span", { class: "buff-icon", title: "纱魔罗托" });
      this.itemBox.append(this.buffIcon);
    }
    const rounded = Math.ceil(remainSec);
    const text = `♪${rounded}`;
    if (text !== this.lastBuffText) {
      this.lastBuffText = text;
      this.buffIcon.textContent = text;
    }
    setClass(this.buffIcon, "blink", remainSec <= BALANCE.level1.laowuBuffWarnBlink);
    this.buffIcon.title = `纱魔罗托：还剩 ${rounded} 秒`;
  }

  showItemCard(item: ItemDef, durationMs = 2500): void {
    this.hideItemCard();
    const card = el("div", { class: "hud-item-card", role: "status" }, [
      el("h3", { text: item.name }),
      el("div", { class: "sub", text: item.subtitle ?? "" }),
      el("p", { text: item.desc }),
      el("span", { class: "tag", text: "第二关还能用" }),
    ]);
    card.addEventListener("click", () => this.hideItemCard());
    this.rootItemLayer.append(card);
    this.itemCard = card;
    window.setTimeout(() => this.hideItemCard(), durationMs);
  }

  hideItemCard(): void {
    this.itemCard?.remove();
    this.itemCard = null;
  }

  get pauseButton(): HTMLButtonElement {
    return this.pauseBtn;
  }
}
