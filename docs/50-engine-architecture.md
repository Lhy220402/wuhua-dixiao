# 《物化帝笑传》· 工程架构（M5 · docs/50）

> 上游：`docs/00-brief.md`。`docs/02-data-contracts.md` 尚未冻结，§7.2 是草案，冲突以 02 为准（见 §10）。
> 只写架构与规则，不含实现代码；任务拆解、测试与交付见 `docs/51-quality-and-delivery.md`。

## 1. 目标与范围

**做什么**：定义目录结构与每文件职责、分层边界；定义运行时骨架（FSM ↔ KAPLAY scene、房间制、输入抽象、碰撞/伤害、事件总线、内容数据、矢量美术层、存档、音频、移动端/PC、构建部署）；给实现者规则书，给测试者入口清单。

**不做什么**

| 不做 | 归属 / 原因 |
|---|---|
| 玩法数值、Boss 招式、商店文案、UI 视觉与文案 | `docs/10` / `docs/20` / `docs/21` / `docs/30` / `docs/40` / `docs/41` |
| 实现代码、`npm install` | 简报 §9：本轮只写文档 |
| 新增运行时依赖、换引擎 | 简报 §2：kaplay + vite + typescript 已定 |
| 视频制作 / 录屏回放管线 | 简报 §1：移动端与 PC 指**浏览器适配**，无视频需求 |
| 任务编号与里程碑排期 | `docs/51-quality-and-delivery.md` |

**原则**：① 数据驱动——加关卡/NPC/Boss/商品只改 `src/content/*`；② 纯逻辑可测——计时、经济、迁移、序列化都是无副作用函数；③ 单入口单状态——可变状态集中在 `app/state.ts`，迁移只经 `app/fsm.ts`；④ 零外部资源可跑——视觉由 `src/art/*` 矢量绘制，音频缺失即静默；⑤ 移动端预算观——每帧 new 对象、拼字符串、全量重建 UI 按缺陷处理。

## 2. 机制 / 规则

### 2.1 目录结构与文件职责

