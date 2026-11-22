import type { ItemDef } from "./types";

export const ITEMS: ItemDef[] = [
  {
    id: "bullet_gun",
    name: "子弹枪",
    subtitle: "潮的馈赠",
    desc: "不知道谁塞给笑长的。枪口朝哪，笑长就朝哪倒。",
    icon: "ui/item/gun",
    stacks: false,
    persistent: true,
    displayName: "子弹枪（潮的馈赠）",
  },
  {
    id: "banana",
    name: "香蕉",
    subtitle: "非洲限定",
    desc: "食菌给的。别问。",
    icon: "art/item/banana",
    stacks: false,
    persistent: true,
  },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((item) => [item.id, item])) as Record<
  string,
  ItemDef
>;
