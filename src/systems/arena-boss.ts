import { BALANCE } from "../config/balance";
import type { AttackDef, BossDef, BossPhaseDef } from "../content/types";
import type { Rect, Vec } from "../core/types";
import { applyBulletDamage, nextAttackId, shouldGiant } from "./boss";

export interface ArenaCallbacks {
  onHurt: (source: string, hp: number, coins: number) => void;
  onBubble: (text: string, durationMs: number) => void;
  onAttack: (id: string) => void;
  onShoeNear: () => void;
}

interface Homing {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  angle: number;
}

interface Chalk {
  x: number;
  y: number;
  vy: number;
}

interface Shockwave {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  giant: boolean;
  hold?: number;
  hit?: boolean;
}

interface Banana {
  x: number;
  y: number;
  life: number;
}

interface Warning {
  kind: "chalk" | "stomp" | "banana" | "shock" | "aim";
  x: number;
  y: number;
  w: number;
  h: number;
  timer: number;
  total: number;
}

export interface ArenaState {
  phase: string;
  mode: string;
  attackId: string;
  telegraph: boolean;
  warnings: readonly Warning[];
  giant: boolean;
  shoeActive: boolean;
  homing: readonly Homing[];
  chalk: readonly Chalk[];
  shockwaves: readonly Shockwave[];
  bananas: readonly Banana[];
}

interface PlayerHistoryPoint {
  x: number;
  y: number;
  t: number;
}

/** 第二关 Boss 六种攻击（docs/21 §2.3 / §4）。 */
export class ArenaBoss {
  private def: BossDef;
  private phase: BossPhaseDef;
  private hp: number;
  private giant = false;
  private mode: "intro" | "idle" | "telegraph" | "active" | "gap" | "giant" = "intro";
  private modeTimer: number = BALANCE.level2.introDuration;
  private currentAttack: AttackDef | null = null;
  private round = 0;
  private lastAttackId = "";
  private spawnTimer = 0;
  private spawned = 0;
  private shoeActive = false;
  private shoeDelay: number = 0;
  private giantA5: number = BALANCE.attacks.a5.interval;
  private giantA6: number = BALANCE.attacks.a6.interval;
  private giantPending: AttackDef | null = null;
  private giantPendingTimer: number = 0;
  private shoeBubbleShown = false;
  private history: PlayerHistoryPoint[] = [];
  private clock = 0;
  private playerHintX = 480;

  private homingArr: Homing[] = [];
  private chalkArr: Chalk[] = [];
  private shockArr: Shockwave[] = [];
  private bananaArr: Banana[] = [];
  private warningArr: Warning[] = [];
  private chalkTargets: number[] = [];
  private bananaTargets: number[] = [];

  private callbacks: ArenaCallbacks | null = null;
  /** 竞技场讲台掩体（来自房间数据，避免硬编码坐标） */
  private desks: readonly Rect[];
  /** A6 踩踏预警时锁定的落点中心（避免“影子在这、脚落在你新位置”） */
  private stompX = 480;

  constructor(def: BossDef, desks: readonly Rect[] = []) {
    this.def = def;
    this.phase = def.phases[0]!;
    this.hp = def.hp;
    this.desks = desks;
  }

  get state(): ArenaState {
    return {
      phase: this.phase.id,
      mode: this.mode,
      attackId: this.currentAttack?.id ?? "",
      telegraph: this.mode === "telegraph",
      warnings: this.warningArr,
      giant: this.giant,
      shoeActive: this.shoeActive,
      homing: this.homingArr,
      chalk: this.chalkArr,
      shockwaves: this.shockArr,
      bananas: this.bananaArr,
    };
  }

  get currentHp(): number {
    return this.hp;
  }

  debugSetHp(hp: number): void {
    this.hp = Math.max(0, Math.min(this.def.hp, hp));
  }

  forceShoeActive(): void {
    this.shoeActive = true;
    this.shoeDelay = 0;
  }

  get isGiant(): boolean {
    return this.giant;
  }

  get isShoeActive(): boolean {
    return this.shoeActive;
  }

  get hurtbox(): Rect {
    return this.def.hitbox ?? {
      x: BALANCE.level2.bossHurtboxX,
      y: BALANCE.level2.bossHurtboxY,
      w: BALANCE.level2.bossHurtboxW,
      h: BALANCE.level2.bossHurtboxH,
    };
  }