```text
wuhua-dixiao/
├── index.html              # 挂载点 + viewport/safe-area meta
├── package.json            # dev/build/preview/test；依赖仅 kaplay/vite/typescript（+vitest 开发态）
├── tsconfig.json           # strict、noUncheckedIndexedAccess、ES2020
├── vite.config.ts          # base "./"、构建目标、__APP_VERSION__ define
├── public/
│   └── audio/              # 用户后续放 fail.ogg 等；缺失静默（可选贴图放 public/art/）
└── src/
    ├── main.ts             # 唯一入口：能力探测 → kaplay() 配置 → 读档 → 注册场景 → boot
    ├── app/
    │   ├── fsm.ts          # 顶层状态机：状态枚举、迁移表、guard、goState()、overlay 栈
    │   └── state.ts        # 运行时单例 RunState/Settings + 检查点（唯一可变真源）
    ├── config/
    │   ├── balance.ts      # 全部可调数值：简报 §5 镜像 + 本文 §3 引擎参数
    │   └── layout.ts       # 960×540、HUD/触控热区、安全区常量
    ├── scenes/
    │   ├── boot.ts         # 预加载/读档/内容校验/能力探测 → title
    │   ├── title.ts        # 标题、开始/继续/设置、音频解锁手势
    │   ├── level-intro.ts  # 关卡标题卡与说明（读 LevelDef.intro）
    │   ├── playing.ts      # 主场景：房间循环 + 玩法 overlay 宿主
    │   ├── cutscene.ts     # 全屏过场演出（可跳过）
    │   ├── level-clear.ts  # 结算：时间/死亡/金币 → 下一关或未完待续
    │   └── to-be-continued.ts # 「未完待续」+ 梗收集展示
    ├── systems/
    │   ├── input.ts        # 键鼠/触控 → 8 个抽象 action；焦点与多点触控
    │   ├── room-loader.ts  # 按 LevelDef.rooms 构建/销毁房间实体与固定相机
    │   ├── physics.ts      # 角色积分、碰撞响应、土狼/缓冲/短跳
    │   ├── combat.ts       # applyDamage、无敌帧、接触冷却、子弹/鞋判定
    │   ├── geom.ts         # 纯几何：AABB、线段-矩形相交、朝向采样
    │   ├── vision.ts       # 视线暴露计时（纯函数）+ 预警阈值
    │   ├── boss.ts         # Boss 阶段机、招式调度、受击与胜利条件
    │   ├── bullets.ts      # 弹幕对象池、扫掠步进、生命周期
    │   ├── shop.ts         # 金币扣款、库存、购买校验（纯逻辑 + 表现分离）
    │   ├── dialogue.ts     # 对话推进、逐字机、跳过
    │   ├── events.ts       # game:* 事件总线的类型化 emit/on 封装
    │   └── pool.ts / debug.ts # 通用对象池（子弹/粒子/飘字） / F3 面板：FPS、实体数、事件环
    ├── content/
    │   ├── index.ts        # 注册表聚合 + validateContent()
    │   ├── levels/         # level1（4 房间/金币/商店触发）、level2（Boss 房/补给）
    │   ├── npcs/index.ts   # 老吴/小明/食菌/假生：位置、台词引用、增益
    │   ├── bosses/         # boss1（笑长）、boss2（第二关 Boss）
    │   ├── items/index.ts  # 子弹枪、恢复品、鞋：价格与效果
    │   ├── dialogue/       # 台词与过场分镜数据：common、level1、level2、购买过场
    │   └── audio-manifest.ts # AudioId → public/audio 相对路径
    ├── art/
    │   ├── registry.ts     # ArtSlot → DrawFn；解析顺序见 §2.7
    │   ├── player.ts       # 物化帝：扁平矢量小人（校服色块 + 描边头部）
    │   ├── bosses.ts       # 笑长 / 第二关 Boss 的分层矢量绘制
    │   ├── npcs.ts         # 四个 NPC 的差异化矢量形象
    │   ├── tiles.ts        # 平台/背景/门/尖刺/商店摊位
    │   ├── items.ts        # 金币/子弹枪/鞋/血心
    │   └── fx.ts           # 粒子、冲击波、读条、暗角
    ├── ui/
    │   ├── hud.ts          # 金币/关卡/计时/暂停按钮/心形血量；事件驱动更新
    │   ├── exposure-bar.ts # 暴露读条 + 50% 预警暗角
    │   ├── dialogue-box.ts # 对话框、说话人、逐字、继续提示
    │   ├── shop-panel.ts   # 商品列表、价格、金币不足态
    │   ├── touch-controls.ts # 虚拟方向/跳/射击/交互/暂停（多指）
    │   ├── overlays.ts     # 暂停/失败/竖屏提示/淡入淡出/提示 toast
    │   └── theme.ts        # 色板、字号、描边宽度、动效时长（供 40/41 对齐）
    ├── audio/
    │   ├── audio.ts        # 逻辑 ID 播放、缺失静默 + warn 一次、并发上限
    │   └── bgm.ts          # BGM 单轨切换、duck/恢复、淡入淡出
    ├── save/
    │   ├── schema.ts / serialize.ts # SaveV1 类型、默认值、CURRENT_VERSION / parse/validate/serialize/migrate（纯函数）
    │   └── storage.ts      # localStorage 适配 + 防抖 + 隐私模式内存降级
    └── assets/
        └── manifest.ts     # 资源槽 → 可选贴图 URL；首版为空，全部走 art/ 矢量
```

### 2.2 分层依赖

| 层 | 可依赖 | 禁止 |
|---|---|---|
| `scenes/` | `systems/` `ui/` `content/` `config/` `app/` | 直接读写 localStorage |
| `systems/` | `content/` `config/` `app/state`（只读） | `scenes/`、`ui/` |
| `ui/` | `systems/` 只读接口、`config/`、`content/`、`art/` | `scenes/`、直接改 RunState |
| `content/` | `config/` 类型、02 类型 | `systems/` `scenes/` `ui/` |
| `art/` | `content/`、`ui/theme` 色板 | 玩法状态、事件 |
| `audio/` `save/` | `content/`、`config/` | 上层业务回调 |

禁止循环 import；`systems/` 间优先显式传参、跨模块广播走事件；除 `debug.ts` 外不挂 `window` 全局。

### 2.2.1 渲染层分工（与 40/41 对齐）

