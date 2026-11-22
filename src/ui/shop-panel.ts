import type { ItemDef, ShopDef } from "../content/types";
import { button, el, setClass } from "./dom";

export interface ShopCallbacks {
  onBuy: () => void;
  onClose: () => void;
}

/** 商店底部弹层（docs/40 §5.5 / docs/20 §2.4）。打开时世界由 App 冻结。 */
export class ShopPanel {
  private scrim: HTMLElement;
  private sheet: HTMLElement;
  private title: HTMLElement;
  private itemName: HTMLElement;
  private itemSub: HTMLElement;
  private price: HTMLElement;
  private coins: HTMLElement;
  private note: HTMLElement;
  private buyBtn: HTMLButtonElement;
  private closeBtn: HTMLButtonElement;
  private callbacks: ShopCallbacks | null = null;
  private openedAt = 0;
  private priceValue = 0;
  private soldOut = false;

  constructor(root: HTMLElement) {
    this.scrim = el("div", { class: "sheet-scrim hidden" });
    this.sheet = el("div", { class: "shop-sheet hidden", role: "dialog", "aria-modal": "true" });
    this.title = el("h2", { class: "shop-title" });
    this.closeBtn = button("关闭", "btn-ghost btn-small", () => this.callbacks?.onClose(), {
      attrs: { "aria-label": "关闭商店" },
    });
    this.itemName = el("h3");
    this.itemSub = el("p", { class: "sub" });
    this.price = el("p", { class: "shop-price" });
    this.coins = el("p", { class: "shop-price", "aria-live": "polite" });
    this.note = el("p", { class: "shop-note" });
    this.buyBtn = button("购买", "btn-primary", () => {
      if (performance.now() - this.openedAt < 200) return;
      this.callbacks?.onBuy();
    });
    const info = el("div", { class: "shop-info" }, [this.itemName, this.itemSub, this.price]);
    const item = el("div", { class: "shop-item" }, [
      el("div", { class: "shop-icon" }, [el("span", { class: "gun-glyph" })]),
      info,
    ]);
    const head = el("div", { class: "shop-head" }, [this.title, this.closeBtn]);
    const foot = el("div", { class: "shop-foot" }, [this.coins, this.buyBtn]);
    this.sheet.append(head, item, foot, this.note);
    this.scrim.addEventListener("pointerdown", (ev) => {
      if (ev.target === this.scrim) this.callbacks?.onClose();
    });
    root.append(this.scrim, this.sheet);
    this.hide();
  }

  open(shop: ShopDef, item: ItemDef, price: number, coins: number, callbacks: ShopCallbacks): void {
    this.callbacks = callbacks;
    this.openedAt = performance.now();
    this.priceValue = price;
    this.soldOut = false;
    this.title.textContent = shop.title;
    this.itemName.textContent = item.name;
    this.itemSub.textContent = item.subtitle ?? "";
    this.price.textContent = `${price} 金币`;
    this.note.textContent = "";
    this.sheet.classList.remove("hidden");
    this.scrim.classList.remove("hidden");
    this.buyBtn.textContent = "购买";
    this.buyBtn.disabled = false;
    this.updateCoins(coins);
  }

  updateCoins(coins: number): void {
    if (!this.isOpen) return;
    this.coins.textContent = `当前金币 ${coins}`;
    const short = coins < this.priceValue;
    setClass(this.price, "short", short);
    if (this.soldOut) {
      this.buyBtn.disabled = true;
      this.buyBtn.textContent = "已拥有";
      this.note.textContent = "已获得 子弹枪";
      return;
    }
    this.buyBtn.disabled = short;
    this.note.textContent = short ? `金币不足，还差 ${this.priceValue - coins} 金币` : "";
  }

  setBought(): void {
    this.soldOut = true;
    this.buyBtn.disabled = true;
    this.buyBtn.textContent = "已拥有";
    this.note.textContent = "已获得 子弹枪";
  }

  hide(): void {
    this.sheet.classList.add("hidden");
    this.scrim.classList.add("hidden");
    this.callbacks = null;
  }

  close(): void {
    this.hide();
  }

  get isOpen(): boolean {
    return !this.sheet.classList.contains("hidden");
  }
}
