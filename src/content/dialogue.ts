import type { DialogueDef } from "./types";

/** 逐字台词（docs/30 §5；固定文案不得改写）。 */
export const DIALOGUE: Record<string, DialogueDef> = {
  laowu_main: {
    id: "laowu_main",
    canSkip: true,
    lines: [
      { speaker: "老吴", text: "纱魔罗托——", style: "shout", typeSpeed: 4 },
      { speaker: "老吴", text: "好听不？", style: "speech" },
      { speaker: "老吴", text: "你听我的歌，笑长那眼睛就钝一半。", style: "speech" },
      { speaker: "老吴", text: "去吧。别在他视线里站太久。", style: "speech" },
    ],
  },
  laowu_short: {
    id: "laowu_short",
    lines: [{ speaker: "老吴", text: "纱魔罗托——", style: "shout" }],
  },
  laowu_cooldown: {
    id: "laowu_cooldown",
    lines: [{ speaker: "老吴", text: "嗓子歇会儿。", style: "speech" }],
  },
  shijun_main: {
    id: "shijun_main",
    canSkip: true,
    lines: [
      {
        speaker: "食菌",
        text: "非洲怎么可能有香蕉呢…",
        style: "speech",
        typeSpeed: 16,
      },
      { speaker: "", text: "他盯着你手里的香蕉，眼神很复杂。", style: "narration" },
      { speaker: "食菌", text: "拿着，别问。", style: "speech" },
    ],
  },
  shijun_repeat: {
    id: "shijun_repeat",
    lines: [{ speaker: "食菌", text: "你吃了吧。", style: "speech" }],
  },
  jiasheng_main: {
    id: "jiasheng_main",
    canSkip: false,
    lines: [
      { speaker: "假生", text: "都这个点了还没死呢", style: "speech" },
      { speaker: "", text: "他慢慢抬起手。", style: "narration" },
      { speaker: "", text: "你掉血了。", style: "narration" },
    ],
  },
  jiasheng_repeat: {
    id: "jiasheng_repeat",
    canSkip: true,
    lines: [{ speaker: "假生", text: "还没死呢，挺好。", style: "speech" }],
  },
  jiasheng_floor: {
    id: "jiasheng_floor",
    canSkip: true,
    lines: [{ speaker: "假生", text: "……算了。", style: "whisper" }],
  },
  /** 小明：数据层台词必须为空（docs/30 §2.3）。 */
  xiaoming_air: {
    id: "xiaoming_air",
    canSkip: false,
    lines: [],
  },
};