- **画布层（KAPLAY）**：房间、角色、Boss、弹幕、金币、过场镜头/慢动作/闪白。逻辑分辨率 960×540，等比缩放 + letterbox。
- **DOM 覆盖层（`#ui-root`）**：HUD（血量/金币/暴露条/道具槽/暂停）、对话框、商店底部弹层、物品栏、暂停、失败/结算、未完待续、触控按钮。用 `100dvh` + `env(safe-area-inset-*)` 布局、CSS 像素尺寸（触控 ≥48–56px），通过 `ui:*` 命令与 `game:*` 事件桥接。
- KAPLAY `fixed()` 不用于 HUD；只有必须跟随世界坐标的少量飘字/气泡锚点，由 UI 模块读取固定相机的世界→屏幕坐标后用 DOM 绝对定位（相机固定，无需逐帧换算）。
- z-index：画布 0、HUD 10、弹层 20、失败/结算 30、toast 40（token 见 40）。

### 2.3 每帧顺序与实体生命周期

每帧顺序：`input.update(dt)` → `fsm.tick()`（overlay 栈决定输入是否被吞）→ `vision` → `boss` → `bullets` → `combat` → `shop` → 房间切换检查 → `hud`（事件驱动，不全量重建）。绘制交给 KAPLAY；`dt` 钳制见 §3；禁止在绘制阶段改状态；同一实体同帧只结算一次伤害。

| tag | 用途 | 销毁时机 |
|---|---|---|
| `room` | 瓦片/敌人/金币/NPC/门 | 离开房间时统一销毁 |
| `player` | 玩家（每房间重建，状态存 run state） | 房间卸载 / 回检查点 |
| `solid` / `hazard` | 碰撞体 / 尖刺激光冲击波 | 随 `room` 或自身计时 |
| `bullet` | 玩家子弹（池化） | 回池，不 destroy |
| `pickup` / `trigger` | 金币道具 / 房间入口与对话触发 | 拾取 / 随房间 |
| `ui-root` | DOM 覆盖层：HUD/面板/触控（非 KAPLAY 实体） | 场景卸载 |

规则：`loadRoom` 只销毁 `tag("room")`；`fx` 自毁；禁止 `destroyAll()`；每个 scene 的 `onDestroy` 必须退订事件与 timers。

### 2.4 房间制加载

- **房间 = 一屏** 960×540，无滚动、无自由镜头（天然完成视锥裁剪）；**相机固定**在 `RoomDef.camera`（默认 (480,270)），仅 `shake()` 偏移，世界坐标即屏幕坐标。
- **切换事务**：门/边缘触发 → 锁输入 → 淡出 60ms → 销毁 `room` → `loadRoom(next, entry)` → 生成玩家 → 淡入 120ms（02 `ROOM_TRANSITION`）→ `emit("game:room-enter")`；切换期间忽略再次触发。
- **重置语义**：房间内敌人/金币每次进入重建；Boss 房按 run state 阶段恢复；已拾取金币记入存档防重复刷。
- **检查点**：`room-enter` 与 Boss 阶段切换时写入 `app/state`；Fail→Retry 回到最近检查点（房间+阶段），不重播 Intro。

### 2.5 碰撞与伤害判定层

- **碰撞组**：`player↔solid` 阻挡、`player↔hazard` 伤害、`player↔pickup` 拾取、`player↔trigger` 触发、`bullet↔boss` 伤害、`bullet↔solid` 消散、`player↔shoeHitbox` 碰鞋胜利；矩阵集中登记在 `combat.ts`。
- **hitbox**：玩家 20×28（简报 §5），锚点脚底中心；Boss 用 `BossDef.hitbox`；子弹圆形碰撞，`速度×dt > 8px` 时切 2 子步扫掠防穿模。
- **伤害唯一入口** `applyDamage(amount, source)`：无敌帧内丢弃并返回 `false`；否则扣 HP → `game:player-damaged` → HP≤0 → `game:player-died` → Fail。禁止系统各自扣血；受击后 1.2s 只闪不叠伤害，击退方向由来源决定，接触伤害 0.2s 冷却且一帧最多一次 `player-damaged`。
- **视线判定**：`geom.ts` 的 `segmentHitsRect()`（slab 法）判断「Boss 眼点→玩家头/胸/脚三点」是否被 `solid` 遮挡，任一点通视即暴露；`vision.ts` 的 `updateExposure()` 负责累加/3× 衰减/50% 预警，纯函数可单测。
- **弹幕与鞋**：命中按 `BossPhaseDef.invulnerable` 判定，二阶段子弹只播 clank 反馈不扣血；`shoeHitboxes` 与玩家脚底相交时 `tryShoeHit()` 交由 `boss.ts` 消费，胜利条件由 `BossPhaseDef.victory` 决定。

### 2.6 事件总线与内容加载

