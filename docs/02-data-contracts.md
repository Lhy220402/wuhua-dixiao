# 02 数据契约与全局常量（v0.1）

> 本文档是 M1–M5 文档与后续代码的**唯一事实来源**：全局数值、数据结构、事件、存档、坐标约定。
> 模块文档发现冲突时以本文档为准；确需改动请找 Lead。
> 不含 UI 视觉细节（见 40/41）、关卡编排（见 20/21）、台词全文（见 30）。

## 0. 范围

- 适用版本：当前两关版本 v0.1（第一关 笑长，第二关 消耗战）。
- 所有数值可调，最终集中在 `src/config/balance.ts`；文档引用参数名，不重复定义。
- 技术栈：KAPLAY + TypeScript + Vite，纯前端静态站点。

## 1. 目标目录结构（实现阶段，M5 细化）

```
wuhua-dixiao/
├── index.html
├── package.json            # kaplay / vite / typescript / vitest(dev)
├── vite.config.ts          # base: './'，便于静态托管
├── public/audio/           # 首版为空；用户后续放 fail.ogg 等
├── src/
│   ├── main.ts             # 初始化 KAPLAY、注册场景、读存档
│   ├── config/balance.ts   # 第 2 节全部常量
│   ├── config/theme.ts     # 设计 token（见 40）
│   ├── core/               # 场景机 / 事件总线 / 存档 / 输入 / 音频 / 计时
│   ├── scenes/             # boot, title, intro, play, clear, fail, tobecontinued
│   ├── systems/            # player, room, gaze, boss, bullet, economy, buff, npc, camera
│   ├── content/            # levels/, npcs/, bosses/, items/, dialogue/, memes/, audio.ts
│   ├── art/                # 扁平矢量绘制函数（玩家/笑长/NPC/道具/瓦片）
│   ├── ui/                 # DOM HUD / 弹层 / 触控控件 / 安全区计算
│   └── tests/              # vitest 纯逻辑单测（计时/经济/状态机/存档）
└── docs/
```

## 2. 全局常量

### 2.1 画面与房间

| 参数 | 值 | 单位 | 说明 |
|---|---|---|---|
| LOGICAL_W × LOGICAL_H | 960 × 540 | px | 16:9 逻辑视口，等比缩放 + letterbox |
| DESIGN_GRID | 32 | px | 仅作对齐参考；房间用像素矩形 |
| ROOM_TRANSITION | 120 | ms | 房间切换淡入（Material 短时长） |
| HUD_INSET | 16 | px | HUD 距视口边缘，另加安全区 |
| DPR_CAP | 2 | × | devicePixelRatio 上限，控性能 |
| TARGET_FPS | 60 | fps | 帧预算 16.6 ms |

### 2.2 玩家物理

| 参数 | 值 | 单位 | 说明 |
|---|---|---|---|
| player.w | 20 | px | 碰撞盒宽 |
| player.h | 28 | px | 碰撞盒高 |
| runSpeed | 220 | px/s | 最大水平速度 |
| accel | 3000 | px/s² | 地面加速度 |
| airAccel | 2200 | px/s² | 空中加速度 |
| friction | 2800 | px/s² | 松手减速 |
| gravity | 1900 | px/s² | |
| jumpVel | 640 | px/s | 起跳初速（约 3.4 格高） |
| jumpCut | 0.45 | × | 松跳键时 vy 乘数 |
| maxFall | 1000 | px/s | 下落终端速度 |
| coyote | 0.10 | s | 土狼时间 |
| jumpBuffer | 0.12 | s | 跳跃缓冲 |
| invuln | 1.2 | s | 第二关受击后无敌帧 |
| interactRadius | 56 | px | NPC / 商店交互半径 |

### 2.3 通用流程

