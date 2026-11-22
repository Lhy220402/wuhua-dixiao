import { BALANCE } from "../config/balance";
import {
  clamp,
  playerRect,
  rectsOverlap,
  type Rect,
} from "../core/types";

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  coyote: number;
  jumpBuffer: number;
  jumpCutPending: boolean;
  jumpTime: number;
  facing: 1 | -1;
  invuln: number;
  frozen: boolean;
  slipTimer: number;
}

export interface PhysicsInput {
  axis: number;
  jumpHeld: boolean;
  jumpPressed: boolean;
  /** 被香蕉皮滑倒时强制水平速度 */
  forcedVx?: number;
}

export interface PlayerStepResult {
  jumped: boolean;
  landed: boolean;
  headbutt: boolean;
  movedX: boolean;
  rect: Rect;
}

export const createPlayerState = (x: number, y: number): PlayerState => ({
  x,
  y,
  vx: 0,
  vy: 0,
  onGround: false,
  coyote: 0,
  jumpBuffer: 0,
  jumpCutPending: false,
  jumpTime: 0,
  facing: 1,
  invuln: 0,
  frozen: false,
  slipTimer: 0,
});

export const playerBodyRect = (p: PlayerState): Rect =>
  playerRect(p.x, p.y, BALANCE.player.w, BALANCE.player.h);

const moveAxis = (
  p: PlayerState,
  solids: readonly Rect[],
  dt: number,
): { movedX: boolean; landed: boolean; headbutt: boolean } => {
  const { w, h } = BALANCE.player;
  let movedX = false;
  let landed = false;
  let headbutt = false;

  // ---- 水平 ----
  if (p.vx !== 0) {
    p.x += p.vx * dt;
    for (let pass = 0; pass < 3; pass++) {
      let resolved = false;
      const body = playerBodyRect(p);
      for (const s of solids) {
        if (!rectsOverlap(body, s)) continue;
        if (p.vx > 0) p.x = s.x - w / 2;
        else if (p.vx < 0) p.x = s.x + s.w + w / 2;
        p.vx = 0;
        resolved = true;
        break;
      }
      if (!resolved) break;
    }
    if (p.x < w / 2) {
      p.x = w / 2;
      p.vx = 0;
    }
    const maxX = BALANCE.view.logicalW - w / 2;
    if (p.x > maxX) {
      p.x = maxX;
      p.vx = 0;
    }
    movedX = true;
  }

  // ---- 垂直 ----
  const wasOnGround = p.onGround;
  p.onGround = false;
  if (p.vy !== 0) {
    p.y += p.vy * dt;
    for (let pass = 0; pass < 3; pass++) {
      let resolved = false;
      const body = playerBodyRect(p);
      for (const s of solids) {
        if (!rectsOverlap(body, s)) continue;
        if (p.vy > 0) {
          p.y = s.y;
          p.vy = 0;
          p.onGround = true;
          landed = true;
        } else if (p.vy < 0) {
          p.y = s.y + s.h + h;
          p.vy = 0;
          headbutt = true;
        }
        resolved = true;
        break;
      }
      if (!resolved) break;
    }
  }

  // 地面探测：脚底往下 1px 的探针
  if (!p.onGround && p.vy >= 0) {
    const probe: Rect = {
      x: p.x - w / 2 + 1,
      y: p.y + 0.5,
      w: w - 2,
      h: 2,
    };
    for (const s of solids) {
      if (rectsOverlap(probe, s) && Math.abs(p.y - s.y) <= 1.5) {
        p.y = s.y;
        p.onGround = true;
        p.vy = 0;
        if (!wasOnGround) landed = true;
        break;
      }
    }
  }

  // 天花板/地面边界兜底
  if (p.y < h) {
    p.y = h;
    if (p.vy < 0) p.vy = 0;
  }
  return { movedX, landed, headbutt };
};

/** 固定步长积分：加速度/摩擦 + 土狼 + 跳跃缓冲 + 短跳（docs/10 §2.1）。 */
export function stepPlayer(
  p: PlayerState,
  input: PhysicsInput,
  solids: readonly Rect[],
  dt: number,
): PlayerStepResult {
  const b = BALANCE.player;
  if (p.frozen) {
    p.vx = 0;
    p.vy = 0;
    return { jumped: false, landed: false, headbutt: false, movedX: false, rect: playerBodyRect(p) };
  }

  // 计时器
  p.coyote = p.onGround ? b.coyote : Math.max(0, p.coyote - dt);
  p.jumpBuffer = input.jumpPressed ? b.jumpBuffer : Math.max(0, p.jumpBuffer - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.slipTimer = Math.max(0, p.slipTimer - dt);

  // 水平
  const axis = clamp(input.axis, -1, 1);
  if (axis !== 0) p.facing = axis > 0 ? 1 : -1;
  if (p.slipTimer > 0 && input.forcedVx !== undefined) {
    p.vx = input.forcedVx;
  } else if (axis !== 0) {
    const target = axis * b.runSpeed;
    const rate = (p.onGround ? b.accel : b.airAccel) * dt;
    p.vx = p.vx < target ? Math.min(p.vx + rate, target) : Math.max(p.vx - rate, target);
  } else {
    const rate = (p.onGround ? b.friction : b.airFriction) * dt;
    if (Math.abs(p.vx) <= rate) p.vx = 0;
    else p.vx -= Math.sign(p.vx) * rate;
  }

  // 起跳
  let jumped = false;
  const canJump = p.onGround || p.coyote > 0;
  if (p.jumpBuffer > 0 && canJump) {
    p.vy = -b.jumpVel;
    p.onGround = false;
    p.coyote = 0;
    p.jumpBuffer = 0;
    p.jumpCutPending = true;
    p.jumpTime = 0;
    jumped = true;
  }
  if (jumped || p.jumpCutPending) p.jumpTime += dt;

  // 短跳：上升期松开跳跃键，只结算一次。
  // jumpCutDelay 内不切，避免触屏轻点（<1 帧）只跳 20~30px。
  if (p.jumpCutPending && !input.jumpHeld && p.vy < 0 && p.jumpTime >= b.jumpCutDelay) {
    p.vy *= b.jumpCut;
    p.jumpCutPending = false;
  }
  if (p.vy >= 0) p.jumpCutPending = false;

  // 重力
  p.vy = Math.min(p.vy + b.gravity * dt, b.maxFall);

  const res = moveAxis(p, solids, dt);
  return { jumped, ...res, rect: playerBodyRect(p) };
}

export function overlapsHazard(body: Rect, hazards: readonly Rect[]): boolean {
  for (const h of hazards) if (rectsOverlap(body, h)) return true;
  return false;
}

export function isFallingOut(p: PlayerState): boolean {
  return p.y > BALANCE.view.logicalH + BALANCE.player.fallDeathPad;
}