`systems/events.ts` 封装 KAPLAY `trigger/on`，用 `GameEventMap` 约束 `emit<K>(name,payload)` 与 `onGame<K>(name,cb): Unsub`。对外事件名严格等于简报 §4 的 17 个，禁止自造 `game:*`（内部细节用函数调用，调试用 `internal:*` 且不出 systems 层）；同步派发、按 emit 顺序；订阅在 scene `onDestroy` 退订；保留最近 40 条事件环。

`content/*` 只导出 `const` 数据与类型、零副作用；`content/index.ts` 聚合注册表（levels/npcs/bosses/items/dialogues/cutscenes）。加载器按 id 查表：dev 缺 id 抛错并指路径，prod 回退占位并 `console.error` 一次。dev 启动执行 `validateContent()`：必填字段、id 唯一、引用完整（关卡→Boss→对话→音频/资源槽），失败阻止进入 Playing。

### 2.7 资源槽与矢量美术层

美术已确认为**代码生成的扁平矢量风格**：不引入外部图片，所有视觉元素由 `src/art/*.ts` 用 KAPLAY 图形 API（`rect`/`circle`/`polygon`/`outline`/渐变色块 + 汉字/emoji 点缀）程序化绘制，同时保留资源槽以便后期无缝换成手绘贴图。主角为**物化帝本人**（名字可配置，形象走 `art/player.ts`）。

- **槽位命名**（与简报 §6 一致）：`art/player`、`art/boss1`、`art/boss2`、`art/npc/{laowu,xiaoming,shijun,jiasheng}`、`art/item/{gun,shoe,coin}`、`art/tile/solid`、`art/fx/*`。
- **解析顺序**（`art/registry.ts`）：① `assets/manifest.ts` 有贴图 → 画贴图；② 否则对应 `DrawFn` 矢量绘制；③ 再否则兜底「灰矩形 + 槽名」，不报错。替换贴图只需放 `public/art/` + manifest 加一行；`drawSlot(slot,pos,state)` 可断言每个槽都有绘制实现，防漏画。
- **风格约束**：统一色板（`ui/theme.ts`：2–3 主色 + 1 强调色 + 中性灰）、2px 描边、平涂/两段渐变、圆角 4px；主角约 40×48、Boss 96×128；不打包字体（系统字体栈 + emoji 兜底）。

### 2.8 存档与音频

`save/serialize.ts` 是纯函数（`defaultSave`/`parse`/`validate`/`serialize`/`migrate`），`save/storage.ts` 做 IO（注入 `StorageLike` 便于单测，隐私模式降级内存）。key 固定 `cmi.save.v1`，`CURRENT_VERSION=1`；写防抖 300ms，时机 = 房间切换、金币变化、关卡完成、设置改变、页面隐藏 flush。Boot 只读一次；解析/校验失败或版本过高 → 备份到 `cmi.save.v1.bak` + 默认值启动 + warn/toast 各一次，不阻断。写入配额异常重试 1 次后转内存并提示。

`audio.ts` 以 `AudioId` 为键、manifest 给路径；Boot 并行 `loadSound`，单个失败 catch 记入 `missing` 并 `warnOnce`（`[audio] missing sfx.fail → public/audio/fail.ogg（静默）`）。播放遇 missing 直接 no-op；BGM 单轨切换、同 id 不重启；对话/商店/暂停打开 `duck(0.35, 200ms)`；同 id 音效 20ms 内合并，并发上限 6；首次手势后 `resumeAudioContext()`（由 Title「开始」承担）。设置关闭音效/音乐则跳过加载播放。

### 2.9 适配、部署与性能

- 逻辑分辨率固定，KAPLAY letterbox 等比缩放；外壳 `100dvh`（回退 `100vh`）+ `env(safe-area-inset-*)` 留白。
- DPR = `min(devicePixelRatio, 2)`（低端机按 §3 上限 1.5 且粒子上限减半）；`resize`/`orientationchange` 防抖 100ms 只重算外壳与安全区、**不重建场景**；触屏竖屏显示「请横屏游玩」遮罩并暂停，PC 不提示。
- PC：键鼠；画布聚焦时 `preventDefault` 空格/方向键；禁右键菜单；射击沿朝向不做鼠标瞄准；`F3` 调试面板。
- 性能：子弹/粒子/飘字全部池化；热路径禁止分配、禁止每帧 `add()`、禁止模板字符串；低端机按 §3 自动降级。
- 构建：`vite.config.ts` 用 `base: "./"`（任意子路径可用）、`build.target: "es2020"`、`assetsInlineLimit: 4096`、`define` 注入 `__APP_VERSION__`；产物 `dist/` 纯静态，托管 GitHub Pages / Netlify / 任意静态服务器，无后端、无 SW、无 CDN。
- 局域网真机预览：`npm run dev -- --host 0.0.0.0`，手机访问 `http://<局域网IP>:5173`（HTTP 可用，localStorage 正常）；更新部署靠存档版本迁移兼容，不强制清缓存。