| 参数 | 值 | 单位 | 说明 |
|---|---|---|---|
| failCardDelay | 0.8 | s | 失败音效后弹出失败卡 |
| retryFadeIn | 250 | ms | 重试画面淡入 |
| deathCounterKey | `cmi.deaths.<levelId>` | — | 存 `stats.deaths` |
| skipHintDelay | 0.6 | s | 过场出现「跳过」提示 |

### 2.4 第一关（笑长 · 视线）

| 参数 | 值 | 单位 | 说明 |
|---|---|---|---|
| level1.rooms | 4 | 个 | 3 个平台房 + 1 个 Boss 礼堂 |
| coinsPlaced | 14 | 枚 | 每枚 +1 |
| shopUnlockTime | 45 | s | 进入礼堂后计时；或第 3 房间入口即触发（先到为准） |
| shopPrice | 10 | 金币 | 子弹枪售价 |
| shopCoinFallback | 1.0 | s | 商店出现瞬间若 coins<10，笑长撒币补到 10（一次性，购买记录 borrowed） |
| exposureThreshold | 2.5 | s | 连续暴露累计，满则失败 |
| exposureDecay | 3 | × | 离开视线的回落速度倍率 |
| exposureWarnAt | 0.5 | 比例 | 读条过半触发暗角 + 心跳 |
| gazeTelegraph | 0.8 | s | 眼睛变红 + 扇形轮廓预警 |
| gazeFanHalfAngle | 8 | ° | 扇形视线半角；玩家身体任一点在扇形内且通视即暴露（2026-11-23 用户要求改为从瞳孔射出的扇形“目光”） |
| gazeFanSlices | 18 | 条 | 扇形渲染采样射线数（视觉；判定不依赖采样密度） |
| gazeBeamWidth | 6 / 10 | px | 核心光束判定宽 / 视觉宽（旋转矩形；实际判定按扇形） |
| gazeBeamLength | 1200 | px | 视线最大长度，遇地面/挂牌截断 |
| exposureRate | 1.0 | /s | 扇形视线覆盖玩家时的读条增速；离开视线按 3× 回落 |
| gazeSweepPeriod | 3.6 | s | 基础攻击轮：0.8s 预警 + 1.8s 扫射 + 1.0s 收束；P1 按 640/340≈1.882s 扫满，P3 锁定 4.0s，眨眼每 4s / 1.2s 窗错相打断 |
| blinkWindow | 1.2 | s | 每 4s 眨眼，光束熄灭 |
| boss1.hp | 999 | — | 不可被玩家伤害，仅剧情击杀 |
| level1.cutsceneLen | ≈6 | s | 见 31 分镜 |

### 2.5 第二关（Boss · 消耗战）

| 参数 | 值 | 单位 | 说明 |
|---|---|---|---|
| boss2.hp | 100 | — | 受子弹伤害 |
| bullet.damage | 4 | — | 25 发打空 |
| bullet.speed | 700 | px/s | |
| bullet.cooldown | 0.25 | s | |
| bullet.maxOnScreen | 6 | 发 | 对象池上限 |
| player.hp | 5 | 心 | 初始 |
| player.startCoins | 15000 | 金币 | 第二关开局补给；实际开局金币 = 15000 + 第一关剩余 |
| player.maxCoins | 20000 | 金币 | 金币条满格，超出部分不再增长（HUD 封顶） |
| hit.hpCost | 1 | 心 | 每次受击 |
| hit.coinCost | 5000 | 金币 | 每次受击 |
| coinDrop | 2500 | 金币 | Boss 每受击 3 次掉落一枚，拾取回血金币 |
| giantThreshold | 40 | HP | Boss ≤40 进入巨大化阶段 |
| giant.bulletMultiplier | 0.25 | × | 巨大化后子弹刮痧（4→1） |
| giant.shockwaveInterval | 2.0 | s | 冲击波间隔 |
| giant.shoeHitbox | 192×64 | px | 碰到鞋即胜利（x640–832 / y448–512，阶段 2 过场结束 1s 后激活） |
| checkpoint | 按阶段 | — | 失败回到本阶段开始（P1/P2），不清空已看剧情 |