  get shoeHitbox(): Rect {
    return this.def.shoeHitbox ?? {
      x: BALANCE.level2.shoeX,
      y: BALANCE.level2.shoeY,
      w: BALANCE.level2.shoeW,
      h: BALANCE.level2.shoeH,
    };
  }

  reset(): void {
    this.phase = this.def.phases[0]!;
    this.hp = this.def.hp;
    this.giant = false;
    this.mode = "intro";
    this.modeTimer = BALANCE.level2.introDuration;
    this.currentAttack = null;
    this.round = 0;
    this.lastAttackId = "";
    this.spawnTimer = 0;
    this.spawned = 0;
    this.shoeActive = false;
    this.shoeDelay = 0;
    this.giantA5 = BALANCE.attacks.a5.interval;
    this.giantA6 = BALANCE.attacks.a6.interval;
    this.giantPending = null;
    this.giantPendingTimer = 0;
    this.shoeBubbleShown = false;
    this.history = [];
    this.clock = 0;
    this.stompX = 480;
    this.homingArr = [];
    this.chalkArr = [];
    this.shockArr = [];
    this.bananaArr = [];
    this.warningArr = [];
    this.chalkTargets = [];
    this.bananaTargets = [];
  }

  /** 阶段 2 重试时直接以巨大化开场，1.0s 后激活鞋。 */
  restoreGiant(): void {
    this.giant = true;
    this.phase = this.def.phases[1]!;
    this.hp = BALANCE.level2.giantThreshold;
    this.mode = "giant";
    this.shoeActive = false;
    this.shoeDelay = BALANCE.level2.shoeActivateDelay;
    this.modeTimer = 0;
  }

  beginGiant(): void {
    this.giant = true;
    this.phase = this.def.phases[1]!;
    this.mode = "giant";
    this.modeTimer = 0;
    this.shoeActive = false;
    this.shoeDelay = BALANCE.level2.shoeActivateDelay;
    this.homingArr = [];
    this.chalkArr = [];
    this.shockArr = [];
    this.bananaArr = [];
    this.warningArr = [];
    this.giantA5 = BALANCE.attacks.a5.interval;
    this.giantA6 = BALANCE.attacks.a6.interval;
  }

  hitByBullet(): { hp: number; scraped: boolean; dropCoin: boolean; triggerGiant: boolean } {
    const res = applyBulletDamage(this.hp, this.giant ? "bullets" : this.phase.invulnerable, this.giant);
    this.hp = res.hp;
    const dropCoin = !res.scraped && Math.floor((this.def.hp - this.hp) / BALANCE.level2.bulletDamage) % BALANCE.economy.bossHitsPerCoin === 0 && this.hp < this.def.hp;
    const triggerGiant = !this.giant && shouldGiant(this.hp);
    return { hp: this.hp, scraped: res.scraped, dropCoin, triggerGiant };
  }