## 3. 数值与参数表

> 简报 §5 的角色手感与关卡数值在 `src/config/balance.ts` 镜像，本表只列架构层参数。

| 参数 | 建议默认值 | 单位 | 调参影响 |
|---|---|---|---|
| 逻辑分辨率 / 相机中心 | 960×540 / (480,270) | px | 改则房间与布局数据全改，不建议动 |
| 最大 dt | 50 | ms | 切后台回来不穿模；过大有快进感 |
| 伤害无敌帧 / 接触冷却 | 1.2 / 0.2 | s | 越大越宽容，越小越硬核 |
| 子弹扫掠子步 | 2 | 次 | 高速弹穿模保护 |
| 房间淡出 / 淡入 | 150 / 150 | ms | 转场节奏，过长影响手感 |
| 存档写入防抖 | 300 | ms | 掉电丢进度窗口 |
| 子弹池 / 粒子池 / 飘字池 | 32 / 128 / 8 | 个 | 不够则复用最旧，不新建 |
| 同屏实体上限 | 160 | 个 | 超出告警并降级 |
| 音频并发 / 同 id 合并窗口 | 6 / 20 | 个 / ms | 防爆音、连打不糊 |
| BGM duck 音量 / 时长 | 0.35 / 200 | 倍 / ms | 对话可听度 |
| DPR 上限（正常 / 低端）+ resize 防抖 | 2 / 1.5 + 100 | 倍 / ms | 清晰度与填充率权衡、旋转抖动；低端机判定见 `hardwareConcurrency`/`deviceMemory` |
| 帧预算 | 16.6 | ms | 目标 60fps；update ≤ 6ms、draw ≤ 8ms |
| 首屏可交互 / 包体 | ≤ 3s / ≤ 700KB gzip | — | 4G 中端机与静态托管 |

## 4. 流程 / 状态机

```text
Boot → Title → LevelIntro(n) → Playing
Playing ⇄ Dialogue | Shop | Paused       （场景内 overlay，不销毁关卡实体）
Playing → Cutscene → LevelClear           （Cutscene 为独立 scene，购枪过场必接通关）
Playing → Fail → Retry(检查点) → Playing
Playing → LevelClear(1) → LevelIntro(2) → … → LevelClear(2) → ToBeContinued
```

| 状态 | 载体 | 进入 / 退出动作 |
|---|---|---|
| Boot | `scene("boot")` | 读档、音频、`validateContent`、能力探测 → 解锁音频上下文 |
| Title | `scene("title")` | 开始/继续/设置、版本号 → 保存设置 |
| LevelIntro | `scene("intro")` | 读关卡标题与说明、锁输入 → 初始化 run state |
| Playing | `scene("playing")` | `loadRoom(startRoom)` + HUD → 卸载房间、flush 存档 |
| Dialogue / Shop | playing 内 overlay | 面板置顶、锁玩法输入、duck BGM → `game:dialogue-end` / 恢复输入 |
| Paused | playing 内 overlay | 冻结 dt、继续/设置/退出 → 恢复 |
| Cutscene | `scene("cutscene")` | 预载分镜、可跳过 → `game:cutscene-end` → clear |
| LevelClear / Fail | `scene("clear")` / playing 内 overlay | 结算写档 / 播 `sfx.fail`；Fail 重试回检查点或回 Title |
| ToBeContinued | `scene("tbc")` | 「未完待续」+ 梗收集 → 回 Title |

**迁移规则**：`goState()` 是唯一入口，先写 `app/state` 再 `go(sceneName)`，禁止 scene 内直接 `go()`；Fail/Paused 只能来自 Playing；overlay 同时只有栈顶接收输入；每个 scene 必须在 `onDestroy` 清理订阅与定时器。将来若 Cutscene 需回退到 Playing，按 §8 改为 overlay。

## 5. 交互与表现

