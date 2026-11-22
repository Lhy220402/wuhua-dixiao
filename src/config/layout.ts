import { BALANCE } from "./balance";

/** 960×540 逻辑坐标与世界布局（docs/50 §2.9 / docs/20 §7.2）。 */
export const LAYOUT = {
  logicalW: BALANCE.view.logicalW,
  logicalH: BALANCE.view.logicalH,
  cameraX: BALANCE.view.logicalW / 2,
  cameraY: BALANCE.view.logicalH / 2,
  floorTop: 512,
  floorH: 28,
  wallW: 16,
  defaultSpawnX: 48,
  roomExitX: 920,
  hudTop: BALANCE.view.hudInset,
  touch: {
    move: 64,
    moveCompact: 56,
    jump: 80,
    jumpCompact: 64,
    shoot: 56,
    shootCompact: 48,
    interact: 56,
    interactCompact: 48,
    pause: 48,
    gap: 12,
    inset: 16,
  },
} as const;

export const Z_INDEX = {
  world: 0,
  hud: 100,
  bubble: 200,
  dialogue: 300,
  sheet: 400,
  modal: 500,
  fail: 600,
  system: 700,
  dev: 900,
} as const;
