import type { KAPLAYCtx } from "kaplay";
import { BALANCE } from "../config/balance";
import { BOSS_BY_ID, CONTENT, LEVEL_BY_ID, NPC_BY_ID, getDialogue, getItem, validateContent } from "../content";
import { ABOUT } from "../content/about";
import type { BossDef, DialogueDef, ItemDef, LevelDef, NpcDef, RoomDef } from "../content/types";
import {
  clamp,
  easeInOutQuad,
  easeOutCubic,
  formatTime,
  lerp,
  playerRect,
  rectsOverlap,
  type GameState,
  type LevelId,
  type Rect,
  type Vec,
} from "../core/types";
import { getPalette } from "../art/palette";
import { drawBoss1, drawBoss2, drawShoe } from "../art/bosses";
import {
  drawBanana,
  drawChalkFall,
  drawGazeFan,
  drawChalkWarning,
  drawFloatText,
  drawGun,
  drawHomingChalk,
  drawMuzzleFlash,
  drawParticles,
  drawPlayerBullet,
  drawShockwave,
  drawStompShadow,
  type Particle,
} from "../art/fx";
import { drawNpc, type NpcArtId } from "../art/npcs";
import { drawPlayer } from "../art/player";
import {
  drawBackdrop,
  drawCheckpoint,
  drawCoin,
  drawDesk,
  drawExitBeacon,
  drawPlatforms,
  drawPlaque,
  drawShopPedestal,
  drawSpikes,
} from "../art/tiles";
import { circle, ellipse, line, poly, rect, text } from "../art/draw";
import { SaveStore } from "../save/storage";
import type { SaveV1 } from "../save/schema";
import { defaultSave } from "../save/schema";
import { AudioManager } from "../systems/audio";
import { ArenaBoss } from "../systems/arena-boss";
import { resolveDamage } from "../systems/combat";
import { CutscenePlayer } from "../systems/cutscene-player";
import { DialogueRunner } from "../systems/dialogue-runner";
import { gameEvents } from "../systems/events";
import { Fsm } from "./fsm";
import {
  addCoins,
  addItem,
  addMeme,
  applyCheckpoint,
  applyRunToSave,
  createRuntime,
  hasItem,
  markSeenCutscene,
  planResume,
  snapshotCheckpoint,
  type RuntimeState,
} from "./state";
import { InputSystem } from "../systems/input";
import { LaserBoss } from "../systems/laser-boss";
import { isFallingOut, overlapsHazard, stepPlayer, type PlayerStepResult } from "../systems/physics";
import { exitAt } from "../systems/room-loader";
import { loanToThreshold, purchase } from "../systems/shop";
import { exposureFailed, gazeFanHitsPlayer, updateExposure } from "../systems/vision";
import { DialogueBox } from "../ui/dialogue-box";
import { Hud } from "../ui/hud";
import { Overlays } from "../ui/overlays";
import { ShopPanel } from "../ui/shop-panel";
import { TouchControls } from "../ui/touch-controls";

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface DropCoin {
  x: number;
  y: number;
  vy: number;
  life: number;
  angle: number;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  color: "gold" | "white" | "red" | "chalk";
  life: number;
  maxLife: number;
}

interface CutsceneVisual {
  chao: boolean;
  chaoX: number;
  bossDead: boolean;
  gunOut: boolean;
  text: string | null;
  /** 过场开始时玩家位置：潮从右侧冲到玩家身边，枪最终抛回这里 */
  playerAnchorX: number;
  chaoFromX: number;
  chaoTargetX: number;
  chaoStart: number;
  chaoMs: number;
  chaoReturnFromX: number;
  chaoReturnToX: number;
  chaoReturnAt: number;
  chaoReturnMs: number;
  shotAt: number;
  shotMs: number;
  shotFrom: Vec;
  shotTo: Vec;
  fallAt: number;
  fallMs: number;
  tossAt: number;
  tossMs: number;
  tossFrom: Vec;
  tossTo: Vec;
}

const CUTSCENE_NONE = -1;

function emptyCutsceneVisual(playerAnchorX = 480): CutsceneVisual {
  return {
    chao: false,
    chaoX: 1010,
    bossDead: false,
    gunOut: false,
    text: null,
    playerAnchorX,
    chaoFromX: 1010,
    chaoTargetX: Math.min(906, playerAnchorX + 52),
    chaoStart: CUTSCENE_NONE,
    chaoMs: 400,
    chaoReturnFromX: 1010,
    chaoReturnToX: 520,
    chaoReturnAt: CUTSCENE_NONE,
    chaoReturnMs: 700,
    shotAt: CUTSCENE_NONE,
    shotMs: 300,
    shotFrom: { x: 0, y: 0 },
    shotTo: { x: 480, y: 120 },
    fallAt: CUTSCENE_NONE,
    fallMs: 1500,
    tossAt: CUTSCENE_NONE,
    tossMs: 500,
    tossFrom: { x: 0, y: 0 },
    tossTo: { x: playerAnchorX, y: 512 - 48 },
  };
}

type SettingsContext = "title" | "pause" | null;

/** 顶层运行时：把 FSM、房间、输入、UI、内容串起来。 */
export class GameApp {
  private k: KAPLAYCtx;
  private canvas: HTMLCanvasElement;
  private root: HTMLElement;
  private fsm = new Fsm();
  private events = gameEvents;
  private saveStore = new SaveStore();
  private save: SaveV1;
  private run: RuntimeState;
  private level: LevelDef;
  private room: RoomDef | null = null;
  private solidRects: Rect[] = [];

  private input = new InputSystem();
  private audio: AudioManager;
  private hud: Hud;
  private overlays: Overlays;
  private shopPanel: ShopPanel;
  private dialogueBox: DialogueBox;
  private touch: TouchControls;
  private dialogueRunner = new DialogueRunner();
  private cutscene = new CutscenePlayer();
  private arenaBoss: ArenaBoss | null = null;
  private laserBoss: LaserBoss | null = null;
  private activeNpc: NpcDef | null = null;
  private activeDialogue: DialogueDef | null = null;
  private activeNpcId: string | null = null;
  private pendingNpcEffect: NpcDef | null = null;

  private fixedAccumulator = 0;
  private clock = 0;
  private introRemaining = 0;
  private pausedByVisibility = false;
  private pausedByOrientation = false;
  private settingsContext: SettingsContext = null;
  private shopState: "idle" | "open" | "purchased" = "idle";
  private shopCooldownUntil = 0;
  private interactCooldownUntil = 0;
  private checkpointToastShown = new Set<string>();
  private initialLoad = true;
  private level2StipendGranted = false;
  /** 第一关买枪过场被刷新打断：进 R4 后补播（避免无枪、无商店、无出口的软锁） */
  private pendingGunCutscene = false;
  private cutsceneVisual: CutsceneVisual = emptyCutsceneVisual();
  private cutscenePost: "none" | "level1-clear" | "level2-clear" | "resume" = "none";
  private xiaomingNextBubble = 0;
  private xiaomingWaveUntil = 0;
  private bullets: Bullet[] = [];
  private dropCoins: DropCoin[] = [];
  private particles: Particle[] = [];
  private floatTexts: FloatText[] = [];
  private shootCooldown = 0;
  private shootCount = 0;
  private scrapCount = 0;
  private lastFrameHp = 0;
  private lastFrameCoins = 0;
  private portraitHint: HTMLElement;
  private rotateFullscreen: HTMLButtonElement | null;
  private rotateContinue: HTMLButtonElement | null;
  private orientationDismissed = false;
  private viewportTimer = 0;