| action | PC 键鼠 | 触控 | 说明 |
|---|---|---|---|
| `moveLeft` / `moveRight` | A/D、←/→ | 左下方向区（可滑按换向） | 同时按取最后按下者，不叠加 |
| `jump` | 空格 / W / ↑ / Z | 右下「跳」 | 按下走 jumpBuffer、松开走 jumpCut |
| `interact` | E / Enter | 「交互」 | NPC/商店/门，与跳分离防误触 |
| `shoot` | J / X / 鼠标左键 | 「射击」 | 沿朝向，无瞄准 |
| `pause` / `confirm` / `skip` | Esc/P、Enter、空格 | 右上暂停、面板「继续」/「跳过」 | 暂停开 overlay；确认与跳过供对话/过场共用 |

触控：左下方向区 2 热键 + 拖拽判断，右下三键；每个 pointer 独立记录 `pointerId`，支持「左手按住方向 + 右手连跳/射击」；按钮热区比视觉大 8px；`touch-action: none` 防页面滚动。键盘：仅在画布聚焦时 `preventDefault`，忽略 `keydown.repeat`；`visibilitychange` 转隐藏自动 Paused（不自动恢复）。减少动效：转场 150→0ms、闪烁改透明度慢变、粒子减半，判定不变。受击闪白 + 轻微震屏；暴露过半出边缘暗角；激光 telegraph 数值见 20/21；所有音效只经 `audio.ts`，缺失静默不阻塞。

## 6. 边界与异常

| 场景 | 处理 | 用户可见 |
|---|---|---|
| localStorage 不可用/隐私模式 | 降级内存存储，不抛错 | toast「本次进度不会保存」 |
| 存档 JSON 损坏/字段缺失、版本高于当前 | 备份 `.bak` + 默认值 + warn 一次；高版本只读兼容字段不覆盖写 | toast「存档已重置」/「存档来自更新版本」 |
| 音频文件缺失 | 记入 missing、warn 一次、no-op | 无感静默 |
| 无 WebGL2 / context lost | 显示 DOM 说明页；lost 时暂停并提示刷新 | 「请升级浏览器或换设备」 |
| 切后台/锁屏、旋转屏幕 | dt 钳制 50ms；转隐藏自动暂停；resize 防抖重算外壳 | 回来停在暂停、画面重排不变形 |
| 多点触控 / 键盘失焦 | pointerId 独立处理；失焦清空 held 防卡键 | 可并发操作、无卡键 |
| 连点交互/购买、金币不足 | overlay 吞输入 + 按钮 200ms 防抖；校验失败不扣款 | 「金币不足」+ 抖动 |
| 失败瞬间再受击、Boss 死亡瞬间命中、快速连切房间 | Fail/结算后冻结玩法，伤害与胜利判定提前 return；切房间事务锁 + 淡出期忽略触发 | 不重复音效/结算、不加载两个房间 |
| 帧率 <45fps 持续 3s | 粒子上限减半、关震屏 | 无感 |
| 子路径部署 / 中文 emoji 缺字 | 全相对路径；系统字体栈回退、汉字兜底 | 无 404、占位可读 |

## 7. 与其他模块的接口

### 7.1 事件（payload 草案，名称见简报 §4）

| 事件 | payload | 发射方 → 主要订阅方 |
|---|---|---|
| `game:level-start` | `{levelId, roomIndex}` | playing → hud/audio |
| `game:room-enter` | `{levelId, roomIndex, roomId}` | room-loader → state/hud |
| `game:player-damaged` | `{amount, hp, coins, source}` | combat → hud/audio/ui |
| `game:player-died` | `{reason, roomIndex}` | combat → fsm(Fail)/audio |
| `game:coin-changed` / `item-acquired` | `{coins, delta}` / `{itemId}` | shop/pickup → hud/save |
| `game:shop-opened` | `{shopId, items}` | playing → ui/audio |
| `game:shop-purchased` | `{itemId, price, coins}` | shop → save/audio |
| `game:dialogue-start` / `end` | `{dialogueId}` / `{dialogueId, skipped}` | dialogue → ui/fsm/audio |
| `game:cutscene-start` / `end` | `{cutsceneId}` / `{cutsceneId, skipped}` | cutscene → audio/fsm |
| `game:boss-phase` | `{bossId, phase, hp, hpPct}` | boss → hud/audio |
| `game:boss-defeated` | `{bossId}` | boss → fsm/save |
| `game:level-complete` | `{levelId, timeMs, deaths}` | playing → save/fsm |
| `game:fail` / `retry` | `{reason, roomIndex, bossPhase}` / `{roomIndex, bossPhase}` | combat/fsm → save/audio |