### 2.6 经济与物品

- 金币：整数，最小 0；受击不会让金币 < 0（到 0 即失败）。
- 物品：`子弹枪` 唯一，跨关携带；第一关购买后立即入包，第二关开局即可射击。
- 第二关失败重试：金币回到本阶段检查点时的数值（不是 0）。

### 2.7 UI 与动效 token（契约引用，详见 41）

| token | 值 | 用途 |
|---|---|---|
| dur.xs | 100 ms | 按钮按下、图标态 |
| dur.s | 200 ms | HUD 数字、气泡 |
| dur.m | 300 ms | 弹层、对话框 |
| dur.l | 400 ms | 场景转场、失败卡 |
| ease.standard | cubic-bezier(0.2, 0, 0, 1) | 通用进入 |
| ease.emphasized | cubic-bezier(0.05, 0.7, 0.1, 1) | 强调进入 |
| ease.exit | cubic-bezier(0.3, 0, 0.8, 0.15) | 退出 |
| touch.min | 56 px | 移动端按钮最小边长（HIG 44pt 的网页实现） |
| touch.jump | 80 px | 跳跃主按钮 |
| safeInset | env(safe-area-inset-*) | 安全区，HUD/控件避让 |
| reduceMotion | 0–80 ms + 淡入淡出 | 开启后替代位移/震屏 |

### 2.8 音频

- 逻辑 ID → 文件：`sfx.fail → /audio/fail.ogg`（用户稍后提供）；其余首版全部缺失，播放时静默 + `console.warn` 一次；解码失败按 `fail.ogg → fail.mp3 → fail.m4a` 兜底（iOS Safari 兼容），全缺才静默。
- 音量总线：master / music / sfx，默认 0.8 / 0.5 / 0.8，存 settings。
- 受击 ducking：music 音量 ×0.5，持续 0.4s 后恢复。

## 3. 内容数据 Schema（TypeScript 草案）

> 全部放在 `src/content/`，引擎只读数据；新增内容不改引擎代码。字段名即代码名，M5 按此实现。

