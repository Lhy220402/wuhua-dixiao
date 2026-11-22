import { BALANCE } from "../config/balance";
import { CONTENT } from "../content";
import type { AudioDef } from "../content/types";
import type { SaveSettings } from "../save/schema";

type AudioKind = "sfx" | "bgm";

interface LoadedAudio {
  el: HTMLAudioElement;
  def: AudioDef;
  kind: AudioKind;
  ready: boolean;
  failed: boolean;
  lastPlayedAt: number;
}

const FALLBACK_EXTENSIONS = ["ogg", "mp3", "m4a"] as const;

/**
 * 音频总则（docs/31 §2.6）：
 * - 逻辑 ID → public/audio/<name>.ogg，缺失静默 + 每个 ID 只 warn 一次；
 * - 首次手势后播放；缺失不阻塞任何流程；
 * - sfx.fail 支持 ogg → mp3 → m4a 兜底。
 */
export class AudioManager {
  private settings: SaveSettings;
  private entries = new Map<string, LoadedAudio>();
  private warned = new Set<string>();
  private unlocked = false;
  private bgmId: string | null = null;
  private bgmEl: HTMLAudioElement | null = null;
  private duck = 1;
  private duckTarget = 1;
  private master = 1;
  private pendingBgm: string | null = null;
  private lastSfxAt = 0;
  private playingSfx = new Set<HTMLAudioElement>();

  constructor(settings: SaveSettings) {
    this.settings = settings;
    this.master = settings.masterVolume;
  }

