import { BALANCE } from "../config/balance";
import type { GameEventMap, GameEventName } from "../core/types";

export type Unsub = () => void;
export type GameHandler<K extends GameEventName> = (payload: GameEventMap[K]) => void;

export interface EventRecord {
  name: GameEventName;
  payload: unknown;
  at: number;
}

/** 同步、类型安全的 game:* 事件总线（docs/02 §5）。 */
export class EventBus {
  private listeners = new Map<GameEventName, Set<(payload: never) => void>>();
  private ring: EventRecord[] = [];
  private ringMax: number;
  private seq = 0;

  constructor(ringMax: number = BALANCE.debug.eventRing) {
    this.ringMax = ringMax;
  }

  on<K extends GameEventName>(name: K, handler: GameHandler<K>): Unsub {
    let set = this.listeners.get(name);
    if (!set) {
      set = new Set();
      this.listeners.set(name, set);
    }
    const fn = handler as (payload: never) => void;
    set.add(fn);
    return () => {
      set?.delete(fn);
    };
  }

  once<K extends GameEventName>(name: K, handler: GameHandler<K>): Unsub {
    const unsub = this.on(name, (payload) => {
      unsub();
      handler(payload);
    });
    return unsub;
  }

  emit<K extends GameEventName>(name: K, payload: GameEventMap[K]): void {
    const record: EventRecord = { name, payload, at: this.seq++ };
    this.ring.push(record);
    if (this.ring.length > this.ringMax) this.ring.shift();

    const set = this.listeners.get(name);
    if (!set || set.size === 0) return;
    // 复制一份，允许监听器在回调中退订/新增而不影响本次派发。
    for (const fn of Array.from(set)) {
      try {
        (fn as GameHandler<K>)(payload);
      } catch (err) {
        console.error(`[events] handler for ${name} failed`, err);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }

  get recent(): readonly EventRecord[] {
    return this.ring;
  }
}

export const gameEvents = new EventBus();