  constructor(k: KAPLAYCtx, canvas: HTMLCanvasElement) {
    this.k = k;
    this.canvas = canvas;
    const root = document.getElementById("ui-root");
    if (!root) throw new Error("#ui-root missing");
    this.root = root;

    const loaded = this.saveStore.load();
    this.save = loaded.save;
    this.level2StipendGranted = Boolean(this.save.progress.npcFlags["l2_stipend"]);
    this.run = createRuntime(this.save);
    this.level = LEVEL_BY_ID[this.save.progress.currentLevel === 2 ? "level2" : "level1"]!;
    this.audio = new AudioManager(this.save.settings);
    this.overlays = new Overlays(this.root, canvas);
    this.hud = new Hud(this.root, () => this.handlePauseButton(), () => this.requestFullscreen(false));
    this.shopPanel = new ShopPanel(this.root);
    this.dialogueBox = new DialogueBox(this.root);
    this.touch = new TouchControls(this.root);
    this.touch.bind(this.input);
    this.overlays.setReduceMotion(this.save.settings.reduceMotion);
    this.portraitHint = document.getElementById("rotate-hint")!;
    this.rotateFullscreen = document.getElementById("rotate-fullscreen") as HTMLButtonElement | null;
    this.rotateContinue = document.getElementById("rotate-continue") as HTMLButtonElement | null;

    if (loaded.toast) {
      window.setTimeout(() => this.overlays.toast(loaded.toast!, loaded.status === "corrupt" ? "danger" : "info", 3200), 300);
    }
    this.input.bind();
    this.input.onShortcut((code) => this.onShortcut(code));
    window.addEventListener("resize", this.onResize);
    window.addEventListener("orientationchange", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("blur", this.onWindowBlur);
    this.rotateFullscreen?.addEventListener("click", () => this.enterFullscreen());
    this.rotateContinue?.addEventListener("click", () => {
      this.orientationDismissed = true;
      this.portraitHint.classList.add("hidden");
    });
    this.fsm.onChange((next) => this.onStateChange(next));
    this.initialLoad = false;
    this.goTitle();
  }

  /** 启动时调用（main 里在 baplay 场景内）。 */
  start(): void {
    const issues = validateContent(CONTENT);
    if (issues.length > 0) {
      for (const issue of issues) console.error(`[content] ${issue.path}: ${issue.message}`);
      this.overlays.toast("内容校验失败，请查看控制台", "danger", 5000);
    }
    this.checkOrientation();
  }

  update(dt: number): void {
    this.clock += dt;
    this.input.update(dt);
    this.audio.update(dt);
    this.viewportTimer += dt;
    if (this.viewportTimer > 0.4) {
      this.viewportTimer = 0;
      this.overlays.updateWorldRect(this.canvas);
    }

    // 关于弹层：Esc 关闭（触屏用「关闭」按钮）；标题处于冻结状态，不会误触开始
    if (this.overlays.isAboutOpen && this.input.pressed("pause")) {
      this.overlays.hideAbout();
    }

    switch (this.fsm.state) {
      case "LevelIntro":
        this.introRemaining -= dt;
        if (this.input.pressed("confirm") || this.input.pressed("skip") || this.introRemaining <= 0) {
          this.beginPlaying();
        }
        break;
      case "Playing":
        this.handlePlayingInput();
        this.updatePlaying(dt);
        break;
      case "Dialogue":
        this.updateDialogue(dt);
        break;
      case "Shop":
        this.updateShopState(dt);
        break;
      case "Cutscene":
        this.updateCutscene(dt);
        break;
      case "Paused":
        this.handlePausedInput();
        break;
      case "Fail":
        this.handleFailInput();
        break;
      case "LevelClear":
        this.handleClearInput();
        break;
      case "ToBeContinued":
        this.handleTbcInput();
        break;
      default:
        break;
    }

    this.updateHud();
    this.updateTouchVisibility();
    this.input.endFrame();
  }

  draw(): void {
    if (this.fsm.state === "Title" || this.fsm.state === "Boot") return;
    try {
      this.drawWorld();
    } catch (err) {
      if (!(window as unknown as { __cmiDrawError?: boolean }).__cmiDrawError) {
        (window as unknown as { __cmiDrawError?: boolean }).__cmiDrawError = true;
        console.error("[draw] error", err);
      }
    }
  }

  // ============================================================
  // 状态切换 / 标题 / 关卡
  // ============================================================

  private onStateChange(next: GameState): void {
    this.hud.setVisible(
      next === "Playing" || next === "Dialogue" || next === "Shop" || next === "Paused" || next === "Fail",
    );
    if (next === "Title" || next === "LevelIntro" || next === "Cutscene" || next === "LevelClear" || next === "ToBeContinued") {
      this.touch.setActive(false);
      this.touch.setInteractVisible(false);
    }
    if (next === "Playing") {
      this.touch.setActive(true);
    }
    if (next === "Title" || next === "ToBeContinued" || next === "LevelClear") {
      this.overlays.setVignette(false);
    }
  }

  private goTitle(): void {
    this.pendingGunCutscene = false;
    this.overlays.hideAll();
    this.shopPanel.hide();
    this.dialogueBox.close();
    this.cutscene.abort();
    this.fsm.reset();
    this.fsm.goState("Title");
    this.hud.setVisible(false);
    this.touch.setActive(false);
    this.audio.stopBgm();
    const hasSave =
      this.save.progress.coins > 0 ||
      this.save.stats.deaths > 0 ||
      this.save.progress.items.length > 0 ||
      this.save.progress.unlockedLevel > 1 ||
      Boolean(this.save.progress.currentRoom);
    this.overlays.showTitle(hasSave, {
      onStart: () => this.newGame(),
      onContinue: () => this.continueGame(),
      onSettings: () => this.openSettings("title"),
      onAbout: () => this.openAbout(),
    });
    if (this.save.settings.controlScheme === "touch" || this.save.settings.controlScheme === "auto") {
      this.touch.setActive(this.touch.hasTouch());
    }
    this.audio.unlock();
  }

  private newGame(): void {
    this.pendingGunCutscene = false;
    this.audio.unlock();
    this.requestFullscreen(true);
    const settings = { ...this.save.settings };
    this.save = defaultSave();
    this.save.settings = settings;
    this.level2StipendGranted = false;
    this.run = createRuntime(this.save);
    this.overlays.hideTitle();
    this.startLevel("level1", { grantStipend: false, roomIndex: 0 });
  }

  private continueGame(): void {
    this.audio.unlock();
    this.requestFullscreen(true);
    this.overlays.hideTitle();
    const plan = planResume(this.save);
    this.run = createRuntime(this.save);
    this.pendingGunCutscene = plan.replayGunCutscene;
    this.startLevel(plan.levelId, { grantStipend: plan.grantStipend, roomIndex: plan.roomIndex });
  }

  private startLevel(
    levelId: LevelId,
    opts: { grantStipend: boolean; roomIndex: number },
  ): void {
    this.level = LEVEL_BY_ID[levelId]!;
    this.run.levelId = levelId;
    this.run.roomIndex = opts.roomIndex ?? 0;
    this.run.runElapsed = 0;
    this.run.failReason = null;
    this.run.exposure = 0;
    this.run.shopTimer = 0;
    this.run.shopAvailable = false;
    this.run.shopSpawned = false;
    this.run.shopSpawnTimer = 0;
    this.run.shopImpatientShown = false;
    this.run.giant = false;
    this.run.giantCutsceneDone = false;
    this.run.bossDefeated = false;
    this.run.victory = false;
    this.run.shoeActiveAt = 0;
    this.run.introDone = false;
    this.run.checkpoint = null;
    this.cutscene.abort();
    this.bullets = [];
    this.dropCoins = [];
    this.particles = [];
    this.floatTexts = [];

    if (levelId === "level2") {
      const shouldGrant = opts.grantStipend || !this.level2StipendGranted;
      if (shouldGrant) {
        const add = Math.max(0, BALANCE.level2.startCoins);
        this.run.coins = Math.min(BALANCE.economy.maxCoins, this.run.coins + add);
        this.run.npcFlags["l2_stipend"] = true;
        this.level2StipendGranted = true;
        this.audio.playSfx("sfx.coin");
      }
      this.run.hp = Math.max(BALANCE.level2.playerHp, this.run.maxHp);
      this.run.maxHp = BALANCE.level2.playerHp;
      if (!hasItem(this.run, "bullet_gun")) {
        addItem(this.run, "bullet_gun");
        this.events.emit("game:item-acquired", { itemId: "bullet_gun", silent: true });
      }
      this.run.bossHp = BALANCE.level2.boss2Hp;
      this.run.bossPhase = "p1";
      this.checkpointCp1();
    } else {
      this.run.bossHp = BALANCE.level1.boss1Hp;
      this.run.bossPhase = "watch";
    }

    this.persist();
    if (!this.fsm.goState("LevelIntro")) {
      this.fsm.reset();
      this.fsm.goState("Title");
      this.fsm.goState("LevelIntro");
    }
    this.hud.setVisible(false);
    this.overlays.hideAll();
    this.overlays.showWorldBubble("", 0, 0, 0);
    this.overlays.hideWorldBubble();
    this.introRemaining = this.level.intro.durationMs / 1000;
    this.overlays.showIntro(this.level, () => {
      if (this.fsm.state === "LevelIntro") this.beginPlaying();
    });
    this.audio.playBgm(this.level.music);
    this.events.emit("game:level-start", { levelId });
  }

  private beginPlaying(): void {
    if (this.fsm.state !== "LevelIntro") return;
    this.overlays.hideIntro();
    if (!this.fsm.goState("Playing")) return;
    this.run.introDone = true;
    this.loadRoom(this.level.id, this.run.roomIndex);
    this.audio.playBgm(this.room?.bg === "hall" || this.room?.bg === "arena" ? (this.level.id === "level1" ? "bgm.boss1" : "bgm.boss2") : this.level.music);
    this.events.emit("game:room-enter", {
      levelId: this.level.id,
      roomId: this.room?.id ?? "",
      index: this.run.roomIndex,
    });
    if (this.pendingGunCutscene) {
      this.pendingGunCutscene = false;
      // 补播时把玩家放回购买点，让潮冲向玩家、枪抛回同一位置
      this.run.player.x = BALANCE.level1.hallShopX;
      this.run.player.y = BALANCE.level1.hallShopY;
      this.startGunCutscene();
    }
  }

  private loadRoom(levelId: LevelId, index: number, spawnOverride?: Vec): void {
    const level = LEVEL_BY_ID[levelId]!;
    const room = level.rooms[clamp(index, 0, level.rooms.length - 1)] ?? level.rooms[0]!;
    const wasSameRoom = this.run.roomId === room.id;
    this.run.roomIndex = level.rooms.indexOf(room);
    this.run.roomId = room.id;
    this.room = room;
    this.level = level;
    this.solidRects = this.buildSolids(room);
    const spawn = spawnOverride ?? room.spawn;
    this.run.player = {
      ...this.run.player,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      onGround: false,
      coyote: 0,
      jumpBuffer: 0,
      facing: 1,
      invuln: 0,
      frozen: false,
      slipTimer: 0,
    };
    this.fixedAccumulator = 0;
    this.bullets = [];
    this.dropCoins = [];
    this.laserBoss = null;
    this.arenaBoss = null;

    if (room.boss) {
      if (room.boss.bossId === "xiaochang") {
        const def = BOSS_BY_ID["xiaochang"]!;
        this.laserBoss = new LaserBoss(
          def,
          room.eyes ?? def.eyes ?? [],
          room.plaques ?? [],
        );
      } else if (room.boss.bossId === "boss2") {
        const def = BOSS_BY_ID["boss2"]!;
        this.arenaBoss = new ArenaBoss(def, room.desks ?? []);
        if (this.run.giant) this.arenaBoss.restoreGiant();
      }
    } else if (room.eyes && room.eyes.length > 0) {
      // R2/R3 的漂浮眼睛也使用同一套激光状态机
      const def = BOSS_BY_ID["xiaochang"]!;
      this.laserBoss = new LaserBoss(def, room.eyes, room.plaques ?? []);
    }

    this.run.checkpoint = snapshotCheckpoint(this.run, `room:${room.id}`, {
      x: spawn.x,
      y: spawn.y,
      hp: Math.max(1, this.run.hp),
      coins: this.run.coins,
      bossHp: room.boss?.bossId === "boss2" ? this.run.bossHp : this.run.bossHp,
      bossPhase: this.run.bossPhase,
    });
    this.run.visitedRooms.push(room.id);
    this.run.roomEnterCount[room.id] = (this.run.roomEnterCount[room.id] ?? 0) + 1;
    if (room.checkpoint && !wasSameRoom) {
      // 检查点由玩家到达后激活；这里先记录提示目标
    }
    if (room.id === "l1-r3" && this.run.shopTimer === 0) {
      this.run.shopTimer = 0;
    }
    if (room.id === "l1-r4" && this.run.shopAvailable) {
      this.run.shopSpawnTimer = this.run.shopSpawned ? 0 : 1.0;
    }
    this.markRoomVictoryState();
    this.persist();
  }

  private markRoomVictoryState(): void {
    if (this.level.id === "level2") {
      this.run.bossHp = this.arenaBoss?.currentHp ?? this.run.bossHp;
      this.run.bossPhase = this.arenaBoss?.state.phase ?? this.run.bossPhase;
    }
  }

  private buildSolids(room: RoomDef): Rect[] {
    const desks = new Set((room.desks ?? []).map((d) => `${d.x},${d.y},${d.w},${d.h}`));
    return room.platforms.filter((p) => {
      if (this.run.giant && this.level.id === "level2") {
        return !desks.has(`${p.x},${p.y},${p.w},${p.h}`);
      }
      return true;
    });
  }

  // ============================================================
  // Playing 循环
  // ============================================================

  private handlePlayingInput(): void {
    if (this.input.pressed("pause")) {
      this.pauseGame();
      return;
    }
    if (this.input.pressed("interact")) {
      this.tryInteract();
    }
  }

  private updatePlaying(dt: number): void {
    if (!this.room) return;
    this.run.runElapsed += dt;
    this.run.playSeconds += dt;

    // 物理固定步长
    const axis = this.input.axis();
    const jumpPressed = this.input.consumePressed("jump");
    const jumpHeld = this.input.held("jump");
    const step = BALANCE.view.fixedDt;
    this.fixedAccumulator = Math.min(this.fixedAccumulator + dt, 0.1);
    let firstStep = true;
    this.run.player.slipTimer = Math.max(0, this.run.player.slipTimer - dt);
    while (this.fixedAccumulator >= step) {
      const forcedVx =
        this.run.player.slipTimer > 0 ? (this.run.player.facing > 0 ? 300 : -300) : undefined;
      const res: PlayerStepResult = stepPlayer(
        this.run.player,
        { axis, jumpHeld, jumpPressed: firstStep && jumpPressed, forcedVx },
        this.solidRects,
        step,
      );
      if (res.jumped) this.audio.playSfx("sfx.jump");
      if (res.landed) this.audio.playSfx("sfx.land");
      firstStep = false;
      this.fixedAccumulator -= step;
      this.checkPlayerHazards();
      if (this.fsm.state !== "Playing") return;
    }

    // 房间出口
    if (this.room.exits.length > 0) {
      const exit = exitAt(this.room, this.run.player.x, this.run.player.y);
      if (exit) {
        this.switchRoom(exit.toRoom, exit.spawnAt);
        return;
      }
    }

    // 检查点
    if (this.room.checkpoint) {
      const cp = this.room.checkpoint;
      if (Math.abs(this.run.player.x - cp.x) < 24 && Math.abs(this.run.player.y - cp.y) < 60) {
        if (this.run.checkpoint && Math.abs(this.run.checkpoint.x - cp.x) > 1) {
          this.run.checkpoint = snapshotCheckpoint(this.run, `cp:${this.room.id}`, {
            x: cp.x,
            y: cp.y,
            hp: this.run.hp,
            coins: this.run.coins,
            bossHp: this.run.bossHp,
            bossPhase: this.run.bossPhase,
          });
          if (!this.checkpointToastShown.has(this.room.id)) {
            this.checkpointToastShown.add(this.room.id);
            this.overlays.toast("检查点 · 记住了", "success", 1200);
            this.audio.playSfx("sfx.coin");
          }
          this.persist();
        }
      }
    }

    // 金币拾取
    this.collectRoomCoins();
    this.updateDropCoins(dt);

    // 射击
    this.updateShooting(dt);

    // 商店计时与出现
    this.updateShopTimer(dt);

    // 视线与笑长
    this.updateLaserRoom(dt);

    // 第二关 Boss
    if (this.level.id === "level2" && this.arenaBoss) {
      this.updateArena(dt);
    }

    // NPC 交互提示 / 小明自动演出
    this.updateNpcHints();
    this.updateXiaoming(dt);

    // 粒子/飘字
    this.updateFx(dt);
    this.updateHazardFall();
  }

  private checkPlayerHazards(): void {
    if (!this.room) return;
    const body = playerRect(this.run.player.x, this.run.player.y, BALANCE.player.w, BALANCE.player.h);
    const spikes = this.room.hazards.filter((h) => h.type === "spike").map((h) => h.rect);
    if (overlapsHazard(body, spikes)) {
      this.fail("pit");
      return;
    }
    if (isFallingOut(this.run.player)) {
      this.fail("pit");
    }
  }

  private updateHazardFall(): void {
    if (!this.room) return;
    if (isFallingOut(this.run.player)) {
      this.fail("pit");
    }
  }

  private collectRoomCoins(): void {
    if (!this.room) return;
    const p = this.run.player;
    for (let i = 0; i < this.room.coins.length; i++) {
      const c = this.room.coins[i]!;
      const key = `${this.room.id}:${i}`;
      if (this.run.pickedCoins.includes(key)) continue;
      const d = Math.hypot(c.x - p.x, c.y - (p.y - 14));
      if (d <= BALANCE.economy.coinPickupRadius) {
        this.run.pickedCoins.push(key);
        this.addCoin(1, "pickup");
      }
    }
  }

  private updateDropCoins(dt: number): void {
    const p = this.run.player;
    for (let i = this.dropCoins.length - 1; i >= 0; i--) {
      const c = this.dropCoins[i]!;
      c.life -= dt;
      c.angle += dt * 4;
      const dx = p.x - c.x;
      const dy = p.y - 14 - c.y;
      const dist = Math.hypot(dx, dy);
      if (dist < BALANCE.economy.coinDropMagnetRadius) {
        const speed = BALANCE.economy.coinDropMagnetSpeed;
        c.x += (dx / Math.max(1, dist)) * speed * dt;
        c.y += (dy / Math.max(1, dist)) * speed * dt;
      } else {
        c.vy += 900 * dt;
        c.x += Math.cos(c.angle) * 40 * dt;
        c.y = Math.min(512, c.y + c.vy * dt);
        if (c.y >= 512) c.vy = 0;
      }
      if (dist < BALANCE.economy.coinDropPickupRadius) {
        this.dropCoins.splice(i, 1);
        this.addCoin(BALANCE.level2.coinDrop, "pickup");
        this.audio.playSfx("sfx.coin");
        continue;
      }
      if (c.life <= 0) this.dropCoins.splice(i, 1);
    }
  }

  private updateShooting(dt: number): void {
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    const wantsGun = hasItem(this.run, "bullet_gun");
    if (!wantsGun) return;
    if (!this.input.held("shoot") || this.shootCooldown > 0) return;
    if (this.level.id !== "level2" && this.room?.bg !== "hall") return;
    this.shootCooldown = BALANCE.level2.bulletCooldown;
    const p = this.run.player;
    const facing = p.facing;
    this.bullets.push({
      x: p.x + facing * 14,
      y: p.y - 16,
      vx: facing * BALANCE.level2.bulletSpeed,
      vy: 0,
      life: BALANCE.level2.bulletLifetime,
    });
    if (this.bullets.length > BALANCE.level2.bulletMaxOnScreen) this.bullets.shift();
    this.audio.playSfx("sfx.gunshot");
  }

  private updateBullets(dt: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]!;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      const br: Rect = { x: b.x - 5, y: b.y - 3, w: 10, h: 6 };
      // 掩体
      if (this.room?.desks && !this.run.giant) {
        if (this.room.desks.some((d) => rectsOverlap(br, d))) {
          this.bullets.splice(i, 1);
          continue;
        }
      }
      // 香蕉皮可被子弹打掉
      if (this.arenaBoss?.destroyBananaAt(br)) {
        this.bullets.splice(i, 1);
        this.spawnParticles(b.x, b.y, "chalk", 4);
        continue;
      }
      // Boss 受击
      if (this.arenaBoss && !this.run.bossDefeated) {
        if (rectsOverlap(br, this.arenaBoss.hurtbox)) {
          this.bullets.splice(i, 1);
          this.hitBoss();
          continue;
        }
      }
      if (b.life <= 0 || b.x < -30 || b.x > 990) this.bullets.splice(i, 1);
    }
  }

  private hitBoss(): void {
    if (!this.arenaBoss || this.run.bossDefeated) return;
    const res = this.arenaBoss.hitByBullet();
    this.run.bossHp = res.hp;
    if (res.scraped) {
      this.scrapCount++;
      const y = 380;
      this.spawnFloatText(760, y, "-0", "white");
      if (this.scrapCount % 3 === 0) {
        this.spawnFloatText(760, y - 24, "SCRAP", "chalk");
        this.overlays.toast("刮痧", "info", 700);
      }
      this.audio.playSfx("sfx.hurt");
      return;
    }
    this.run.hitCounts++;
    this.spawnFloatText(760, 380, "-4", "gold");
    this.spawnParticles(760, 380, "white", 5);
    this.audio.playSfx("sfx.hurt");
    if (res.dropCoin) {
      this.dropCoins.push({
        x: 760,
        y: 420,
        vy: -220,
        life: BALANCE.economy.coinDropLifetime,
        angle: Math.random() * Math.PI * 2,
      });
      while (this.dropCoins.length > BALANCE.economy.coinDropMaxOnScreen) this.dropCoins.shift();
    }
    if (res.triggerGiant) {
      this.startGiantCutscene();
    }
  }

  private updateArena(dt: number): void {
    if (!this.arenaBoss) return;
    const p = this.run.player;
    this.arenaBoss.update(dt, { x: p.x, y: p.y }, {
      onHurt: (source, hp, coins) => this.onArenaHurt(source, hp, coins),
      onBubble: (text, ms) => this.overlays.showWorldBubble(text, 816, 200, ms),
      onAttack: (id) => {
        if (id === "a2" || id === "a5" || id === "a6") this.audio.playSfx("sfx.warning");
        if (id === "a1" || id === "a3" || id === "a4") this.audio.playSfx("sfx.laser");
      },
      onShoeNear: () => {
        this.overlays.showWorldBubble(BALANCE.level2.bossBubbleNearShoe, 816, 220, 1600);
      },
    });
    this.run.bossPhase = this.arenaBoss.state.phase;
    this.run.bossHp = this.arenaBoss.currentHp;
    this.updateBullets(dt);
    // 碰鞋胜利
    if (this.arenaBoss.isShoeActive && !this.run.victory) {
      const body = playerRect(p.x, p.y, BALANCE.player.w, BALANCE.player.h);
      if (rectsOverlap(body, this.arenaBoss.shoeHitbox)) {
        this.startShoeVictory();
      }
    }
  }

  private onArenaHurt(source: string, hpLoss: number, coinLoss: number): void {
    if (this.fsm.state !== "Playing" || this.run.victory) return;
    // docs/21 §2.6：同帧受击时碰鞋胜利优先
    if (this.arenaBoss?.isShoeActive) {
      const body = playerRect(this.run.player.x, this.run.player.y, BALANCE.player.w, BALANCE.player.h);
      if (rectsOverlap(body, this.arenaBoss.shoeHitbox)) {
        this.startShoeVictory();
        return;
      }
    }
    if (source === "banana") {
      // 踩在香蕉上时每帧都会 overlap：只在首次滑倒时红闪，之后只续滑倒时间
      if (this.run.player.slipTimer > 0) {
        this.run.player.slipTimer = BALANCE.attacks.a4.slipDuration;
        return;
      }
      this.run.player.slipTimer = BALANCE.attacks.a4.slipDuration;
      this.run.player.vx = 0;
      this.overlays.flash("red", 0.12, 120);
      this.audio.playSfx("sfx.hurt");
      return;
    }
    if (this.run.player.invuln > 0) return;
    const res = resolveDamage({
      hp: this.run.hp,
      coins: this.run.coins,
      hpLoss,
      coinLoss,
      preventLethal: false,
    });
    this.run.hp = res.hp;
    this.run.coins = res.coins;
    this.run.player.invuln = BALANCE.player.invuln;
    this.run.player.vx = (this.run.player.x < 480 ? 1 : -1) * BALANCE.player.hitKnockbackX;
    this.run.player.vy = -BALANCE.player.hitKnockbackY;
    this.overlays.flash("red", BALANCE.motion.flashAlpha, BALANCE.motion.flashHurt);
    this.screenShake(BALANCE.motion.shakeHit);
    this.audio.playSfx("sfx.hurt");
    this.audio.duckBgm(0.5, 400);
    this.events.emit("game:player-damaged", {
      source,
      hpLoss: res.hpLost,
      coinLoss: res.coinsLost,
      hpAfter: this.run.hp,
      coinsAfter: this.run.coins,
    });
    this.events.emit("game:coin-changed", { coins: this.run.coins, delta: -res.coinsLost, reason: "hit" });
    this.spawnFloatText(this.run.player.x, this.run.player.y - 40, `-${res.coinsLost}`, "red");
    this.persistSoon();
    if (res.failed) {
      this.fail(res.failReason ?? "hp");
    }
  }

  private updateLaserRoom(dt: number): void {
    if (!this.room) return;
    if (this.level.id !== "level1") return;
    if (this.laserBoss) {
      // 商店 60s 不买：笑长不耐烦，攻击轮每轮提速 10%，下限 2.4s（docs/20 L1-10）
      this.laserBoss.setImpatient(this.isShopImpatient());
      this.laserBoss.update(dt, this.run.player.x);
      const state = this.laserBoss.state;
      let visible = false;
      if (!state.blink) {
        const body = playerRect(this.run.player.x, this.run.player.y, BALANCE.player.w, BALANCE.player.h);
        const blockers = this.room.plaques ?? [];
        for (const beam of state.beams) {
          if (gazeFanHitsPlayer(beam.eye, beam.dir, beam.halfAngle, body, blockers)) {
            visible = true;
            break;
          }
        }
      }
      const rateMul = this.run.buffs["shamoluotuo"] ? BALANCE.level1.laowuExposureMul : 1;
      const next = updateExposure(dt, visible, { value: this.run.exposure, warned: this.run.exposureWarned }, {
        rateMul,
      });
      this.run.exposure = next.value;
      this.run.exposureWarned = next.warned;
      const p = getPalette(this.k);
      this.overlays.setVignette(next.warned);
      void p;
      if (exposureFailed(this.run.exposure)) {
        this.fail("gaze");
        return;
      }
    }
    // Buff 倒计时
    for (const key of Object.keys(this.run.buffs)) {
      this.run.buffs[key] = Math.max(0, (this.run.buffs[key] ?? 0) - dt);
      if (this.run.buffs[key] <= 0) {
        delete this.run.buffs[key];
        this.events.emit("game:buff-ended", { buffId: key });
      }
    }
  }

  private isShopImpatient(): boolean {
    return (
      this.level.id === "level1" &&
      this.room?.id === "l1-r4" &&
      this.run.shopSpawned &&
      !this.run.shopPurchased &&
      this.run.shopTimer > BALANCE.level1.shopImpatientAfter
    );
  }

  private updateShopTimer(dt: number): void {
    if (this.level.id !== "level1" || !this.room) return;
    if (this.room.id !== "l1-r3" && this.room.id !== "l1-r4") return;
    if (this.run.shopPurchased) return;
    this.run.shopTimer += dt;
    if (this.run.shopTimer >= BALANCE.level1.shopUnlockTime && !this.run.shopAvailable) {
      this.run.shopAvailable = true;
      this.run.shopSpawnTimer = 1.0;
      this.run.shopUnlockedAt = this.run.shopTimer;
    }
    if (this.room.id === "l1-r4" && this.run.shopAvailable && !this.run.shopSpawned) {
      this.run.shopSpawnTimer -= dt;
      if (this.run.shopSpawnTimer <= 0) {
        this.run.shopSpawned = true;
        this.overlays.toast("校长小卖部开张了", "success", 2000);
        this.audio.playSfx("sfx.shop");
        this.applyShopLoan();
      }
    }
    if (this.run.shopSpawned && !this.run.shopImpatientShown && this.run.shopTimer > BALANCE.level1.shopImpatientAfter) {
      this.run.shopImpatientShown = true;
      this.overlays.showWorldBubble("你搁这陪我唠嗑呢？", 480, 210, 2000);
    }
  }

  private applyShopLoan(): void {
    if (this.run.coins >= BALANCE.level1.shopBorrowedThreshold) return;
    const loan = loanToThreshold(this.run.coins, BALANCE.level1.shopBorrowedThreshold);
    if (loan.borrowed) {
      const delta = loan.coins - this.run.coins;
      this.run.coins = loan.coins;
      this.run.shopLoaned = true;
      this.overlays.showWorldBubble("穷成这样，校长赏你的。", 480, 200, 1600);
      this.events.emit("game:coin-changed", {
        coins: this.run.coins,
        delta,
        reason: "loan",
      });
      this.persistSoon();
    }
  }

  private updateNpcHints(): void {
    if (!this.room) return;
    const npc = this.nearestNpc();
    this.activeNpc = npc;
    this.touch.setInteractVisible(Boolean(npc) || this.shopNearby());
  }

  private nearestNpc(): NpcDef | null {
    if (!this.room) return null;
    let best: NpcDef | null = null;
    let bestD = Infinity;
    for (const entry of this.room.npcs) {
      const def = NPC_BY_ID[entry.npcId];
      if (!def || def.trigger === "auto") continue;
      const d = Math.hypot(entry.at.x - this.run.player.x, entry.at.y - 14 - (this.run.player.y - 14));
      if (d < (def.interactRadius ?? BALANCE.npc.interactRadius) && d < bestD) {
        best = def;
        bestD = d;
      }
    }
    return best;
  }

  private shopNearby(): boolean {
    return Boolean(
      this.level.id === "level1" &&
        this.room?.id === "l1-r4" &&
        this.run.shopSpawned &&
        !this.run.shopPurchased &&
        this.run.player.onGround &&
        Math.hypot(this.run.player.x - BALANCE.level1.hallShopX, this.run.player.y - BALANCE.level1.hallShopY) <=
          BALANCE.player.interactRadius,
    );
  }

  private tryInteract(): void {
    if (performance.now() < this.interactCooldownUntil) return;
    if (this.shopNearby() && performance.now() > this.shopCooldownUntil) {
      this.openShop();
      return;
    }
    const npc = this.nearestNpc();
    if (npc) {
      this.interactCooldownUntil = performance.now() + BALANCE.flow.interactionCooldown * 1000;
      this.startNpcDialogue(npc);
    }
  }

  private switchRoom(toRoomId: string, spawnAt: Vec): void {
    const level = this.level;
    const index = level.rooms.findIndex((r) => r.id === toRoomId);
    if (index < 0) return;
    this.run.roomIndex = index;
    this.run.roomId = toRoomId;
    this.loadRoom(this.level.id, index, spawnAt);
    this.events.emit("game:room-enter", { levelId: this.level.id, roomId: toRoomId, index });
    this.audio.playBgm(
      this.room?.bg === "hall" || this.room?.bg === "arena"
        ? this.level.id === "level1"
          ? "bgm.boss1"
          : "bgm.boss2"
        : this.level.music,
    );
    if (this.run.checkpoint) {
      this.run.checkpoint.x = spawnAt.x;
      this.run.checkpoint.y = spawnAt.y;
    }
    this.overlays.updateWorldRect(this.canvas);
    this.persist();
  }

  private updateXiaoming(dt: number): void {
    if (!this.room) return;
    const entry = this.room.npcs.find((n) => n.npcId === "xiaoming");
    if (!entry) return;
    const d = Math.hypot(entry.at.x - this.run.player.x, entry.at.y - this.run.player.y);
    if (d > BALANCE.npc.autoRadius) {
      this.xiaomingNextBubble = 0;
      return;
    }
    const visits = this.run.roomEnterCount[this.room.id] ?? 1;
    if (visits >= BALANCE.npc.xiaomingEasterEggVisit && !this.run.memes.includes("xiaoming_air")) {
      addMeme(this.run, "xiaoming_air");
      this.overlays.toast("彩蛋：小明的空气", "info", 1800);
    }
    if (visits >= BALANCE.npc.xiaomingWaveVisit && this.xiaomingWaveUntil === 0) {
      this.xiaomingWaveUntil = this.clock + BALANCE.npc.xiaomingWaveDuration;
    }
    this.xiaomingNextBubble -= dt;
    if (this.xiaomingNextBubble <= 0) {
      this.xiaomingNextBubble = BALANCE.npc.xiaomingBubbleRepeat;
      this.overlays.showWorldBubble("……", entry.at.x, entry.at.y - 60, 1200);
    }
  }

  // ============================================================
  // 对话 / NPC
  // ============================================================

  private chooseNpcDialogue(npc: NpcDef): string | null {
    if (npc.id === "laowu") {
      const cooldown = this.run.npcCooldowns["laowu"] ?? 0;
      if (this.clock < cooldown) return null;
      return this.run.npcFlags["laowu_met"] ? (npc.shortDialogueId ?? npc.dialogueId) : npc.dialogueId;
    }
    if (npc.id === "shijun") {
      return this.run.npcFlags["shijun_banana"]
        ? (npc.shortDialogueId ?? npc.dialogueId)
        : npc.dialogueId;
    }
    if (npc.id === "jiasheng") {
      if (this.run.npcFlags["jiashengBitten"]) return npc.shortDialogueId ?? npc.dialogueId;
      if (this.run.hp <= BALANCE.npc.jiashengHpFloor) return "jiasheng_floor";
      return npc.dialogueId;
    }
    return npc.dialogueId;
  }

  private startNpcDialogue(npc: NpcDef): void {
    if (!this.fsm.goState("Dialogue")) return;
    const dialogueId = this.chooseNpcDialogue(npc);
    if (dialogueId === null) {
      this.audio.playSfx("sfx.dialogue");
      this.overlays.showWorldBubble("嗓子歇会儿。", npc.id === "laowu" ? BALANCE.npc.laowuX : 480, 450, 1500);
      this.audio.duckBgm(1, 200);
      this.fsm.goState("Playing");
      return;
    }
    const dialogue = getDialogue(dialogueId);
    if (!dialogue) return;
    this.activeNpc = npc;
    this.activeDialogue = dialogue;
    this.activeNpcId = npc.id;
    this.pendingNpcEffect = npc;
    this.dialogueBox.open(
      {
        onAdvance: () => this.dialogueRunner.advance(),
        onSkip: () => this.dialogueRunner.skip(),
      },
      dialogue.canSkip ?? true,
    );
    this.dialogueRunner.start(
      dialogue,
      {
        onFinished: (skipped) => this.finishDialogue(skipped),
        onLineChanged: (line) => this.dialogueBox.setLine(line, "", true),
      },
      dialogue.canSkip ?? true,
    );
    this.audio.duckBgm(0.35, 200);
    this.audio.playSfx("sfx.dialogue");
    this.events.emit("game:dialogue-start", { dialogueId: dialogue.id, npcId: npc.id });
    if (npc.id === "jiasheng") this.fsm.goState; // no-op for clarity
  }

  private updateDialogue(dt: number): void {
    if (!this.dialogueRunner.isOpen) return;
    this.dialogueRunner.update(dt);
    const line = this.dialogueRunner.currentLine;
    this.dialogueBox.setLine(line, this.dialogueRunner.currentVisibleText, this.dialogueRunner.isTyping);
    this.dialogueBox.setSkipEnabled(this.dialogueRunner.skipAllowed);
    if (this.input.pressed("confirm")) this.dialogueRunner.advance();
  }

  private finishDialogue(skipped: boolean): void {
    const npc = this.pendingNpcEffect ?? this.activeNpc;
    const dialogueId = this.activeDialogue?.id ?? "";
    this.pendingNpcEffect = null;
    this.activeNpc = null;
    this.activeDialogue = null;
    this.activeNpcId = null;
    this.dialogueBox.close();
    this.events.emit("game:dialogue-end", { dialogueId, npcId: npc?.id, skipped });
    this.audio.duckBgm(1, 200);
    if (npc) this.applyNpcEffect(npc);
    if (this.fsm.state === "Dialogue") this.fsm.closeOverlay("Playing");
  }

  private applyNpcEffect(npc: NpcDef): void {
    if (!npc.effect) return;
    if (npc.effect.type === "buff") {
      const buff = CONTENT.buffs[npc.effect.buffId];
      if (buff) {
        this.run.buffs[buff.id] = buff.durationMs / 1000;
        this.audio.playSfx("sfx.buff");
        this.events.emit("game:buff-applied", { buffId: buff.id, durationMs: buff.durationMs });
        this.overlays.toast(buff.hudText, "success", 2000);
        addMeme(this.run, "shamoluotuo");
        this.run.npcFlags["laowu_met"] = true;
        this.run.npcCooldowns["laowu"] = this.clock + BALANCE.level1.laowuBuffCooldown;
      }
    } else if (npc.effect.type === "item") {
      const itemId = npc.effect.itemId;
      if (!this.run.items.includes(itemId)) {
        addItem(this.run, itemId);
        const item = getItem(itemId);
        this.events.emit("game:item-acquired", { itemId });
        this.overlays.toast(`获得：${item?.name ?? itemId}`, "success", 2000);
        addMeme(this.run, "feizhou_banana");
        this.run.npcFlags["shijun_banana"] = true;
        this.audio.playSfx("sfx.coin");
      }
    } else if (npc.effect.type === "damage") {
      if (npc.id === "jiasheng" && !this.run.npcFlags["jiashengBitten"]) {
        this.run.npcFlags["jiashengBitten"] = true;
        const res = resolveDamage({
          hp: this.run.hp,
          coins: this.run.coins,
          hpLoss: BALANCE.npc.jiashengHpLoss,
          coinLoss: 0,
          preventLethal: true,
          hpFloor: BALANCE.npc.jiashengHpFloor,
        });
        this.run.hp = res.hp;
        this.run.player.invuln = BALANCE.npc.jiashengPostHitInvuln;
        this.overlays.flash("red", 0.28, 200);
        this.screenShake(BALANCE.npc.jiashengShake);
        this.audio.playSfx("sfx.hurt");
        if (res.hpLost > 0) {
          this.overlays.toast(`假生：都这个点了还没死呢（-${res.hpLost} HP）`, "danger", 2000);
          this.spawnFloatText(this.run.player.x, this.run.player.y - 40, `-${res.hpLost}`, "red");
        }
        this.events.emit("game:player-damaged", {
          source: "npc:jiasheng",
          hpLoss: res.hpLost,
          coinLoss: 0,
          hpAfter: this.run.hp,
          coinsAfter: this.run.coins,
        });
        this.persistSoon();
      }
    }
  }

  // ============================================================
  // 商店
  // ============================================================

  private openShop(): void {
    if (!this.room || !this.room.shop) return;
    const shop = CONTENT.shops[this.room.shop.shopId];
    const item = getItem("bullet_gun");
    if (!shop || !item) return;
    if (!this.fsm.goState("Shop")) return;
    this.shopState = "open";
    this.audio.duckBgm(0.35, 200);
    this.audio.playSfx("sfx.shop");
    this.events.emit("game:shop-opened", { shopId: shop.id });
    this.shopPanel.open(shop, item, BALANCE.level1.shopPrice, this.run.coins, {
      onBuy: () => this.buyGun(),
      onClose: () => this.closeShop(),
    });
  }

  private updateShopState(_dt: number): void {
    if (this.input.pressed("pause") || this.input.pressed("skip")) {
      this.closeShop();
    }
  }

  private buyGun(): void {
    const shop = this.room?.shop ? CONTENT.shops[this.room.shop.shopId] : null;
    if (!shop) return;
    const res = purchase({
      coins: this.run.coins,
      price: BALANCE.level1.shopPrice,
      soldOut: this.run.shopPurchased,
      purchaseInFlight: this.shopState === "purchased",
    });
    if (!res.ok) {
      this.overlays.toast("金币不够，还差 10 枚。", "danger", BALANCE.flow.insufficientToastDuration * 1000);
      this.audio.playSfx("sfx.warning");
      return;
    }
    this.run.coins = res.coins;
    this.run.shopPurchased = true;
    this.run.shopAvailable = false;
    this.shopState = "purchased";
    this.shopPanel.setBought();
    this.audio.playSfx("sfx.purchase");
    this.events.emit("game:shop-purchased", {
      shopId: shop.id,
      itemId: "bullet_gun",
      price: BALANCE.level1.shopPrice,
    });
    this.events.emit("game:coin-changed", { coins: this.run.coins, delta: -BALANCE.level1.shopPrice, reason: "purchase" });
    // 显式标记「第一关尚未结算」，用于 5.3s~6.0s 窗口刷新时回 R4 补播而不是误判已通关
    this.run.npcFlags["l1_cleared"] = false;
    this.persistNow();
    window.setTimeout(() => this.startGunCutscene(), 220);
  }

  private closeShop(): void {
    if (this.fsm.state !== "Shop") return;
    this.shopState = "idle";
    this.shopPanel.close();
    this.shopCooldownUntil = performance.now() + BALANCE.flow.shopExitCooldown * 1000;
    this.audio.duckBgm(1, 200);
    this.fsm.closeOverlay("Playing");
  }

  // ============================================================
  // 过场
  // ============================================================

  /** 过场视觉状态复位；playerAnchorX 用当前玩家位置（潮冲向他、枪抛回他手里）。 */
  private resetCutsceneVisual(): void {
    const anchorX = clamp(this.run.player.x, 40, 920);
    this.cutsceneVisual = emptyCutsceneVisual(anchorX);
  }

  private startGunCutscene(): void {
    const def = CONTENT.cutscenes["l1_gun_gag"];
    if (!def) return;
    this.shopPanel.close();
    if (!this.fsm.goState("Cutscene")) return;
    this.cutscenePost = "level1-clear";
    this.resetCutsceneVisual();
    // docs/20 §2.5：过场期间激光全熄、读条清零、玩家无敌
    this.laserBoss?.reset();
    this.run.exposure = 0;
    this.run.exposureWarned = false;
    this.run.player.invuln = 99;
    this.audio.duckBgm(0.35, 200);
    this.audio.playSfx("sfx.phase");
    this.events.emit("game:cutscene-start", { cutsceneId: def.id });
    this.overlays.setVignette(false);
    this.hud.setVisible(false);
    this.overlays.showCutsceneSkip(() => this.cutscene.skip());
    this.cutscene.start(def, {
      onStep: (step) => this.onCutsceneStep(step),
      onEnd: (skipped) => {
        this.overlays.hideCutsceneSkip();
        this.endCutscene(skipped, "level1");
      },
    });
  }

  private startGiantCutscene(): void {
    const def = CONTENT.cutscenes["l2_giant"];
    if (!def || !this.arenaBoss) return;
    if (!this.fsm.goState("Cutscene")) return;
    this.cutscenePost = "resume";
    this.resetCutsceneVisual();
    // 巨大化状态在 giantGrow 步骤（1.2s）才生效：避免讲台提前碎、HUD 提前锁
    this.audio.playSfx("sfx.phase");
    this.audio.duckBgm(0.35, 200);
    this.events.emit("game:cutscene-start", { cutsceneId: def.id });
    this.overlays.showCutsceneSkip(() => this.cutscene.skip());
    this.cutscene.start(def, {
      onStep: (step) => this.onCutsceneStep(step),
      onEnd: (skipped) => {
        this.overlays.hideCutsceneSkip();
        this.endGiantCutscene(skipped);
      },
    });
  }

  private startShoeVictory(): void {
    const def = CONTENT.cutscenes["l2_shoe"];
    if (!def || !this.arenaBoss) return;
    if (this.run.victory) return;
    if (this.fsm.state !== "Playing") return;
    this.run.victory = true;
    this.run.player.invuln = 99;
    if (!this.fsm.goState("Cutscene")) return;
    this.cutscenePost = "level2-clear";
    this.resetCutsceneVisual();
    this.events.emit("game:boss-defeated", { bossId: "boss2", method: "shoe" });
    this.audio.duckBgm(0.35, 200);
    this.overlays.showCutsceneSkip(() => this.cutscene.skip());
    this.cutscene.start(def, {
      onStep: (step) => this.onCutsceneStep(step),
      onEnd: (skipped) => {
        this.overlays.hideCutsceneSkip();
        this.endShoeCutscene(skipped);
      },
    });
  }

  private onCutsceneStep(step: { action: string; params?: Record<string, unknown>; target?: string; durationMs?: number }): void {
    const params = step.params ?? {};
    switch (step.action) {
      case "bubble": {
        const text = String(params["text"] ?? "");
        this.overlays.showWorldBubble(text, step.target === "boss2" ? 816 : 480, step.target === "boss2" ? 220 : 210, step.durationMs ?? 2000);
        this.audio.playSfx("sfx.dialogue");
        break;
      }
      case "enterChao": {
        const v = this.cutsceneVisual;
        v.chao = true;
        v.chaoFromX = 1010;
        v.chaoX = v.chaoFromX;
        v.chaoTargetX = Math.min(906, v.playerAnchorX + 52);
        v.chaoStart = this.cutscene.elapsed;
        v.chaoMs = step.durationMs ?? 400;
        v.shotFrom = { x: v.chaoTargetX - 16, y: 512 - 58 };
        this.audio.playSfx("sfx.purchase");
        break;
      }
      case "gunshot": {
        const v = this.cutsceneVisual;
        v.gunOut = true;
        v.shotAt = this.cutscene.elapsed;
        v.shotMs = step.durationMs ?? 300;
        v.shotFrom = { x: v.chaoX - 16, y: 512 - 58 };
        v.shotTo = { x: 480, y: 120 };
        this.audio.playSfx("sfx.gunshot");
        this.overlays.flash("white", 0.9, 120);
        this.screenShake(6);
        break;
      }
      case "bossDie": {
        const v = this.cutsceneVisual;
        v.bossDead = true;
        v.gunOut = false;
        v.fallAt = this.cutscene.elapsed;
        v.fallMs = step.durationMs ?? 1500;
        v.chaoReturnFromX = v.chaoX;
        v.chaoReturnToX = 520;
        v.chaoReturnAt = this.cutscene.elapsed + 150;
        v.chaoReturnMs = 700;
        this.run.bossDefeated = true;
        if (this.cutscene.id === "l1_gun_gag") {
          this.events.emit("game:boss-defeated", { bossId: "xiaochang", method: "chao" });
        }
        this.screenShake(6);
        this.audio.playSfx("sfx.land");
        break;
      }
      case "throwGun": {
        const v = this.cutsceneVisual;
        v.gunOut = true;
        v.tossAt = this.cutscene.elapsed;
        v.tossMs = step.durationMs ?? 500;
        v.tossFrom = { x: v.chaoX - 18, y: 512 - 56 };
        v.tossTo = { x: v.playerAnchorX, y: 512 - 48 };
        this.audio.playSfx("sfx.purchase");
        break;
      }
      case "grantItem": {
        const itemId = String(params["itemId"] ?? "bullet_gun");
        if (addItem(this.run, itemId)) {
          this.events.emit("game:item-acquired", { itemId, displayName: "子弹枪（潮的馈赠）" });
          this.audio.playSfx("sfx.purchase");
          this.overlays.toast("获得 · 子弹枪（潮的馈赠）", "success", 2200);
          markSeenCutscene(this.run, "l1_gun_gag");
          addMeme(this.run, "da_si_ren");
          this.cutsceneVisual.gunOut = false;
          this.persistNow();
        }
        break;
      }
      case "giantGrow":
        if (this.arenaBoss) {
          this.arenaBoss.beginGiant();
          this.events.emit("game:boss-phase", { bossId: "boss2", phase: "p2_giant", hp: 40 });
        }
        this.run.giant = true;
        this.solidRects = this.buildSolids(this.room!);
        this.overlays.flash("white", 0.9, 120);
        this.screenShake(8);
        break;
      case "victory":
        this.overlays.flash("white", 0.6, 150);
        this.screenShake(4);
        break;
      case "shake":
        this.screenShake(Number(params["amp"] ?? 4));
        break;
      case "flash":
        this.overlays.flash(params["color"] === "black" ? "white" : "white", 0.5, 120);
        break;
      case "sfx":
        this.audio.playSfx(String(params["id"] ?? "sfx.dialogue"));
        break;
      case "text":
        this.cutsceneVisual.text = String(params["text"] ?? "");
        this.overlays.toast(this.cutsceneVisual.text ?? "", "success", 1400);
        break;
    }
  }

  private updateCutscene(dt: number): void {
    this.cutscene.update(dt);
    const v = this.cutsceneVisual;
    const t = this.cutscene.elapsed;
    if (v.chao && v.chaoStart >= 0) {
      const p = clamp((t - v.chaoStart) / Math.max(1, v.chaoMs), 0, 1);
      v.chaoX = lerp(v.chaoFromX, v.chaoTargetX, easeOutCubic(p));
      if (v.chaoReturnAt >= 0 && t >= v.chaoReturnAt) {
        const rp = clamp((t - v.chaoReturnAt) / Math.max(1, v.chaoReturnMs), 0, 1);
        v.chaoX = lerp(v.chaoReturnFromX, v.chaoReturnToX, easeInOutQuad(rp));
      }
    }
    if (this.input.pressed("confirm") || this.input.pressed("skip")) {
      this.cutscene.skip();
    }
    this.updateFx(dt);
  }

  private endCutscene(skipped: boolean, level: "level1"): void {
    this.overlays.hideWorldBubble();
    this.audio.duckBgm(1, 200);
    this.events.emit("game:cutscene-end", { cutsceneId: "l1_gun_gag", skipped });
    this.markLevelComplete(level);
  }

  private endGiantCutscene(skipped: boolean): void {
    this.overlays.hideWorldBubble();
    this.audio.duckBgm(1, 200);
    this.events.emit("game:cutscene-end", { cutsceneId: "l2_giant", skipped });
    this.run.giantCutsceneDone = true;
    this.run.checkpoint = snapshotCheckpoint(this.run, "cp2", {
      hp: Math.max(BALANCE.level2.cp2HpFloor, this.run.hp),
      coins: Math.max(BALANCE.level2.cp2CoinsFloor, this.run.coins),
      bossHp: 40,
      bossPhase: "p2_giant",
      x: BALANCE.level2.playerSpawnX,
      y: BALANCE.level2.playerSpawnY,
    });
    // 转阶段瞬间若玩家已在鞋判定框内：软推到 x=560，避免瞬赢（docs/21 §6）
    const shoe = this.arenaBoss?.shoeHitbox;
    if (shoe) {
      const body = playerRect(this.run.player.x, this.run.player.y, BALANCE.player.w, BALANCE.player.h);
      if (rectsOverlap(body, shoe)) {
        this.run.player.x = 560;
        this.run.player.y = 512;
        this.run.player.vx = 0;
        this.run.player.vy = 0;
      }
    }
    this.run.victory = false;
    this.run.shoeActiveAt = this.clock + BALANCE.level2.shoeActivateDelay;
    this.audio.playSfx("sfx.phase");
    this.persistNow();
    if (!this.fsm.goState("Playing")) return;
    this.hud.setVisible(true);
    this.touch.setActive(true);
  }

  private endShoeCutscene(skipped: boolean): void {
    this.overlays.hideWorldBubble();
    this.audio.duckBgm(1, 200);
    this.events.emit("game:cutscene-end", { cutsceneId: "l2_shoe", skipped });
    this.markLevelComplete("level2");
  }

  private markLevelComplete(level: "level1" | "level2"): void {
    if (level === "level1") {
      this.run.clears.level1 = (this.run.clears.level1 ?? 0) + 1;
      markSeenCutscene(this.run, "l1_gun_gag");
      this.run.bossDefeated = true;
      this.run.npcFlags["l1_cleared"] = true;
      this.save.progress.unlockedLevel = 2;
      this.persistNow();
      this.events.emit("game:level-complete", {
        levelId: "level1",
        timeMs: Math.round(this.run.runElapsed * 1000),
        deaths: this.run.deaths,
        coins: this.run.coins,
      });
      if (!this.fsm.goState("LevelClear")) return;
      this.overlays.showClear(
        {
          title: "第一关 · 通关",
          timeMs: this.run.runElapsed * 1000,
          coins: this.run.coins,
          deaths: this.run.deaths,
          memes: this.run.memes.length,
          isLastLevel: false,
        },
        {
          onContinue: () => this.advanceToLevel2(),
          onTitle: () => this.goTitle(),
        },
      );
      this.audio.fadeOutBgm(700);
    } else {
      this.run.clears.level2 = (this.run.clears.level2 ?? 0) + 1;
      this.save.progress.unlockedLevel = 2;
      this.persistNow();
      this.events.emit("game:level-complete", {
        levelId: "level2",
        timeMs: Math.round(this.run.runElapsed * 1000),
        deaths: this.run.deaths,
        coins: this.run.coins,
      });
      if (!this.fsm.goState("LevelClear")) return;
      this.showToBeContinued();
    }
  }

  private showToBeContinued(): void {
    if (!this.fsm.goState("ToBeContinued")) return;
    this.overlays.showTbc(
      `死亡 ${this.run.deaths} 次 · 用时 ${formatTime(this.run.runElapsed * 1000)}`,
      { onTitle: () => this.goTitle() },
    );
    this.audio.fadeOutBgm(1000);
  }

  private advanceToLevel2(): void {
    this.overlays.hideClear();
    this.run = createRuntime(this.save);
    this.startLevel("level2", { grantStipend: true, roomIndex: 0 });
  }

  // ============================================================
  // 暂停 / 失败 / 重试
  // ============================================================

  private handlePauseButton(): void {
    if (this.fsm.state === "Playing") this.pauseGame();
    else if (this.fsm.state === "Paused") this.resumeGame();
  }

  private pauseGame(): void {
    if (this.fsm.state !== "Playing") return;
    if (!this.fsm.goState("Paused")) return;
    this.audio.duckBgm(0.35, 200);
    this.touch.setPaused(true);
    this.overlays.showPause(
      { levelId: this.level.id, coins: this.run.coins, deaths: this.run.deaths },
      {
        onResume: () => this.resumeGame(),
        onRetryRoom: () =>
          this.overlays.confirm({
            title: "重开本房间？",
            body: "本关进度会丢失。",
            confirmLabel: "重开",
            onConfirm: () => this.manualRetryRoom(),
          }),
        onSettings: () => this.openSettings("pause"),
        onTitle: () =>
          this.overlays.confirm({
            title: "返回标题？",
            body: "当前进度会保存。",
            confirmLabel: "返回",
            onConfirm: () => {
              this.persistNow();
              this.goTitle();
            },
          }),
      },
    );
    this.persistSoon();
  }

  private resumeGame(): void {
    if (this.fsm.state !== "Paused") return;
    this.overlays.hidePause();
    this.overlays.hideSettings();
    this.audio.duckBgm(1, 200);
    this.touch.setPaused(false);
    this.fsm.goState("Playing");
  }

  private handlePausedInput(): void {
    if (this.settingsContext) {
      if (this.input.pressed("pause")) this.closeSettings();
      return;
    }
    if (this.input.pressed("pause")) this.resumeGame();
  }

  private manualRetryRoom(): void {
    this.overlays.hidePause();
    this.retryFromCheckpoint(true);
  }

  private fail(reason: "gaze" | "hp" | "coins" | "pit"): void {
    if (this.fsm.state === "Fail" || this.fsm.state === "LevelClear") return;
    if (this.cutscene.isOpen) {
      this.cutscene.abort();
      this.overlays.hideWorldBubble();
      this.overlays.hideCutsceneSkip();
    }
    this.run.victory = false;
    this.run.failReason = reason;
    this.run.deaths += 1;
    this.run.player.frozen = true;
    this.audio.playSfx("sfx.fail");
    this.overlays.flash("red", 0.2, 160);
    this.events.emit("game:player-died", { reason });
    this.events.emit("game:fail", { levelId: this.level.id, reason });
    this.persistNow();
    if (!this.fsm.goState("Fail")) return;
    this.touch.setActive(false);
    this.touch.setPaused(true);
    this.audio.duckBgm(0.35, 200);
    const reasonText =
      reason === "gaze"
        ? BALANCE.fail.gazeText
        : reason === "coins"
          ? BALANCE.fail.coinText
          : reason === "hp"
            ? BALANCE.fail.hpText
            : BALANCE.fail.pitText;
    const hint = this.level.id === "level1" ? "提示：暴露条过半会被抓，离开视线会回落。" : "提示：金币也能续命，别让它们扣光。";
    this.overlays.showFail(
      {
        title: "败了",
        reason: reasonText,
        stats: `本关用时 ${formatTime(this.run.runElapsed * 1000)} · 死亡 ${this.run.deaths} 次`,
        deaths: this.run.deaths,
        hint,
        levelId: this.level.id,
      },
      {
        onRetry: () => this.retryFromCheckpoint(false),
        onTitle: () => this.goTitle(),
      },
    );
  }

  private retryFromCheckpoint(manual: boolean): void {
    if (this.fsm.state === "Fail" || this.fsm.state === "Paused") {
      this.overlays.hideFail();
      this.overlays.hidePause();
    }
    this.cutscene.abort();
    this.overlays.hideWorldBubble();
    this.run.victory = false;
    const isLevel2 = this.level.id === "level2";
    const retryCheckpointId = isLevel2
      ? this.run.checkpoint?.bossPhase === "p2_giant" || this.run.giant
        ? "cp2"
        : "cp1"
      : (this.run.checkpoint?.label ?? `room:${this.run.roomId}`);
    if (isLevel2 && this.run.checkpoint) {
      const cp = this.run.checkpoint;
      applyCheckpoint(this.run, cp);
      this.run.deaths = Math.max(this.run.deaths, 0);
      this.run.giant = cp.bossPhase === "p2_giant";
      this.run.giantCutsceneDone = this.run.giant;
      this.run.bossHp = cp.bossHp;
      this.run.bossPhase = cp.bossPhase;
      this.room = null;
      this.loadRoom("level2", cp.roomIndex, { x: cp.x, y: cp.y });
      if (this.arenaBoss) {
        if (this.run.giant) {
          this.arenaBoss.restoreGiant();
          this.run.shoeActiveAt = this.clock + BALANCE.level2.shoeActivateDelay;
        }
      }
      this.run.player.invuln = BALANCE.level2.retryProtection;
    } else {
      const roomIndex = this.run.roomIndex;
      const cp = this.run.checkpoint;
      const spawn = cp ? { x: cp.x, y: cp.y } : this.room?.spawn ?? { x: 48, y: 512 };
      this.run.player = {
        ...this.run.player,
        x: spawn.x,
        y: spawn.y,
        vx: 0,
        vy: 0,
        onGround: false,
        invuln: 0,
        frozen: false,
        coyote: 0,
        jumpBuffer: 0,
      };
      this.run.exposure = 0;
      this.run.hp = this.run.maxHp;
      this.run.buffs = {};
      this.run.failReason = null;
      if (isLevel2) {
        this.run.bossHp = BALANCE.level2.boss2Hp;
        this.run.bossPhase = "p1";
      }
      this.loadRoom(this.level.id, roomIndex, spawn);
      if (this.level.id === "level2" && this.arenaBoss) this.arenaBoss.reset();
    }
    this.rebuildExposure();
    this.run.player.frozen = false;
    this.overlays.setVignette(false);
    this.dialogueBox.close();
    if (!this.fsm.goState("Playing")) {
      this.fsm.reset();
      this.fsm.goState("Title");
      this.fsm.goState("LevelIntro");
      this.beginPlaying();
    }
    this.audio.playBgm(this.level.id === "level2" ? "bgm.boss2" : this.level.music);
    this.audio.duckBgm(1, 200);
    this.touch.setPaused(false);
    this.touch.setActive(true);
    this.overlays.toast(manual ? "重试本房间" : "再来一次", "info", 1200);
    this.events.emit("game:retry", {
      levelId: this.level.id,
      checkpointId: retryCheckpointId,
    });
    this.persistSoon();
  }

  private rebuildExposure(): void {
    this.run.exposure = 0;
    this.run.exposureWarned = false;
  }

  private handleFailInput(): void {
    if (this.input.pressed("confirm") || this.input.pressed("interact")) {
      this.retryFromCheckpoint(false);
    }
  }

  private handleClearInput(): void {
    if (this.input.pressed("confirm")) {
      if (this.level.id === "level1") this.advanceToLevel2();
      else this.showToBeContinued();
    }
  }

  private handleTbcInput(): void {
    if (this.input.pressed("confirm")) this.goTitle();
  }

  private checkpointCp1(): void {
    this.run.checkpoint = snapshotCheckpoint(this.run, "cp1", {
      hp: BALANCE.level2.playerHp,
      coins: this.run.coins,
      bossHp: BALANCE.level2.boss2Hp,
      bossPhase: "p1",
      x: BALANCE.level2.playerSpawnX,
      y: BALANCE.level2.playerSpawnY,
      roomIndex: 0,
      roomId: "l2-r1",
    });
  }

  // ============================================================
  // 设置
  // ============================================================

  private openAbout(): void {
    this.overlays.showAbout(ABOUT);
  }

  private openSettings(context: SettingsContext): void {    this.settingsContext = context;
    this.overlays.showSettings(
      this.save.settings,
      (next) => {
        this.save.settings = next;
        this.audio.setSettings(next);
        this.overlays.setReduceMotion(next.reduceMotion);
        this.persistNow();
      },
      () => this.closeSettings(),
    );
  }

  private closeSettings(): void {
    this.settingsContext = null;
    this.overlays.hideSettings();
  }

  private onShortcut(code: string): void {
    if (code === "KeyR") {
      if (this.fsm.state === "Fail") this.retryFromCheckpoint(false);
      else if (this.fsm.state === "Paused") this.manualRetryRoom();
    }
    if (code === "KeyF" && this.fsm.state === "Playing") {
      // F 与 E 一样是交互别名，InputSystem 已映射；这里不再处理
    }
  }

  // ============================================================
  // 存档 / 音频 / 触控
  // ============================================================

  private persist(): void {
    this.save = applyRunToSave(this.save, this.run);
    this.saveStore.queue(this.save);
  }

  private persistSoon(): void {
    this.persist();
  }

  private persistNow(): void {
    this.save = applyRunToSave(this.save, this.run);
    this.saveStore.saveNow(this.save);
  }

  /** dev-only 调试桥（main 里挂到 window.__CMI__，生产构建不暴露）。 */
  debugState(): Record<string, unknown> {
    return {
      state: this.fsm.state,
      level: this.level?.id,
      room: this.run.roomId,
      roomIndex: this.run.roomIndex,
      coins: this.run.coins,
      hp: this.run.hp,
      deaths: this.run.deaths,
      bossHp: this.run.bossHp,
      bossPhase: this.run.bossPhase,
      giant: this.run.giant,
      exposure: this.run.exposure,
      shopAvailable: this.run.shopAvailable,
      shopSpawned: this.run.shopSpawned,
      shopPurchased: this.run.shopPurchased,
      items: [...this.run.items],
      memes: [...this.run.memes],
      victory: this.run.victory,
      failReason: this.run.failReason,
      playerX: this.run.player.x,
      playerY: this.run.player.y,
      cutsceneOpen: this.cutscene.isOpen,
      cutsceneElapsed: this.cutscene.elapsed,
      cutsceneId: this.cutscene.id,
      dialogueOpen: this.dialogueRunner.isOpen,
      laser: this.laserBoss
        ? {
            telegraph: this.laserBoss.state.telegraph,
            blink: this.laserBoss.state.blink,
            beams: this.laserBoss.state.beams.map((b) => Math.round(b.aimX)),
            phase: this.laserBoss.state.phaseLabel,
            debug: this.laserBoss.debugInfo,
          }
        : null,
    };
  }

  debugTeleport(x: number, y: number): void {
    this.run.player.x = x;
    this.run.player.y = y;
    this.run.player.vx = 0;
    this.run.player.vy = 0;
  }

  debugSetCoins(coins: number): void {
    this.run.coins = Math.max(0, Math.min(BALANCE.economy.maxCoins, Math.floor(coins)));
    this.persistNow();
  }

  debugSetExposure(value: number): void {
    this.run.exposure = value;
  }

  debugUnlockShop(): void {
    if (this.level.id !== "level1") return;
    this.run.shopTimer = BALANCE.level1.shopUnlockTime;
    this.run.shopAvailable = true;
    this.run.shopSpawned = true;
    this.run.shopSpawnTimer = 0;
    this.applyShopLoan();
  }

  debugGotoRoom(index: number): void {
    const room = this.level.rooms[Math.max(0, Math.min(this.level.rooms.length - 1, index))];
    if (!room) return;
    this.run.roomIndex = this.level.rooms.indexOf(room);
    this.loadRoom(this.level.id, this.run.roomIndex);
    this.events.emit("game:room-enter", { levelId: this.level.id, roomId: room.id, index: this.run.roomIndex });
  }

  debugOpenShop(): void {
    if (this.level.id !== "level1") return;
    if (this.room?.id !== "l1-r4") this.debugGotoRoom(3);
    this.debugUnlockShop();
    this.openShop();
  }

  debugFinishLevel1(): void {
    if (this.level.id !== "level1") return;
    this.run.shopPurchased = true;
    this.startGunCutscene();
  }

  debugSetBossHp(hp: number): void {
    this.run.bossHp = Math.max(0, Math.min(BALANCE.level2.boss2Hp, hp));
    this.arenaBoss?.debugSetHp(this.run.bossHp);
  }

  debugShoeWin(): void {
    if (this.level.id !== "level2") return;
    this.run.giant = true;
    this.arenaBoss?.beginGiant();
    this.arenaBoss?.forceShoeActive();
    this.startShoeVictory();
  }

  debugNextRoom(): void {
    if (!this.room || this.room.exits.length === 0) return;
    const exit = this.room.exits[0]!;
    this.switchRoom(exit.toRoom, exit.spawnAt);
  }

  debugFail(reason: "gaze" | "hp" | "coins" | "pit" = "pit"): void {
    this.fail(reason);
  }

  unlockAudio(): void {
    this.audio.unlock();
  }

  private onVisibility = (): void => {
    if (document.visibilityState === "hidden") {
      this.persistNow();
      if (this.fsm.state === "Playing") {
        this.pausedByVisibility = true;
        this.pauseGame();
      }
    }
  };

  private onWindowBlur = (): void => {
    if (this.fsm.state === "Playing" && !this.touch.hasTouch()) {
      this.pausedByVisibility = true;
      this.pauseGame();
    }
  };

  private addCoin(delta: number, reason: "pickup" | "cheat" | "purchase" | "hit" | "loan"): void {
    const before = this.run.coins;
    const actual = addCoins(this.run, delta);
    this.events.emit("game:coin-changed", { coins: this.run.coins, delta: actual, reason });
    if (actual !== 0) {
      this.spawnFloatText(this.run.player.x, this.run.player.y - 34, `+${actual}`, "gold");
      this.audio.playSfx("sfx.coin");
    }
    void before;
    this.persistSoon();
  }

  /** 震屏统一入口：减少动效时关闭（docs/20 验收：减少动效关震屏）。 */
  private screenShake(amount: number): void {
    if (this.save.settings.reduceMotion) return;
    this.k.shake(amount);
  }

  private updateHud(): void {
    if (!this.level) return;
    this.hud.update(this.run, this.level);
    if (this.level.id === "level2") {
      this.hud.setBoss({
        name: "BOSS",
        hp: this.run.bossHp,
        maxHp: BALANCE.level2.boss2Hp,
        locked: this.run.giant,
      });
    }
    if (this.run.hp !== this.lastFrameHp) this.lastFrameHp = this.run.hp;
    if (this.run.coins !== this.lastFrameCoins) this.lastFrameCoins = this.run.coins;
  }

  private updateTouchVisibility(): void {
    const state = this.fsm.state;
    const active = state === "Playing" || state === "LevelIntro";
    this.touch.setActive(active && this.touch.hasTouch());
    this.touch.setShootVisible(hasItem(this.run, "bullet_gun") && active);
    if (!active) this.touch.setInteractVisible(false);
    this.touch.setPaused(state !== "Playing");
  }

  // ============================================================
  // 渲染
  // ============================================================

  private drawWorld(): void {
    if (!this.room) return;
    const k = this.k;
    const pal = getPalette(k);
    const anim = this.clock;
    drawBackdrop(k, this.room.bg, anim);
    drawPlatforms(k, this.room);
    drawSpikes(k, this.room.hazards.filter((h) => h.type === "spike").map((h) => h.rect));

    // 出口 / 检查点 / 商店 / 挂牌
    if (this.room.exits.length > 0) drawExitBeacon(k, anim);
    if (this.room.checkpoint) {
      const active = Boolean(
        this.run.checkpoint && Math.abs(this.run.checkpoint.x - this.room.checkpoint.x) < 1,
      );
      drawCheckpoint(k, this.room.checkpoint.x, this.room.checkpoint.y, active, anim);
    }
    if (this.room.plaques) for (const p of this.room.plaques) drawPlaque(k, p);
    if (this.level.id === "level1" && this.room.id === "l1-r4") {
      drawShopPedestal(k, BALANCE.level1.hallShopX, BALANCE.level1.hallShopY, anim, this.run.shopSpawned && !this.run.shopPurchased);
    }
    if (this.room.desks && !this.run.giant) {
      for (const d of this.room.desks) drawDesk(k, d, false);
    } else if (this.room.desks && this.run.giant) {
      for (const d of this.room.desks) drawDesk(k, d, true);
    }

    // 金币
    this.room.coins.forEach((c, i) => {
      if (this.run.pickedCoins.includes(`${this.room!.id}:${i}`)) return;
      drawCoin(k, c.x, c.y, anim);
    });
    for (const c of this.dropCoins) drawCoin(k, c.x, c.y, anim);

    // Boss
    if (this.laserBoss) this.drawLaserBoss();
    if (this.arenaBoss) this.drawArenaBoss();

    // NPC
    for (const entry of this.room.npcs) {
      const npc = NPC_BY_ID[entry.npcId];
      if (!npc) continue;
      const near = this.activeNpc?.id === npc.id;
      drawNpc(k, npc.id as NpcArtId, entry.at, {
        animTime: anim,
        hint: near && this.fsm.state === "Playing",
        facing: npc.facing ?? 1,
        talking: near,
      });
    }

    // 玩家
    drawPlayer(k, this.run.player, {
      animTime: anim,
      invuln: this.run.player.invuln > 0,
      holdingGun: hasItem(this.run, "bullet_gun"),
    });

    // 子弹/特效
    for (const b of this.bullets) drawPlayerBullet(k, b.x, b.y);
    this.drawArenaProjectiles();
    drawParticles(k, this.particles);
    for (const f of this.floatTexts) {
      drawFloatText(k, f.x, f.y, f.text, f.color, Math.max(0, f.life / f.maxLife));
    }

    // 过场视觉
    if (this.fsm.state === "Cutscene") this.drawCutsceneOverlay();

    // 受伤闪烁
    if (this.run.player.invuln > 0 && Math.floor(this.clock * 10) % 2 === 0) {
      // 由 drawPlayer 处理透明度，无需额外层
    }
    void pal;
    void text;
  }

  private drawLaserBoss(): void {
    if (!this.laserBoss || !this.room) return;
    const state = this.laserBoss.state;
    const pal = getPalette(this.k);
    const k = this.k;
    const eyes = this.room.eyes ?? [];
    if (this.room.id === "l1-r4") {
      if (this.cutsceneVisual.bossDead) {
        this.drawBossFall(k, pal);
        return;
      }
      drawBoss1(k, eyes, { open: !state.blink, red: state.eyeRed, telegraph: state.telegraph }, this.clock, state.firingEyes);
    } else {
      // R2/R3：漂浮在教学楼里的眼睛（只有本轮“在看”的眼睛变红）
      eyes.forEach((eye, i) => {
        const red = state.eyeRed && state.firingEyes.includes(i);
        if (state.blink) {
          line(k, eye.x - 18, eye.y, eye.x + 18, eye.y, pal.ink, 4);
        } else {
          ellipse(k, eye.x, eye.y, 20, 14, pal.white, { outline: pal.ink, outlineWidth: 2 });
          circle(k, eye.x, eye.y, red ? 6 : 7, red ? pal.laser : pal.hairInk);
          if (red) circle(k, eye.x, eye.y, 24, pal.laser, { fill: false, outline: pal.laser, outlineWidth: 2, opacity: 0.45 });
        }
      });
    }

    // 扇形视线（预警期轮廓，开火后填充 + 核心光束）；眨眼时判定冻结、一并隐藏
    if (state.telegraph && !state.blink) {
      for (const b of this.laserBoss.beams) {
        drawGazeFan(k, {
          eye: b.eye,
          fan: b.fan,
          end: b.end,
          halfAngle: b.halfAngle,
          active: false,
          telegraph: true,
          visualWidth: BALANCE.level1.gazeVisualWidth,
          beamWidth: BALANCE.level1.gazeBeamWidth,
        });
      }
    } else if (!state.blink) {
      for (const b of state.beams) {
        drawGazeFan(k, {
          eye: b.eye,
          fan: b.fan,
          end: b.end,
          halfAngle: b.halfAngle,
          active: true,
          telegraph: false,
          visualWidth: BALANCE.level1.gazeVisualWidth,
          beamWidth: BALANCE.level1.gazeBeamWidth,
        });
      }
    }
  }

  private drawArenaBoss(): void {
    if (!this.arenaBoss) return;
    const state = this.arenaBoss.state;
    drawBoss2(this.k, {
      giant: state.giant,
      animTime: this.clock,
      hurtFlash: 0,
      bubbleNearShoe: false,
    });
    if (state.giant) drawShoe(this.k, 640, 448, 192, 64, true, this.clock);
  }

  private drawArenaProjectiles(): void {
    if (!this.arenaBoss) return;
    const state = this.arenaBoss.state;
    for (const h of state.homing) drawHomingChalk(this.k, h.x, h.y, h.angle);
    for (const c of state.chalk) drawChalkFall(this.k, c.x, c.y);
    for (const s of state.shockwaves) {
      if (s.vx === 0) {
        // 踩踏判定：画阴影/巨足
        drawStompShadow(this.k, s.x + s.w / 2, 448, s.w, s.h, 1);
      } else {
        drawShockwave(this.k, s.x + s.w / 2, s.y + s.h, s.w, s.h);
      }
    }
    for (const b of state.bananas) drawBanana(this.k, b.x + 14, b.y + 7);
    const pal = getPalette(this.k);
    for (const w of state.warnings) {
      if (w.kind === "chalk") {
        drawChalkWarning(this.k, w.x, w.y - 8, this.clock);
      } else if (w.kind === "stomp") {
        drawStompShadow(this.k, w.x, 448, w.w, w.h, 1 - w.timer / Math.max(0.01, w.total));
      } else if (w.kind === "banana") {
        ellipse(this.k, w.x + 14, w.y + 7, 18, 7, pal.expose, {
          fill: false,
          outline: pal.expose,
          outlineWidth: 2,
          opacity: 0.5 + Math.sin(this.clock * 12) * 0.2,
        });
      } else if (w.kind === "shock") {
        rect(this.k, w.x, w.y, w.w, w.h, {
          color: pal.pen,
          opacity: 0.18,
          outline: pal.pen,
          outlineWidth: 2,
          radius: 4,
        });
      } else if (w.kind === "aim") {
        circle(this.k, w.x, w.y, 16 + Math.sin(this.clock * 16) * 3, pal.laser, {
          fill: false,
          outline: pal.laser,
          outlineWidth: 2,
          opacity: 0.85,
        });
      }
    }
    if (state.telegraph && state.attackId === "a1") {
      circle(this.k, 776, 336, 26 + Math.sin(this.clock * 16) * 4, pal.laser, {
        fill: false,
        outline: pal.laser,
        outlineWidth: 2,
        opacity: 0.7,
      });
    }
  }

  private drawCutsceneOverlay(): void {
    const k = this.k;
    const pal = getPalette(k);
    const v = this.cutsceneVisual;
    const t = this.cutscene.elapsed;
    // 上下黑边（0.3s 滑入）
    const bar = BALANCE.cutscene.letterbox * clamp(t / (BALANCE.cutscene.letterboxIn * 1000), 0, 1);
    rect(k, 0, 0, 960, bar, { color: pal.ink });
    rect(k, 0, 540 - bar, 960, bar, { color: pal.ink });

    const reduce = this.save.settings.reduceMotion;
    if (v.chao) {
      const dashing = v.chaoStart >= 0 && t < v.chaoStart + v.chaoMs + 80;
      if (dashing && !reduce) {
        for (let i = 1; i <= 4; i++) {
          const sx = v.chaoX + 20 + i * 18;
          line(k, sx, 300 + i * 26, sx + 44, 300 + i * 26, pal.white, 2, 0.15 - i * 0.02);
        }
        for (let i = 0; i < 3; i++) {
          ellipse(k, v.chaoX - 12 + i * 16, 508, 12, 4, pal.chalk2, { opacity: 0.28 });
        }
      }
      drawNpc(k, "chao", { x: v.chaoX, y: 512 }, {
        animTime: this.clock,
        hint: false,
        facing: -1,
        talking: false,
      });
      const holdingGun =
        v.chaoStart >= 0 &&
        t >= v.chaoStart + v.chaoMs &&
        !v.gunOut &&
        v.tossAt < 0;
      if (holdingGun) {
        drawGun(k, v.chaoX - 18, 512 - 56, 0);
      }
    }

    // 枪响：枪口火光 + 曳光 + 命中闪
    if (v.shotAt >= 0 && t >= v.shotAt && t <= v.shotAt + v.shotMs + 180) {
      const u = clamp((t - v.shotAt) / Math.max(1, v.shotMs), 0, 1);
      const muzzle = { x: v.shotFrom.x, y: v.shotFrom.y };
      if (u <= 0.45) drawMuzzleFlash(k, muzzle.x, muzzle.y, 1 + u, 1 - u / 0.45);
      const reach = Math.min(1, u * 1.7);
      const tip = {
        x: lerp(v.shotFrom.x, v.shotTo.x, reach),
        y: lerp(v.shotFrom.y, v.shotTo.y, reach),
      };
      line(k, v.shotFrom.x, v.shotFrom.y, tip.x, tip.y, pal.schoolGold, 2, 0.85 * (1 - u * 0.45));
      if (u > 0.55) {
        const r = 28 * (1 - (u - 0.55) / 0.45);
        circle(k, v.shotTo.x, v.shotTo.y, Math.max(1, r), pal.white, { opacity: 0.35 });
      }
      drawGun(k, muzzle.x, muzzle.y, Math.atan2(v.shotTo.y - muzzle.y, v.shotTo.x - muzzle.x));
    }

    // 枪抛回：抛物线 + 旋转；落地后留在玩家手里
    if (v.gunOut && v.tossAt >= 0 && t >= v.tossAt) {
      const u = clamp((t - v.tossAt) / Math.max(1, v.tossMs), 0, 1);
      const x = lerp(v.tossFrom.x, v.tossTo.x, u);
      const baseY = lerp(v.tossFrom.y, v.tossTo.y, u);
      const y = baseY - Math.sin(Math.PI * u) * 150;
      drawGun(k, x, y, u * Math.PI * 2);
      if (u > 0.25 && u < 0.9) circle(k, x, y, 12, pal.coin, { opacity: 0.16 });
    }
  }

  /** 笑长倒地：连人带椅向侧面滑倒 + 帽子掉落 + 尘土（过场 1.5s）。 */
  private drawBossFall(k: KAPLAYCtx, pal: ReturnType<typeof getPalette>): void {
    const v = this.cutsceneVisual;
    const t = this.cutscene.elapsed;
    const p = v.fallAt >= 0 ? clamp((t - v.fallAt) / Math.max(1, v.fallMs), 0, 1) : 1;
    const eased = easeOutCubic(p);
    const pivot = { x: 480, y: 500 };
    const angle = -6 - 74 * eased;
    const rad = (angle * Math.PI) / 180;
    const rot = (x: number, y: number): Vec => {
      const dx = x - pivot.x;
      const dy = y - pivot.y;
      return {
        x: pivot.x + dx * Math.cos(rad) - dy * Math.sin(rad),
        y: pivot.y + dx * Math.sin(rad) + dy * Math.cos(rad),
      };
    };
    // 尘土（减少动效时省略）
    if (!this.save.settings.reduceMotion) {
      for (let i = 0; i < 7; i++) {
        ellipse(k, 300 + i * 52, 508 - (i % 2) * 4, 22 + eased * 18, 8, pal.chalk2, {
          opacity: 0.16 + eased * 0.14,
        });
      }
    }
    // 高背椅
    const back = rot(480, 380);
    rect(k, back.x, back.y, 220, 210, {
      color: pal.bossPurple,
      outline: pal.ink,
      radius: 12,
      angle,
      centered: true,
    });
    const seat = rot(480, 490);
    rect(k, seat.x, seat.y, 300, 40, {
      color: pal.emperorRobeDark,
      outline: pal.ink,
      radius: 8,
      angle,
      centered: true,
    });
    // 身体
    const bodyPts = (
      [
        [400, 300],
        [560, 300],
        [540, 470],
        [420, 470],
      ] as [number, number][]
    ).map(([x, y]) => {
      const q = rot(x, y);
      return [q.x, q.y] as [number, number];
    });
    poly(k, bodyPts, pal.bossPurple, { outline: pal.ink, outlineWidth: 2 });
    // 头 + X 眼
    const head = rot(480, 120);
    circle(k, head.x, head.y, 62, pal.skin, { outline: pal.ink, outlineWidth: 3 });
    circle(k, head.x - 22, head.y + 6, 12, pal.white, { outline: pal.ink, outlineWidth: 2 });
    circle(k, head.x + 22, head.y + 6, 12, pal.white, { outline: pal.ink, outlineWidth: 2 });
    line(k, head.x - 28, head.y, head.x - 16, head.y + 12, pal.ink, 3);
    line(k, head.x - 16, head.y, head.x - 28, head.y + 12, pal.ink, 3);
    line(k, head.x + 16, head.y, head.x + 28, head.y + 12, pal.ink, 3);
    line(k, head.x + 28, head.y, head.x + 16, head.y + 12, pal.ink, 3);
    // 礼帽掉落
    const hatX = 480 + 150 * eased;
    const hatY = lerp(70, 500, Math.min(1, eased * 1.35));
    ellipse(k, hatX, hatY, 40, 9, pal.hairInk, { outline: pal.ink, outlineWidth: 2 });
    circle(k, hatX, hatY - 8, 18, pal.hairInk, { outline: pal.ink, outlineWidth: 2 });
    // 晕眩星星（减少动效时省略）
    if (p > 0.65 && !this.save.settings.reduceMotion) {
      for (let i = 0; i < 3; i++) {
        const a = this.clock * 2 + i * 2.1;
        circle(k, head.x + Math.cos(a) * 70, head.y - 60 + Math.sin(a) * 16, 3, pal.schoolGold, {
          opacity: 0.8,
        });
      }
    }
  }

  private spawnParticles(x: number, y: number, color: Particle["color"], count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.4,
        maxLife: 0.4,
        size: 2 + Math.random() * 2,
        color,
      });
    }
  }

  private spawnFloatText(x: number, y: number, text: string, color: FloatText["color"]): void {
    this.floatTexts.push({ x, y, text, color, life: 0.8, maxLife: 0.8 });
    if (this.floatTexts.length > 6) this.floatTexts.shift();
  }

  private updateFx(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const f = this.floatTexts[i]!;
      f.life -= dt;
      f.y -= 28 * dt;
      if (f.life <= 0) this.floatTexts.splice(i, 1);
    }
  }

  // ============================================================
  // 适配
  // ============================================================

  private onResize = (): void => {
    window.setTimeout(() => {
      this.overlays.updateWorldRect(this.canvas);
      this.checkOrientation();
    }, 150);
  };

  private checkOrientation(): void {
    if (typeof window === "undefined") return;
    const isTouch = this.touch.hasTouch();
    const portrait = window.innerHeight > window.innerWidth;
    if (isTouch && portrait && !this.orientationDismissed) {
      this.portraitHint.classList.remove("hidden");
      if (this.fsm.state === "Playing") {
        this.pausedByOrientation = true;
        this.pauseGame();
      }
    } else {
      this.portraitHint.classList.add("hidden");
      if (this.pausedByOrientation && !portrait) {
        this.pausedByOrientation = false;
        this.resumeGame();
      }
    }
  }

  private requestFullscreen(silent: boolean): void {
    try {
      const el = document.documentElement;
      const anyEl = el as unknown as { webkitRequestFullscreen?: () => Promise<void> | void };
      const req = el.requestFullscreen?.bind(el) ?? anyEl.webkitRequestFullscreen?.bind(el);
      if (!req) {
        if (!silent) this.overlays.toast("当前浏览器不支持全屏", "danger", 1600);
        return;
      }
      const result = req() as Promise<void> | void;
      const lock = (): void => {
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (o: string) => Promise<void>;
        };
        orientation.lock?.("landscape").catch(() => undefined);
      };
      if (result && typeof (result as Promise<void>).then === "function") {
        (result as Promise<void>).then(lock).catch(() => {
          if (!silent) this.overlays.toast("当前浏览器不支持全屏", "danger", 1600);
        });
      } else {
        lock();
      }
    } catch {
      if (!silent) this.overlays.toast("当前浏览器不支持全屏", "danger", 1600);
    }
  }

  private enterFullscreen(): void {
    this.requestFullscreen(false);
  }
}
