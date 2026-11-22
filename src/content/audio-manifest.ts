import type { AudioDef } from "./types";

const sfx = (name: string, volume: number, priority = 2): AudioDef => ({
  src: `audio/${name}.ogg`,
  volume,
  loop: false,
  priority,
});

const bgm = (name: string, volume: number): AudioDef => ({
  src: `audio/${name}.ogg`,
  volume,
  loop: true,
  priority: -1,
});

/**
 * 18 个音频逻辑 ID（docs/00 §6 / docs/31 §2.7）。
 * 首版只有 sfx.fail 有文件；其余缺失时静默 + 每个 ID 只 warn 一次。
 */
export const AUDIO_MANIFEST: Record<string, AudioDef> = {
  "sfx.fail": { src: "audio/fail.ogg", volume: 0.9, loop: false, priority: 0 },
  "sfx.jump": sfx("jump", 0.5),
  "sfx.land": sfx("land", 0.5),
  "sfx.coin": sfx("coin", 0.6),
  "sfx.hurt": sfx("hurt", 0.8, 1),
  "sfx.shop": sfx("shop", 0.7),
  "sfx.purchase": sfx("purchase", 0.7, 1),
  "sfx.gunshot": sfx("gunshot", 0.85, 0),
  "sfx.laser": sfx("laser", 0.6, 1),
  "sfx.warning": sfx("warning", 0.8, 1),
  "sfx.dialogue": sfx("dialogue", 0.5),
  "sfx.buff": sfx("buff", 0.7),
  "sfx.phase": sfx("phase", 0.85, 0),
  "bgm.title": bgm("title", 0.5),
  "bgm.level1": bgm("level1", 0.45),
  "bgm.boss1": bgm("boss1", 0.55),
  "bgm.level2": bgm("level2", 0.45),
  "bgm.boss2": bgm("boss2", 0.55),
};