```ts
type Vec = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

interface GameContent {
  levels: LevelDef[]; bosses: Record<string, BossDef>;
  npcs: NpcDef[]; dialogue: Record<string, DialogueDef>;
  items: ItemDef[]; shops: Record<string, ShopDef>;
  buffs: Record<string, BuffDef>; memes: MemeDef[];
  audio: Record<string, AudioDef>;
}

interface LevelDef {
  id: 'level1' | 'level2' | string;
  title: string;                 // 关卡标题，如「第一关 · 笑长的凝视」
  rooms: RoomDef[];
  intro: { title: string; hint: string; durationMs: number };
  music: string;                 // bgm 逻辑 ID
  bossId?: string;
  clearText: string;             // 结算文案
}

interface RoomDef {
  id: string;                    // 唯一，用于检查点
  name: string;
  platforms: Rect[];             // 实心矩形
  hazards: HazardDef[];          // 尖刺 / 深渊触发区
  coins: Vec[];                  // 金币坐标（中心点）
  npcs: { npcId: string; at: Vec }[];
  shop?: { shopId: string; at: Vec; trigger: 'timer' | 'enter'; delayMs?: number };
  boss?: { bossId: string; at: Vec; onEnter?: string /* cutsceneId */ };
  exits: { id: string; at: Vec; w: number; h: number; toRoom: string; spawnAt: Vec }[];
  spawn: Vec;                    // 玩家进入房间的默认出生点
}

interface HazardDef { type: 'spike' | 'pit'; rect: Rect; failReason: 'pit' | 'gaze'; }

interface BossDef {
  id: string; name: string; hp: number;
  phases: BossPhaseDef[];
  giantThreshold?: number;
  shoeHitbox?: Rect;
  defeatMethod: 'npc' | 'shoe' | 'gun';
}

interface BossPhaseDef {
  id: string;                    // 'p1' | 'p2' ...
  hpMin: number; hpMax: number;
  attacks: AttackDef[];          // 轮转表
  enterCutscene?: string;
}

interface AttackDef {
  id: string; type: 'laserSweep' | 'homingBurst' | 'shockwave' | 'bananaTrap' | 'stompRing';
  telegraphMs: number; durationMs: number; cooldownMs: number;
  damage: { hp: number; coins: number };
  params: Record<string, number | string>;  // 速度/数量/间隔等，见 21 数值表
}

interface NpcDef {
  id: string; name: string; art: string;   // 资源槽名，如 npc.laowu
  dialogueId: string;
  interactRadius?: number;
  effect?: { type: 'buff' | 'damage' | 'none'; buffId?: string; hpCost?: number; once?: boolean };
}

interface DialogueDef {
  id: string; once?: boolean;
  lines: DialogueLine[];
  onEnd?: { event: string; payload?: unknown };
}
interface DialogueLine {
  speaker: string;               // 说话人显示名；空 = 旁白
  text: string;                  // 逐字文案
  style?: 'speech' | 'shout' | 'whisper' | 'silent' | 'system';
  emote?: string;                // 气泡表情符号（小明专用：'…' / '♪' / 动作符号）
  typeSpeed?: number;            // 字/秒，默认 30
  holdMs?: number;               // 自动继续等待，0=等玩家
}

interface ItemDef {
  id: string; name: string; desc: string; icon: string;   // 资源槽
  stacks: boolean; persistent: boolean;                  // 跨关携带
}

interface ShopDef {
  id: string; title: string;
  items: { itemId: string; price: number; stock: number }[];
  purchaseCutscene?: string;     // 购买成功后播放的过场
}

interface BuffDef {
  id: string; name: string; durationMs: number; icon: string;
  effects: { maxHp?: number; heal?: number; coinMultiplier?: number; shieldHits?: number; exposureRateMul?: number };
  hudText: string;
}

interface MemeDef { id: string; title: string; desc: string; unlockBy: string; }

interface AudioDef { src: string; volume: number; loop: boolean; }
```

**关卡数据示例（第一关礼堂，节选）：**

```ts
{
  id: 'l1-hall', name: '礼堂',
  platforms: [{ x: 0, y: 500, w: 960, h: 40 }, { x: 0, y: 0, w: 32, h: 540 }, { x: 928, y: 0, w: 32, h: 540 }],
  hazards: [],
  coins: [{ x: 220, y: 470 }, { x: 700, y: 470 }],
  npcs: [],
  shop: { shopId: 'gun-shop', at: { x: 820, y: 470 }, trigger: 'timer', delayMs: 45000 },
  boss: { bossId: 'xiaozhang', at: { x: 480, y: 150 } },
  exits: [],
  spawn: { x: 80, y: 460 },
}
```

**过场数据（分镜由 31 定义，引擎按 steps 播）：**

```ts
interface CutsceneDef {
  id: string; skippable: boolean; totalMs: number;
  steps: { at: number; action: 'bubble'|'move'|'shake'|'flash'|'slowmo'|'sfx'|'text'|'wait'|'grantItem'|'bossDie';
           target?: string; params?: Record<string, unknown>; durationMs?: number; easing?: string }[];
}
```

## 4. 存档

`localStorage` key **`cmi.save.v1`**（另有 `cmi.save.v1.bak` 备份，写入前轮换）。

```ts
interface SaveV1 {
  version: 1;
  settings: {
    masterVolume: number; musicVolume: number; sfxVolume: number;
    reduceMotion: boolean; showSubtitles: boolean;
    controlScheme: 'auto' | 'touch' | 'keyboard';
  };
  progress: {
    unlockedLevel: 1 | 2; currentLevel: 1 | 2;
    coins: number; maxHp: number;
    items: { itemId: string; count: number }[];
    seenCutscenes: string[];     // 已看过的过场（首看可长，重看可跳）
    shopPurchased: boolean;
    npcFlags: Record<string, boolean>;  // NPC 一次性标记（如 jiashengBitten）
    memes: string[];             // 已收集梗
  };
  stats: { deaths: number; clears: { level1?: number; level2?: number }; playSeconds: number };
  updatedAt: string;             // ISO
}
```

