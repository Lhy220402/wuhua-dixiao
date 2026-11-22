import { describe, expect, it } from "vitest";
import { loanToThreshold, purchase, insufficientText } from "../systems/shop";

describe("shop", () => {
  it("purchases when enough coins", () => {
    expect(purchase({ coins: 14, price: 10, soldOut: false, purchaseInFlight: false })).toEqual({
      ok: true,
      coins: 4,
      reason: "ok",
    });
  });
  it("rejects insufficient funds without charging", () => {
    expect(purchase({ coins: 9, price: 10, soldOut: false, purchaseInFlight: false })).toEqual({
      ok: false,
      coins: 9,
      reason: "insufficient",
    });
  });
  it("rejects sold out", () => {
    expect(purchase({ coins: 99, price: 10, soldOut: true, purchaseInFlight: false }).reason).toBe("soldOut");
  });
  it("rejects an in-flight purchase", () => {
    expect(purchase({ coins: 99, price: 10, soldOut: false, purchaseInFlight: true }).reason).toBe("inFlight");
  });
  it("loans up to the threshold once", () => {
    expect(loanToThreshold(4, 10)).toEqual({ coins: 10, borrowed: true });
    expect(loanToThreshold(10, 10)).toEqual({ coins: 10, borrowed: false });
  });
  it("formats the shortfall", () => {
    expect(insufficientText(7, 10)).toBe("金币不够，还差 3 枚。");
  });
});
