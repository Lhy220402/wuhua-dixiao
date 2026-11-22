import { BALANCE } from "../config/balance";
import { defaultSave, type SaveV1 } from "./schema";
import { parseSave, serializeSave, type SaveParseStatus } from "./serialize";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

export interface LoadOutcome {
  save: SaveV1;
  status: SaveParseStatus;
  readOnly: boolean;
  persistent: boolean;
  toast?: string;
  backupCreated: boolean;
}

export class SaveStore {
  readonly key = BALANCE.save.key;
  readonly backupKey = BALANCE.save.backupKey;
  readonly badKey = BALANCE.save.badKey;

  private storage: StorageLike;
  private persistent: boolean;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: SaveV1 | null = null;
  private readOnly = false;
  private lastRaw: string | null = null;

  constructor(storage?: StorageLike | null) {
    if (storage !== undefined) {
      this.storage = storage ?? new MemoryStorage();
      this.persistent = storage !== null;
    } else {
      const browser = tryBrowserStorage();
      this.storage = browser ?? new MemoryStorage();
      this.persistent = browser !== null;
    }
  }

  get isPersistent(): boolean {
    return this.persistent;
  }

  load(): LoadOutcome {
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      this.persistent = false;
      this.storage = new MemoryStorage();
      return {
        save: defaultSave(),
        status: "empty",
        readOnly: false,
        persistent: false,
        toast: "本次进度不会保存",
        backupCreated: false,
      };
    }

    this.lastRaw = raw;
    const parsed = parseSave(raw);
    this.readOnly = parsed.readOnly;

    if (parsed.status === "corrupt") {
      this.safeSet(this.badKey, raw ?? "");
      this.safeRemove(this.key);
      return {
        save: parsed.save,
        status: "corrupt",
        readOnly: false,
        persistent: this.persistent,
        toast: "存档损坏，已重新开始",
        backupCreated: true,
      };
    }

    if (parsed.status === "version") {
      this.safeSet(this.backupKey, raw ?? "");
      return {
        save: parsed.save,
        status: "version",
        readOnly: parsed.readOnly,
        persistent: this.persistent,
        toast: parsed.readOnly ? "存档来自更新版本，本次可能不会保存" : undefined,
        backupCreated: true,
      };
    }

    return {
      save: parsed.save,
      status: parsed.status,
      readOnly: false,
      persistent: this.persistent,
      backupCreated: false,
    };
  }

  /** 立即写盘（写前轮换 .bak）。 */
  saveNow(save: SaveV1): boolean {
    if (this.readOnly) return false;
    const next: SaveV1 = { ...save, updatedAt: new Date().toISOString() };
    const text = serializeSave(next);
    try {
      if (this.lastRaw !== null) this.storage.setItem(this.backupKey, this.lastRaw);
      this.storage.setItem(this.key, text);
      this.lastRaw = text;
      return true;
    } catch {
      // 配额/隐私模式：降级到内存，不影响本次游玩。
      this.persistent = false;
      this.storage = new MemoryStorage();
      try {
        this.storage.setItem(this.key, text);
      } catch {
        /* ignore */
      }
      return false;
    }
  }

  /** 防抖写盘（房间切换 / 金币变化 / 设置变更走这里）。 */
  queue(save: SaveV1): void {
    if (this.readOnly) return;
    this.pending = save;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, BALANCE.save.debounceMs);
  }

  flush(): boolean {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (!this.pending) return true;
    const save = this.pending;
    this.pending = null;
    return this.saveNow(save);
  }

  clear(): void {
    this.safeRemove(this.key);
    this.lastRaw = null;
  }

  private safeSet(key: string, value: string): void {
    try {
      this.storage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }

  private safeRemove(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

function tryBrowserStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const probe = "__cmi_storage_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}