规则：
- 写档时机：房间切换、关卡通关、设置变更、页面隐藏（`visibilitychange`）。
- 读档失败 / JSON 损坏 / 版本不匹配：备份原档到 `cmi.save.v1.bad`，重置默认档并 toast「存档损坏，已重置」。
- v1 之前不做迁移；`version` 预留。
- 金币只在存档点写入；重试以内存检查点为准。

## 5. 事件契约（`game:*`，KAPLAY 自定义事件 / 事件总线）

| 事件 | payload | 触发时机 |
|---|---|---|
| `game:level-start` | `{ levelId }` | 进入关卡场景 |
| `game:room-enter` | `{ levelId, roomId, index }` | 房间加载完成 |
| `game:coin-changed` | `{ coins, delta, reason: 'pickup'\|'purchase'\|'hit'\|'cheat' }` | 金币变化 |
| `game:player-damaged` | `{ source: string, hpLoss, coinLoss, hpAfter, coinsAfter }` | 受击结算后 |
| `game:player-died` | `{ reason: 'gaze'\|'hp'\|'coins'\|'pit' }` | 失败判定成立 |
| `game:item-acquired` | `{ itemId, silent?: boolean }` | 获得道具 |
| `game:shop-opened` | `{ shopId }` | 商店打开 |
| `game:shop-purchased` | `{ shopId, itemId, price }` | 购买成功 |
| `game:dialogue-start` / `game:dialogue-end` | `{ dialogueId, npcId? }` | 对话开始/结束 |
| `game:cutscene-start` / `game:cutscene-end` | `{ cutsceneId, skipped: boolean }` | 过场开始/结束 |
| `game:buff-applied` / `game:buff-ended` | `{ buffId, durationMs }` / `{ buffId }` | 增益生效/结束（HUD 图标用） |
| `game:boss-phase` | `{ bossId, phase, hp }` | Boss 阶段切换 |
| `game:boss-defeated` | `{ bossId, method: 'npc'\|'shoe'\|'gun' }` | Boss 被击败 |
| `game:level-complete` | `{ levelId, timeMs, deaths, coins }` | 关卡通关 |
| `game:fail` | `{ levelId, reason }` | 进入失败流程（同时播 sfx.fail） |
| `game:retry` | `{ levelId, checkpointId }` | 重试开始 |

约束：
- 事件只做通知，不承载逻辑分支；经济/血量结算在 systems 内完成后再 emit。
- **UI → 逻辑 的命令事件（`ui:*`）**：`ui:pause` / `ui:resume`、`ui:retry-request`、`ui:shop-close` + `requestPurchase(itemId)`、`ui:dialogue-advance` / `ui:skip-dialogue`、`ui:settings-changed`、`ui:screen-change`。`ui:*` 只表达界面意图，结算仍由 systems 完成；与 `game:*` 分开，不互相替代。
- 任何弹层状态（Dialogue/Shop/Cutscene/Paused）期间，玩家物理与 Boss 攻击**冻结**（时间缩放 0），避免「对话/购物中被激光打死」；商店面板打开即冻结，关闭后 0.3s 输入保护。

## 6. 状态机与场景映射

