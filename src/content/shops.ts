import type { ShopDef } from "./types";

export const SHOPS: Record<string, ShopDef> = {
  hall_shop: {
    id: "hall_shop",
    title: "小卖部（快闪）",
    items: [{ itemId: "bullet_gun", price: 10, stock: 1 }],
    purchaseCutscene: "l1_gun_gag",
    soldOutText: "已售罄",
  },
};

export const SHOP_ALIASES: Record<string, string> = {
  小卖部: "hall_shop",
  校长小卖部: "hall_shop",
};