### 7.2 内容数据 TS 草案（最终以 02 为准）

```ts
export type LevelId = "level1" | "level2";
export type ArtSlot = `art/${string}`;
export type AudioId = `sfx.${string}` | `bgm.${string}`;
interface Vec2 { x: number; y: number }  interface Size { w: number; h: number }
interface Rect { x: number; y: number; w: number; h: number }
export interface LevelDef { id: LevelId; title: string; startRoom: number;
  rooms: RoomDef[]; bossId?: string; bgm: AudioId; introDialogue?: string }
export interface RoomDef { id: string; kind: "platform" | "boss" | "shop";
  solids: Rect[]; spawns: EntitySpawn[]; entries: Record<string, Vec2>;   // 来源房间 → 落点
  camera: Vec2; trigger?: { kind: "shopTimer" | "dialogue"; id: string } }
export interface BossDef { id: string; name: string; hp: number;
  hitbox: Size; artSlot: ArtSlot; phases: BossPhaseDef[] }
export interface BossPhaseDef { id: string; enterAtHpPct: number;   // 1 = 开局
  attacks: { kind: "laser"|"shockwave"|"bullet"; interval: number; telegraph: number }[];
  invulnerable: "none"|"bullets"|"all"; victory: "defeat"|"shoe"; shoeHitboxes?: Rect[] }
export interface NpcDef { id: string; name: string; roomId: string; pos: Vec2; artSlot: ArtSlot;
  dialogueId?: string; effect?: { kind: "buff"|"damage"|"meme"; amount?: number } }
export interface ItemDef { id: string; name: string; desc: string; price: number; artSlot: ArtSlot;
  effect: { kind: "weapon"|"heal"|"shoe"|"upgrade"; amount?: number } }
export interface DialogueDef { id: string; autoNext?: boolean;
  lines: { speaker: string; text: string; sfx?: AudioId; portrait?: ArtSlot }[] }
type EntitySpawn = { kind: string; id?: string; x: number; y: number };
```

### 7.3 关键系统签名

```ts
type GameState = "Boot"|"Title"|"LevelIntro"|"Playing"|"Dialogue"|"Shop"|"Cutscene"|"Paused"|"LevelClear"|"Fail"|"ToBeContinued";
goState(next: GameState): boolean;                       // guard 失败返回 false
type ActionId = "moveLeft"|"moveRight"|"jump"|"interact"|"shoot"|"pause"|"confirm"|"skip";
input.held(a) / pressed(a) / axis();  input.update(dt): void;
loadRoom(levelId: LevelId, roomIndex: number, entry?: string): void;  unloadRoom(): void;
applyDamage(amount, source): boolean;  segmentHitsRect(a, b, r): boolean;   // 后者纯函数
updateExposure(dt, visible, prev): Exposure;  tryShoeHit(boss, player): boolean;
readSave() / writeSave(s) / flushSave();  playSfx(id) / playBgm(id) / duckBgm(t, ms);
```

### 7.4 与 02 的对齐

§7.2 是草案，02 冻结后以 02 类型为准；待对齐点：`SaveV1` 完整字段（本文只列引擎所需）、`EntitySpawn` 判别联合、`RoomDef.entries` 键约定、`BossPhaseDef.shoeHitboxes` 归属 02 还是 21、`NpcDef.effect` 归属 02 还是 30。dev 的 `validateContent()` 只校验 02 定义的字段，避免双份真源。

## 8. 扩展点

| 想加什么 | 只改 | 不用改 | 检查项 |
|---|---|---|---|
| 新房间 | `content/levels/*.ts` 的 `rooms[]` | room-loader | entries 落点、trigger id、校验通过 |
| 新关卡 | `levels/levelN.ts` + 注册表 + Intro 数据 | fsm/scenes | LevelId 联合、下一关映射 |
| 新 Boss | `content/bosses/bossN.ts` + 关卡引用 + `art/bosses.ts` | boss.ts 阶段机 | 招式 kind 已支持 |
| 新 NPC/对话/商品 | `content/npcs` `dialogue` `items` + `art/npcs.ts` | scenes/shop | dialogueId 引用完整、价格 ≤ 金币投放 |
| 新资源（音效/BGM/贴图） | `audio-manifest.ts` / `assets/manifest.ts` + 放文件 | audio.ts / 全部绘制代码 | 缺文件仍静默、尺寸与槽一致 |
| 新操作（冲刺等） | `input.ts` 加 action + 映射 + balance 参数 | 场景层 | PC/触控双端映射 |
| 新全局事件 | 先改 00-brief §4，再改 `GameEventMap` | — | `game:*` 命名、payload 有类型 |
| 无 WebGL 平台 | 替换 boot 的能力探测分支 | 玩法代码 | 降级页文案 |

