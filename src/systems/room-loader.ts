import type { LevelDef, RoomDef } from "../content/types";
import type { Vec } from "../core/types";

export interface ResolvedEntry {
  room: RoomDef;
  index: number;
  spawn: Vec;
}

/** 纯函数：按出口/房间 id 解析落点（docs/51 §2.5）。 */
export function resolveEntry(
  level: LevelDef,
  fromRoomId: string | null,
  fallbackIndex = 0,
): ResolvedEntry {
  if (fromRoomId) {
    for (const room of level.rooms) {
      const exit = room.exits.find((e) => e.toRoom === fromRoomId);
      if (exit) {
        const index = level.rooms.findIndex((r) => r.id === fromRoomId);
        const target = index >= 0 ? level.rooms[index]! : room;
        return {
          room: target,
          index: index >= 0 ? index : fallbackIndex,
          spawn: { ...exit.spawnAt },
        };
      }
    }
    const index = level.rooms.findIndex((r) => r.id === fromRoomId);
    if (index >= 0) {
      const room = level.rooms[index]!;
      return { room, index, spawn: { ...room.spawn } };
    }
  }
  const room = level.rooms[fallbackIndex] ?? level.rooms[0];
  if (!room) throw new Error(`[rooms] 关卡 ${level.id} 没有房间`);
  return { room, index: fallbackIndex, spawn: { ...room.spawn } };
}

export function roomById(level: LevelDef, id: string): { room: RoomDef; index: number } | null {
  const index = level.rooms.findIndex((r) => r.id === id);
  if (index < 0) return null;
  return { room: level.rooms[index]!, index };
}

export function exitAt(room: RoomDef, playerX: number, playerY: number): RoomDef["exits"][number] | null {
  for (const exit of room.exits) {
    if (
      playerX >= exit.at.x &&
      playerX <= exit.at.x + exit.w &&
      playerY >= exit.at.y &&
      playerY <= exit.at.y + exit.h
    ) {
      return exit;
    }
  }
  return null;
}

export function isPastRightEdge(room: RoomDef, x: number): boolean {
  const exit = room.exits.find((e) => e.at.x >= 900);
  return Boolean(exit && x >= exit.at.x);
}