  destroyBananaAt(rect: Rect): boolean {
    for (let i = 0; i < this.bananaArr.length; i++) {
      const b = this.bananaArr[i]!;
      if (
        rect.x < b.x + 28 &&
        rect.x + rect.w > b.x &&
        rect.y < b.y + 14 &&
        rect.y + rect.h > b.y
      ) {
        this.bananaArr.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  update(dt: number, player: Vec, cbs: ArenaCallbacks): void {
    this.callbacks = cbs;
    this.clock += dt;
    this.playerHintX = player.x;
    this.history.push({ x: player.x, y: player.y, t: this.clock });
    while (this.history.length > 0 && this.clock - this.history[0]!.t > 1.5) this.history.shift();

    if (this.shoeDelay > 0) {
      this.shoeDelay = Math.max(0, this.shoeDelay - dt);
      if (this.shoeDelay === 0) this.shoeActive = true;
    }
    if (this.giant && !this.shoeBubbleShown && Math.abs(player.x - (this.shoeHitbox.x + 96)) < BALANCE.level2.bossBubbleNearShoeAt) {
      this.shoeBubbleShown = true;
      cbs.onShoeNear();
    }

    if (this.giant) {
      this.updateGiant(dt, player);
    } else {
      this.updatePhase1(dt, player);
    }
    this.updateProjectiles(dt, player);
    this.updateWarnings(dt);
  }

  private updatePhase1(dt: number, player: Vec): void {
    this.modeTimer -= dt;
    switch (this.mode) {
      case "intro":
        if (this.modeTimer <= 0) {
          this.mode = "idle";
          this.modeTimer = 0.8;
          this.callbacks?.onBubble("听说你带枪了？", 1800);
        }
        break;
      case "idle":
        if (this.modeTimer <= 0) this.startTelegraph();
        break;
      case "telegraph":
        if (this.modeTimer <= 0) this.executeAttack(player);
        break;
      case "active":
        this.spawnTimer -= dt;
        this.tickAttackSpawns(player);
        if (this.modeTimer <= 0 && this.spawned >= this.requiredSpawns()) {
          this.mode = "gap";
          this.modeTimer = BALANCE.level2.attackGap;
        }
        break;
      case "gap":
        if (this.modeTimer <= 0) {
          this.mode = "idle";
          this.modeTimer = 0.2;
        }
        break;
    }
  }

  private startTelegraph(): void {
    const attacks = this.phase.attacks;
    const id = nextAttackId(
      attacks.map((a) => a.id),
      this.lastAttackId,
      this.round + 1,
    );
    this.currentAttack = attacks.find((a) => a.id === id) ?? attacks[0] ?? null;
    this.lastAttackId = this.currentAttack?.id ?? "";
    this.mode = "telegraph";
    this.modeTimer = (this.currentAttack?.telegraphMs ?? 600) / 1000;
    this.spawned = 0;
    this.spawnTimer = 0;
    if (this.currentAttack) this.callbacks?.onAttack(this.currentAttack.id);
    this.warningArr = [];
    if (this.currentAttack?.id === "a2") {
      this.chalkTargets = this.sampleHistory(5);
      this.warningArr = this.chalkTargets.map((x) => ({
        kind: "chalk",
        x,
        y: 512,
        w: 32,
        h: 12,
        timer: this.modeTimer,
        total: this.modeTimer,
      }));
    } else if (this.currentAttack?.id === "a3") {
      this.warningArr.push({
        kind: "shock",
        x: this.hurtbox.x - 10,
        y: 472,
        w: Number(this.currentAttack.params["hitboxW"] ?? 32),
        h: Number(this.currentAttack.params["hitboxH"] ?? 40),
        timer: this.modeTimer,
        total: this.modeTimer,
      });
    } else if (this.currentAttack?.id === "a4") {
      const baseX = Math.max(220, Math.min(560, Math.round(this.playerHintX / 20) * 20));
      this.bananaTargets = [0, 1, 2].map((i) => baseX + i * 120 - 120);
      this.warningArr = this.bananaTargets.map((x) => ({
        kind: "banana",
        x,
        y: 498,
        w: 28,
        h: 14,
        timer: this.modeTimer,
        total: this.modeTimer,
      }));
    } else if (this.currentAttack?.id === "a1") {
      this.warningArr.push({ kind: "aim", x: this.hurtbox.x + 40, y: this.hurtbox.y + 80, w: 18, h: 18, timer: this.modeTimer, total: this.modeTimer });
    }
  }

  private requiredSpawns(): number {
    const id = this.currentAttack?.id;
    if (id === "a1") return 3;
    if (id === "a2") return 5;
    return 1;
  }

  private executeAttack(player: Vec): void {
    const attack = this.currentAttack;
    if (!attack) {
      this.mode = "gap";
      this.modeTimer = BALANCE.level2.attackGap;
      return;
    }
    this.mode = "active";
    this.modeTimer = attack.durationMs / 1000;
    const p = attack.params;
    if (attack.id === "a1") {
      this.spawnHoming(player);
      this.spawned = 1;
      this.spawnTimer = Number(p["interval"] ?? 0.25);
    } else if (attack.id === "a2") {
      this.warningArr = [];
      this.chalkTargets.forEach((x, i) => {
        this.chalkArr.push({ x, y: -30 - i * 70, vy: Number(p["fallSpeed"] ?? 700) });
      });
      this.spawned = 5;
    } else if (attack.id === "a3") {
      this.shockArr.push({
        x: this.hurtbox.x - 10,
        y: 472,
        w: Number(p["hitboxW"] ?? 32),
        h: Number(p["hitboxH"] ?? 40),
        vx: -Number(p["speed"] ?? 380),
        giant: false,
      });
      this.spawned = 1;
    } else if (attack.id === "a4") {
      const spacing = Number(p["spacing"] ?? 120);
      const xs = this.bananaTargets.length > 0
        ? this.bananaTargets
        : [0, 1, 2].map((i) => Math.max(220, Math.min(560, Math.round(player.x / 20) * 20)) + i * spacing - 120);
      for (const x of xs) {
        this.bananaArr.push({ x, y: 498, life: Number(p["lifetime"] ?? 6) });
      }
      this.spawned = 3;
      this.bananaTargets = [];
    }
    this.round++;
  }

  private tickAttackSpawns(player: Vec): void {
    if (this.currentAttack?.id !== "a1" || this.spawned >= 3) return;
    if (this.spawnTimer <= 0) {
      this.spawnHoming(player);
      this.spawned++;
      this.spawnTimer = Number(this.currentAttack.params["interval"] ?? 0.25);
    }
  }

  private spawnHoming(player: Vec): void {
    const sx = this.hurtbox.x + 40;
    const sy = this.hurtbox.y + 80;
    const angle = Math.atan2(player.y - 20 - sy, player.x - sx);
    const speed = Number(this.currentAttack?.params["speed"] ?? 260);
    this.homingArr.push({
      x: sx,
      y: sy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: Number(this.currentAttack?.params["lifetime"] ?? 6),
      angle,
    });
  }

  private updateGiant(dt: number, player: Vec): void {
    // 阶段 2：A5 每 2s、A6 每 3s，错开
    if (this.giantPending) {
      this.giantPendingTimer -= dt;
      if (this.giantPendingTimer <= 0) {
        const attack = this.giantPending;
        this.giantPending = null;
        if (attack.id === "a5") {
          this.shockArr.push({
            x: 896,
            y: 456,
            w: Number(attack.params["hitboxW"] ?? 48),
            h: Number(attack.params["hitboxH"] ?? 56),
            vx: -Number(attack.params["speed"] ?? 420),
            giant: true,
          });
        } else if (attack.id === "a6") {
          this.warningArr = this.warningArr.filter((w) => w.kind !== "stomp");
          this.shockArr.push({
            x: this.stompX - Number(attack.params["hitboxW"] ?? 96) / 2,
            y: 448,
            w: Number(attack.params["hitboxW"] ?? 96),
            h: Number(attack.params["hitboxH"] ?? 64),
            vx: 0,
            giant: true,
            hold: Number(attack.params["hold"] ?? 0.2),
            hit: false,
          });
        }
      }
    } else {
      this.giantA5 -= dt;
      this.giantA6 -= dt;
      if (this.giantA5 <= 0) {
        this.giantA5 = BALANCE.attacks.a5.interval;
        this.giantPending = this.phase.attacks.find((a) => a.id === "a5") ?? null;
        this.giantPendingTimer = (this.giantPending?.telegraphMs ?? 600) / 1000;
        this.warningArr = this.warningArr.filter((w) => w.kind !== "chalk" && w.kind !== "aim");
        this.warningArr.push({ kind: "shock", x: 896, y: 456, w: 48, h: 56, timer: this.giantPendingTimer, total: this.giantPendingTimer });
      } else if (this.giantA6 <= 0) {
        this.giantA6 = BALANCE.attacks.a6.interval;
        this.giantPending = this.phase.attacks.find((a) => a.id === "a6") ?? null;
        this.giantPendingTimer = (this.giantPending?.telegraphMs ?? 800) / 1000;
        // 预警时锁定落点中心：玩家看到阴影后可以离开，踩踏不再追到新位置
        this.stompX = player.x;
        this.warningArr.push({
          kind: "stomp",
          x: this.stompX,
          y: 448,
          w: Number(this.giantPending?.params["hitboxW"] ?? 96),
          h: Number(this.giantPending?.params["hitboxH"] ?? 64),
          timer: this.giantPendingTimer,
          total: this.giantPendingTimer,
        });
        this.callbacks?.onAttack("a6");
      }
    }
  }

  private updateProjectiles(dt: number, player: Vec): void {
    const pr = BALANCE.player;
    const playerRect: Rect = { x: player.x - pr.w / 2, y: player.y - pr.h, w: pr.w, h: pr.h };
    const giantBroken = this.giant;

    // 追踪弹
    for (let i = this.homingArr.length - 1; i >= 0; i--) {
      const h = this.homingArr[i]!;
      const desired = Math.atan2(player.y - 20 - h.y, player.x - h.x);
      const speed = Math.hypot(h.vx, h.vy) || 260;
      let diff = desired - h.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const maxTurn = (Number(this.currentAttack?.params["turnRate"] ?? 120) * Math.PI / 180) * dt;
      h.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
      h.vx = Math.cos(h.angle) * speed;
      h.vy = Math.sin(h.angle) * speed;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.life -= dt;
      const hr: Rect = { x: h.x - 9, y: h.y - 9, w: 18, h: 18 };
      if (!giantBroken && this.desks.some((d) => overlap(hr, d))) {
        this.homingArr.splice(i, 1);
        continue;
      }
      if (overlap(hr, playerRect)) {
        this.homingArr.splice(i, 1);
        this.callbacks?.onHurt("homing", 1, BALANCE.level2.hitCoinCost);
        continue;
      }
      if (h.life <= 0 || h.x < -40 || h.x > 1000 || h.y < -40 || h.y > 580) {
        this.homingArr.splice(i, 1);
      }
    }

    // 粉笔雨
    for (let i = this.chalkArr.length - 1; i >= 0; i--) {
      const c = this.chalkArr[i]!;
      c.y += c.vy * dt;
      const cr: Rect = { x: c.x - 8, y: c.y - 12, w: 16, h: 24 };
      if (overlap(cr, playerRect)) {
        this.chalkArr.splice(i, 1);
        this.callbacks?.onHurt("chalk", 1, BALANCE.level2.hitCoinCost);
        continue;
      }
      if (c.y > 512) this.chalkArr.splice(i, 1);
    }

    // 冲击波
    for (let i = this.shockArr.length - 1; i >= 0; i--) {
      const s = this.shockArr[i]!;
      s.x += s.vx * dt;
      const sr: Rect = { x: s.x, y: s.y, w: s.w, h: s.h };
      if (overlap(sr, playerRect)) {
        if (s.vx !== 0) {
          this.callbacks?.onHurt(s.giant ? "giantWave" : "wave", 1, BALANCE.level2.hitCoinCost);
          s.x = -999;
        } else if (!s.hit) {
          s.hit = true;
          this.callbacks?.onHurt("stomp", 1, BALANCE.level2.hitCoinCost);
        }
      }
      if (s.x < -120) {
        this.shockArr.splice(i, 1);
      } else if (s.vx === 0) {
        s.hold = (s.hold ?? 0.2) - dt;
        if (s.hold <= 0) this.shockArr.splice(i, 1);
      }
    }

    // 香蕉皮
    for (let i = this.bananaArr.length - 1; i >= 0; i--) {
      const b = this.bananaArr[i]!;
      b.life -= dt;
      const br: Rect = { x: b.x, y: b.y, w: 28, h: 14 };
      if (overlap(br, playerRect)) {
        this.callbacks?.onHurt("banana", 0, 0);
      }
      if (b.life <= 0) this.bananaArr.splice(i, 1);
    }
  }

  private updateWarnings(dt: number): void {
    for (let i = this.warningArr.length - 1; i >= 0; i--) {
      const w = this.warningArr[i]!;
      w.timer -= dt;
      if (w.timer <= 0) this.warningArr.splice(i, 1);
    }
  }

  /**
   * A2 粉笔雨落点：docs/21 L2-05 要求“玩家过去 1.5s 内 5 个位置”，
   * 按时间等距采样（旧实现按帧号每 3 帧取一个，5 个点几乎叠在同一列）。
   */
  private sampleHistory(count: number): number[] {
    const points = this.history.length > 0 ? this.history : [{ x: this.playerHintX, y: 512, t: this.clock }];
    const span = BALANCE.attacks.a2.sampleHistory;
    const firstT = this.clock - span;
    const xs: number[] = [];
    for (let i = 0; i < count; i++) {
      const targetT = firstT + (span * i) / Math.max(1, count - 1);
      let best = points[0]!;
      for (const p of points) {
        if (Math.abs(p.t - targetT) < Math.abs(best.t - targetT)) best = p;
      }
      xs.push(Math.max(60, Math.min(900, best.x)));
    }
    return xs;
  }
}

function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