## 9. 验收标准

- [ ] `npm run dev` 起服：960×540 letterbox，缩放不变形、无滚动条；11 个状态迁移与 §4 一致，非法迁移被 guard 拒绝；每个 scene 卸载后事件订阅数为 0。
- [ ] 第一关 4 房间可进出，离开房间后 `room` 实体归零，往返 20 次无内存增长，相机固定仅 shake；新增/删除一个房间只改 content 即生效；`validateContent()` 能拦住缺 Boss/缺对话/重复 id。
- [ ] 8 个 action 在 PC 与触控下行为一致；jumpBuffer/coyote/jumpCut 生效；触控可同时「按住右+连跳+射击」；切后台回来不瞬移不穿模，失焦后无卡键，旋转屏幕按键位置正确。
- [ ] 无敌帧内不扣血；同帧多源伤害只结算一次；子弹 700px/s 不穿 32px 瓦片；遮挡时视线判为不可见。
- [ ] 暴露计时在 2.5s 阈值/3× 衰减下与单测一致，50% 预警出现；二阶段子弹不扣血，碰鞋可触发胜利。
- [ ] 17 个 `game:*` 事件均有发射点与订阅点，payload 编译期校验；刷新后金币/进度/设置恢复，损坏存档重置且不白屏。
- [ ] 删除 `public/audio/` 全部文件可完整通关，无报错刷屏，每 id 只 warn 一次；放入 `fail.ogg` 即响。
- [ ] 每个 `ArtSlot` 都有 DrawFn 或贴图，全部缺图也能显示可辨识的扁平矢量形象。
- [ ] `npm run build` 产物可在子路径静态托管运行；手机局域网可访问、横屏可玩、60fps（低端机 ≥50fps 自动降级）；无 WebGL2 显示说明页。

## 10. 风险与待确认

**假设（已按此推进）**：① 单机、无联网、无账号，单档位 localStorage；② 依赖仅 kaplay/vite/typescript（+开发态 vitest），不引入图片/字体/视频资源；③ 房间恒为 960×540，不做滚动镜头；④ Cutscene 是独立 scene（单向终点），Fail 是 playing 内 overlay（秒重试）；⑤ 只有触屏设备提示横屏；⑥ 伤害无敌帧 1.2s、接触冷却 0.2s 是引擎层新增参数，不进 00-brief 全局表；⑦ 碰鞋胜利的具体数值归 20/21，本文只提供判定原语与 `BossPhaseDef.victory` 开关。

**待用户拍板**

1. 无 WebGL2 时接受「只显示说明页」，还是要额外做 Canvas2D 降级？（后者成本高、KAPLAY 主要走 WebGL）
2. 是否需要线上托管并提供最终 URL？若需要，目标域名/子路径是什么？
3. `sfx.fail` 的文件名与格式是否确定为 `public/audio/fail.ogg`？（若为 mp3/wav 请告知）
4. 存档是否要「多档位/云同步」？（默认单档，不做）

## 11. 与其他模块的接口汇总

| 模块 | 给我什么 | 我给什么 |
|---|---|---|
| 00-brief | 技术栈、事件名、全局数值、资源槽命名、美术=矢量 | 全文约束 |
| 02 数据契约 | `SaveV1` 完整 schema、内容字段最终定义 | §7.2 草案、§7.4 待对齐点 |
| 10 核心玩法 | 手感语义、暴露计时、商店经济规则 | `applyDamage`/`updateExposure` 等原语签名 |
| 20/21 Boss | 招式 kind、阶段阈值、碰鞋规则 | `BossPhaseDef` 结构、`tryShoeHit` 判定 |
| 30/31 叙事音频 | 对话/过场分镜、音频清单与触发时机 | 事件 payload 表、音频加载约束 |
| 40/41 UI/动效 | 色板、动效时长、触控布局 | art 色板规则、layout 常量、resize/DPR/安全区规则 |
| 51 交付计划 | 任务顺序与验收反馈 | §3 参数、§9 checklist、§8 扩展点 |
