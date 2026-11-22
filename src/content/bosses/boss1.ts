import { BALANCE } from "../../config/balance";
import type { BossDef } from "../types";

/** 第一关 Boss · 笑长（docs/20 §2.3）。不可被玩家伤害，仅剧情击杀。 */
export const XIAOCHANG: BossDef = {
  id: "xiaochang",
  name: "笑长",
  hp: BALANCE.level1.boss1Hp,
  behavior: "laserGaze",
  art: "art/boss1",
  defeatMethod: "npc",
  phases: [
    {
      id: "watch",
      hpMin: 0,
      hpMax: BALANCE.level1.boss1Hp,
      invulnerable: "all",
      victory: "defeat",
      attacks: [],
    },
  ],
  eyes: [
    { x: BALANCE.level1.boss1EyeLeftX, y: BALANCE.level1.boss1EyeY },
    { x: BALANCE.level1.boss1EyeRightX, y: BALANCE.level1.boss1EyeY },
  ],
  patterns: [
    {
      id: "p1",
      label: "单眼横扫",
      kind: "sweep",
      startX: BALANCE.level1.p1StartX,
      endX: BALANCE.level1.p1EndX,
      speed: BALANCE.level1.p1Speed,
    },
    {
      id: "p2",
      label: "双眼交叉",
      kind: "cross",
      speed: BALANCE.level1.p2Speed,
    },
    {
      id: "p3",
      label: "凝视锁定",
      kind: "lock",
      speed: BALANCE.level1.p3TrackSpeed,
    },
  ],
  attackCycle: [...BALANCE.level1.patternCycle],
  blinkPeriodMs: BALANCE.level1.blinkPeriod * 1000,
  blinkWindowMs: BALANCE.level1.blinkWindow * 1000,
};
