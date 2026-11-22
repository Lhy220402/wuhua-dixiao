import { BALANCE } from "../config/balance";
import { clamp } from "../core/types";
import {
  CURRENT_VERSION,
  DEFAULT_SETTINGS,
  defaultSave,
  type ControlScheme,
  type SaveItem,
  type SaveSettings,
  type SaveStats,
  type SaveV1,
} from "./schema";

export type SaveParseStatus = "ok" | "empty" | "corrupt" | "version";

export interface SaveParseResult {
  save: SaveV1;
  status: SaveParseStatus;
  readOnly: boolean;
  raw: string | null;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const asNumber = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const asBool = (v: unknown, fallback: boolean): boolean =>
  typeof v === "boolean" ? v : fallback;

const asString = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const asLevel = (v: unknown, fallback: 1 | 2): 1 | 2 => (v === 2 ? 2 : v === 1 ? 1 : fallback);

const asScheme = (v: unknown): ControlScheme =>
  v === "touch" || v === "keyboard" || v === "auto" ? v : "auto";

function normalizeItems(v: unknown): SaveItem[] {
  if (!Array.isArray(v)) return [];
  const out: SaveItem[] = [];
  const seen = new Set<string>();
  for (const row of v) {
    if (!isRecord(row)) continue;
    const itemId = asString(row["itemId"]);
    if (!itemId || seen.has(itemId)) continue;
    seen.add(itemId);
    out.push({ itemId, count: Math.max(1, Math.floor(asNumber(row["count"], 1))) });
  }
  return out;
}

function normalizeNpcFlags(v: unknown): Record<string, boolean> {
  if (!isRecord(v)) return {};
  const out: Record<string, boolean> = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === "boolean") out[k] = val;
  }
  return out;
}

function normalizeClears(v: unknown): SaveStats["clears"] {
  if (!isRecord(v)) return {};
  const out: SaveStats["clears"] = {};
  if (typeof v["level1"] === "number") out.level1 = Math.max(0, Math.floor(v["level1"]));
  if (typeof v["level2"] === "number") out.level2 = Math.max(0, Math.floor(v["level2"]));
  return out;
}

export function normalizeSettings(v: unknown): SaveSettings {
  const input = isRecord(v) ? v : {};
  return {
    masterVolume: clamp(asNumber(input["masterVolume"], DEFAULT_SETTINGS.masterVolume), 0, 1),
    musicVolume: clamp(asNumber(input["musicVolume"], DEFAULT_SETTINGS.musicVolume), 0, 1),
    sfxVolume: clamp(asNumber(input["sfxVolume"], DEFAULT_SETTINGS.sfxVolume), 0, 1),
    reduceMotion: asBool(input["reduceMotion"], DEFAULT_SETTINGS.reduceMotion),
    showSubtitles: asBool(input["showSubtitles"], DEFAULT_SETTINGS.showSubtitles),
    controlScheme: asScheme(input["controlScheme"]),
  };
}

export function normalizeSave(input: unknown): SaveV1 {
  const base = defaultSave();
  if (!isRecord(input)) return base;

  const settings = normalizeSettings(input["settings"]);
  const progressRaw = isRecord(input["progress"]) ? input["progress"] : {};
  const statsRaw = isRecord(input["stats"]) ? input["stats"] : {};

  const currentLevel = asLevel(progressRaw["currentLevel"], 1);
  const unlockedLevel = asLevel(progressRaw["unlockedLevel"], currentLevel);
  const coins = Math.max(0, Math.floor(asNumber(progressRaw["coins"], 0)));
  const maxHp = clamp(
    Math.floor(asNumber(progressRaw["maxHp"], BALANCE.level2.playerHp)),
    1,
    99,
  );
  const roomRaw = progressRaw["currentRoom"];

  return {
    version: CURRENT_VERSION,
    settings,
    progress: {
      unlockedLevel: unlockedLevel < currentLevel ? currentLevel : unlockedLevel,
      currentLevel,
      ...(typeof roomRaw === "number" && Number.isFinite(roomRaw)
        ? { currentRoom: clamp(Math.floor(roomRaw), 0, 16) }
        : {}),
      coins,
      maxHp,
      items: normalizeItems(progressRaw["items"]),
      seenCutscenes: asStringArray(progressRaw["seenCutscenes"]),
      shopPurchased: asBool(progressRaw["shopPurchased"], false),
      npcFlags: normalizeNpcFlags(progressRaw["npcFlags"]),
      memes: asStringArray(progressRaw["memes"]),
    },
    stats: {
      deaths: Math.max(0, Math.floor(asNumber(statsRaw["deaths"], 0))),
      clears: normalizeClears(statsRaw["clears"]),
      playSeconds: Math.max(0, asNumber(statsRaw["playSeconds"], 0)),
    },
    updatedAt: asString(input["updatedAt"], base.updatedAt),
  };
}

export function serializeSave(save: SaveV1): string {
  return JSON.stringify(save);
}

/** 纯函数：JSON 文本 → SaveV1（不触碰 localStorage，便于单测）。 */
export function parseSave(raw: string | null | undefined): SaveParseResult {
  if (raw === null || raw === undefined || raw.trim() === "") {
    return { save: defaultSave(), status: "empty", readOnly: false, raw: null };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { save: defaultSave(), status: "corrupt", readOnly: false, raw };
  }
  if (!isRecord(parsed) || typeof parsed["version"] !== "number") {
    return { save: defaultSave(), status: "corrupt", readOnly: false, raw };
  }
  const version = parsed["version"];
  if (version > CURRENT_VERSION) {
    return {
      save: normalizeSave(parsed),
      status: "version",
      readOnly: true,
      raw,
    };
  }
  if (version < CURRENT_VERSION) {
    // v1 之前没有可迁移格式：保留可识别字段，视为旧档升级。
    return { save: normalizeSave(parsed), status: "version", readOnly: false, raw };
  }
  return { save: normalizeSave(parsed), status: "ok", readOnly: false, raw };
}

export const SAVE_DEFAULTS = {
  currentVersion: CURRENT_VERSION,
  key: BALANCE.save.key,
  backupKey: BALANCE.save.backupKey,
  badKey: BALANCE.save.badKey,
};
