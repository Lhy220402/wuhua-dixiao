import { BALANCE } from "../config/balance";

export interface PurchaseInput {
  coins: number;
  price: number;
  soldOut: boolean;
  purchaseInFlight: boolean;
}

export interface PurchaseResult {
  ok: boolean;
  coins: number;
  reason: "ok" | "insufficient" | "soldOut" | "inFlight";
}

/** 纯逻辑：扣款校验；金币不足/已售罄不扣款（docs/10 §4.3）。 */
export function purchase(input: PurchaseInput): PurchaseResult {
  if (input.soldOut) return { ok: false, coins: input.coins, reason: "soldOut" };
  if (input.purchaseInFlight) return { ok: false, coins: input.coins, reason: "inFlight" };
  if (input.coins < input.price) {
    return { ok: false, coins: input.coins, reason: "insufficient" };
  }
  return { ok: true, coins: input.coins - input.price, reason: "ok" };
}

export function canAfford(coins: number, price: number): boolean {
  return coins >= price;
}

export function insufficientText(coins: number, price: number): string {
  const gap = Math.max(0, price - coins);
  return `金币不够，还差 ${gap} 枚。`;
}

/** 第一次出现商店时若金币不足 10，笑长撒币补到 10（docs/20 §2.4 L1-09）。 */
export function loanToThreshold(
  coins: number,
  threshold: number,
): { coins: number; borrowed: boolean } {
  if (coins >= threshold) return { coins, borrowed: false };
  return { coins: threshold, borrowed: true };
}

export function shopPrice(itemId: string, shop: { items: { itemId: string; price: number }[] }): number {
  return shop.items.find((i) => i.itemId === itemId)?.price ?? BALANCE.level1.shopPrice;
}
