import { BALANCE } from "../config/balance";

export type ControlScheme = "auto" | "touch" | "keyboard";

export interface SaveSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  reduceMotion: boolean;
  showSubtitles: boolean;
  controlScheme: ControlScheme;
}

export interface SaveItem {
  itemId: string;
  count: number;
}

export interface SaveProgress {
  unlockedLevel: 1 | 2;
  currentLevel: 1 | 2;
  currentRoom?: number;
  coins: number;
  maxHp: number;
  items: SaveItem[];
  seenCutscenes: string[];
  shopPurchased: boolean;
  npcFlags: Record<string, boolean>;
  memes: string[];
}

export interface SaveStats {
  deaths: number;
  clears: { level1?: number; level2?: number };
  playSeconds: number;
}

export interface SaveV1 {
  version: 1;
  settings: SaveSettings;
  progress: SaveProgress;
  stats: SaveStats;
  updatedAt: string;
}

export const CURRENT_VERSION = BALANCE.save.version as 1;

export const DEFAULT_SETTINGS: SaveSettings = {
  masterVolume: BALANCE.settings.masterVolume,
  musicVolume: BALANCE.settings.musicVolume,
  sfxVolume: BALANCE.settings.sfxVolume,
  reduceMotion: BALANCE.settings.reduceMotion,
  showSubtitles: BALANCE.settings.showSubtitles,
  controlScheme: BALANCE.settings.controlScheme,
};

export function defaultSave(now: Date = new Date()): SaveV1 {
  return {
    version: CURRENT_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    progress: {
      unlockedLevel: 1,
      currentLevel: 1,
      coins: 0,
      maxHp: BALANCE.level2.playerHp,
      items: [],
      seenCutscenes: [],
      shopPurchased: false,
      npcFlags: {},
      memes: [],
    },
    stats: {
      deaths: 0,
      clears: {},
      playSeconds: 0,
    },
    updatedAt: now.toISOString(),
  };
}

export function emptySave(): SaveV1 {
  return defaultSave(new Date(0));
}