| 状态 | 实现 | 冻结世界 | 输入 |
|---|---|---|---|
| Boot | scene `boot` | — | 无 |
| Title | scene `title` | — | 开始/继续/设置 |
| LevelIntro | overlay（1.5–2.5s） | 是 | 跳过 |
| Playing | scene `play` | 否 | 移动/跳/射击/交互 |
| Dialogue | overlay | 是 | 继续/跳过 |
| Shop | overlay（底部弹层） | 是 | 选择/购买/关闭 |
| Cutscene | timeline（play 内） | 是 | 跳过（首看不可跳） |
| Paused | overlay | 是 | 恢复/设置/重开 |
| LevelClear | scene `clear` | — | 继续 |
| Fail | scene `fail` | — | 重试/返回标题 |
| ToBeContinued | scene `tobecontinued` | — | 回标题 |

## 7. 房间与坐标约定

- 逻辑坐标原点左上，x 右、y 下，单位 px；房间 = 一个视口 960×540，房间之间通过 `exits` 矩形切换。
- 平台/危险区/金币/NPC 全部用像素矩形或点表示（不用严格 tilemap）；设计时按 32px 网格对齐。
- 房间切换：淡出 60ms → 加载 → 淡入 120ms；玩家出现在 `toRoom.spawnAt`。
- 实体重置：金币按「本关已拾取集合」跨重试保留（避免重复刷钱）；Boss 状态按检查点重置；NPC 对话 `once` 只触发一次。
- 掉出房间下边界 = `pit` 失败（第二关掉坑同样扣 1 HP + 5000 金币）。

## 8. 固定文案与用词（不得改写）

| 场景 | 原文 |
|---|---|
| 游戏名 | 物化帝笑传 |
| 主角 | 物化帝 |
| 笑长购买气泡 | 你这玩意能大四人你知道不 |
| 道具名 / 介绍 | 子弹枪 / 潮的馈赠 |
| 老吴唱歌 | 纱魔罗托 |
| 食菌 | 非洲怎么可能有香蕉呢… |
| 假生 | 都这个点了还没死呢 |
| 夺枪 NPC | 潮（仅过场出现、无台词，击毙笑长后把枪还给主角，解释道具介绍） |
| 食菌道具 | 香蕉（item.banana，一次性收藏品） |
| 第二关通关 | 未完待续 |
| 失败音效 | `sfx.fail`（用户后续提供 `public/audio/fail.ogg`） |

- 小明不说话：气泡内不出现台词文字，只用 `…` / 动作符号 / 波形表现（细节见 30）。
- 全部玩家可见文案存 `src/content/`，不硬编码在场景代码里。
- 语气：一本正经的荒诞，不解释梗、不加括号注释。

## 9. 扩展流程（不改核心代码）

| 想加什么 | 要做的事 |
|---|---|
| 新关卡 | 加一个 `LevelDef`（含 rooms/boss/音乐/文案）→ 注册进 `GameContent.levels` → 通关链里加 `level3` 的解锁条件 |
| 新 Boss 阶段 | 在 `BossDef.phases` 加一个 `BossPhaseDef` + 攻击表，无需改 Boss 系统 |
| 新 NPC | 加 `NpcDef` + `DialogueDef`，在房间 `npcs` 里摆位；有增益/扣血时挂 `effect` |
| 新商品/道具 | 加 `ItemDef` / `ShopDef.items`，图标给资源槽 |
| 新梗 | 加 `MemeDef`，在对话/过场/道具里用 `unlockBy` 解锁，进「梗图鉴」 |
| 新音效 | 加 `AudioDef` 并在内容里引用逻辑 ID；文件缺失自动静默 |
| 新手感 | 只改 `balance.ts` 数值，不动系统代码 |

## 10. 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1 | 2026-11-22 | 首版：两关数值、schema、事件、存档、扩展流程；确认主角=物化帝、美术=代码生成扁平矢量、双端适配 |
| v0.1 定稿 | 2026-11-22 | 合并全队文档：潮=夺枪者 /「潮的馈赠」；金币上限 20000；鞋判定 192×64；UI 走 DOM 覆盖层 + `ui:*` 命令；光束 6/10px、攻击轮 3.6s；老吴「纱魔罗托」×0.6/25s；假生 L2 -1HP 不可致死 |