  setSettings(settings: SaveSettings): void {
    this.settings = settings;
    this.master = settings.masterVolume;
    this.applyBgmVolume();
  }

  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.pendingBgm) {
      const id = this.pendingBgm;
      this.pendingBgm = null;
      this.playBgm(id);
    }
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  get missingIds(): readonly string[] {
    return Array.from(this.warned);
  }

  playSfx(id: string): void {
    if (this.settings.sfxVolume <= 0 || this.master <= 0) return;
    const now = performance.now();
    if (now - this.lastSfxAt < BALANCE.audio.dedupeMs && this.lastSfxAt > 0) {
      // 同 ID 80ms 内合并（简化为全局节流，防爆音）
      const recent = this.entries.get(id);
      if (recent && now - recent.lastPlayedAt < BALANCE.audio.dedupeMs) return;
    }
    this.lastSfxAt = now;
    const entry = this.getOrLoad(id, "sfx");
    if (!entry || entry.failed) return;
    if (this.playingSfx.size >= BALANCE.audio.maxSfx) {
      const oldest = this.playingSfx.values().next().value as HTMLAudioElement | undefined;
      if (oldest) {
        oldest.pause();
        this.playingSfx.delete(oldest);
      }
    }
    const el = entry.el;
    try {
      el.currentTime = 0;
    } catch {
      /* ignore */
    }
    el.volume = this.sfxVolume(entry.def);
    entry.lastPlayedAt = now;
    this.playingSfx.add(el);
    const p = el.play();
    if (p) {
      p.catch(() => {
        // 自动播放被拦截 / 文件尚未就绪：不报错、不阻塞。
        this.playingSfx.delete(el);
      });
    }
    el.onended = () => this.playingSfx.delete(el);
  }

  playBgm(id: string): void {
    if (this.bgmId === id && this.bgmEl && !this.bgmEl.paused) return;
    this.bgmId = id;
    if (!this.unlocked) {
      this.pendingBgm = id;
      return;
    }
    const entry = this.getOrLoad(id, "bgm");
    if (!entry || entry.failed) {
      this.bgmEl = null;
      return;
    }
    if (this.bgmEl && this.bgmEl !== entry.el) {
      this.bgmEl.pause();
    }
    this.bgmEl = entry.el;
    this.bgmEl.loop = true;
    this.bgmEl.currentTime = 0;
    this.applyBgmVolume();
    const p = this.bgmEl.play();
    if (p) p.catch(() => undefined);
  }

  stopBgm(): void {
    this.bgmId = null;
    this.pendingBgm = null;
    if (this.bgmEl) {
      this.bgmEl.pause();
      this.bgmEl = null;
    }
  }

  fadeOutBgm(ms: number): void {
    const el = this.bgmEl;
    if (!el) return;
    const start = performance.now();
    const step = () => {
      if (!this.bgmEl) return;
      const t = Math.min(1, (performance.now() - start) / Math.max(1, ms));
      el.volume = this.bgmVolume(BALANCE.audio.musicVolume) * (1 - t);
      if (t < 1) requestAnimationFrame(step);
      else {
        el.pause();
        this.bgmEl = null;
        this.bgmId = null;
      }
    };
    step();
  }

  duckBgm(factor: number, ms: number): void {
    this.duckTarget = factor;
    this.applyBgmVolume();
    if (ms > 0) {
      window.setTimeout(() => {
        this.duckTarget = 1;
        this.applyBgmVolume();
      }, ms);
    }
  }

  update(dt: number): void {
    const target = this.duckTarget;
    const rate = dt / Math.max(0.001, BALANCE.audio.duckAttack);
    if (this.duck < target) this.duck = Math.min(target, this.duck + rate);
    else if (this.duck > target) this.duck = Math.max(target, this.duck - rate);
    this.applyBgmVolume();
  }

  private sfxVolume(def: AudioDef): number {
    return Math.max(0, Math.min(1, this.master * this.settings.sfxVolume * def.volume));
  }

  private bgmVolume(extra = 1): number {
    return Math.max(
      0,
      Math.min(1, this.master * this.settings.musicVolume * this.duck * extra),
    );
  }

  private applyBgmVolume(): void {
    if (!this.bgmEl) return;
    this.bgmEl.volume = this.bgmVolume();
  }

  private getOrLoad(id: string, kind: AudioKind): LoadedAudio | null {
    const existing = this.entries.get(id);
    if (existing) return existing;
    const def = CONTENT.audio[id];
    if (!def) {
      this.warnMissing(id, "未在 audio-manifest 注册");
      return null;
    }
    const el = typeof Audio !== "undefined" ? new Audio() : null;
    if (!el) {
      this.warnMissing(id, "当前环境不支持 Audio");
      return null;
    }
    const entry: LoadedAudio = { el, def, kind, ready: false, failed: false, lastPlayedAt: 0 };
    this.entries.set(id, entry);
    this.attachSource(entry, id, def, 0);
    return entry;
  }

  private attachSource(entry: LoadedAudio, id: string, def: AudioDef, extIndex: number): void {
    const ext = FALLBACK_EXTENSIONS[extIndex];
    if (!ext) {
      entry.failed = true;
      this.warnMissing(id, def.src);
      return;
    }
    const base = import.meta.env.BASE_URL ?? "./";
    const rel = def.src.replace(/\.ogg$/, `.${ext}`);
    const url = new URL(`${base}${rel}`, window.location.href).toString();
    entry.el.src = url;
    entry.el.preload = "auto";
    entry.el.volume = entry.kind === "bgm" ? this.bgmVolume() : this.sfxVolume(def);
    const onError = () => {
      entry.el.removeEventListener("error", onError);
      if (extIndex + 1 < FALLBACK_EXTENSIONS.length) {
        this.attachSource(entry, id, def, extIndex + 1);
      } else {
        entry.failed = true;
        this.warnMissing(id, def.src);
      }
    };
    const onReady = () => {
      entry.ready = true;
      entry.el.removeEventListener("canplaythrough", onReady);
    };
    entry.el.addEventListener("error", onError);
    entry.el.addEventListener("canplaythrough", onReady);
  }

  private warnMissing(id: string, detail: string): void {
    if (this.warned.has(id)) return;
    this.warned.add(id);
    console.warn(`[audio] missing ${id} → ${detail}（静默）`);
  }
}
