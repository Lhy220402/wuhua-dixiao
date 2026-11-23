# 《物化帝笑传》交接文档（v1.0 · 2026-11-23）

> ⚠ 2026-11-23 晚有未发布的 WIP（扇形视线/夺枪动画/Boss 审计修复/移动端）：**先读 `HANDOFF-WIP.md`**，再读本文件。

> 用途：把当前**已实现、已上线**的项目完整交给下一个对话 / 新 AI。
> 先读本文件，再按「第 3 节」读代码；设计文档在 `docs/`，`docs/02-data-contracts.md` 是唯一事实来源。
> 工作目录：`/root/workspace/wuhua-dixiao`

## 0. 一句话

《物化帝笑传》是一款 iwanna 式校园梗网页小游戏：精准平台跳跃 + 演出 + 两关 Boss + NPC 对话；手机横屏触控与 PC 键鼠共用一份构建；Kaplay + TypeScript + Vite；美术全部为代码生成扁平矢量；当前两关，第二关通关显示「未完待续」。

- **在线试玩**：https://idealismo10.github.io/WUHUADIxiaozhuan/
- **源码仓库**：https://github.com/idealismo10/WUHUADIxiaozhuan
- **本地产物**：`dist/`（静态托管）、`/sdcard/Download/DSH-Go/物化帝笑传-web.zip`

## 1. 当前状态（2026-11-23）

| 项目 | 状态 |
|---|---|
| 代码实现 | **已完成**，两关可玩，`src/` 约 40 个 TS/文件 |
| 依赖 | 仅 `kaplay`（运行时）+ `vite` / `typescript` / `vitest`（开发） |
| 测试 | `pnpm test` → **12 个文件 / 81 条全绿**（含扇形视线、Boss 战、夺枪过场、继续游戏软锁回归） |
| 构建 | `pnpm build` 通过；gzip 约 114KB JS + 6KB CSS |
| 上线 | **2026-11-23 已发布到改名后的仓库**：`idealismo10/WUHUADIxiaozhuan`，Pages 源 `gh-pages`（f8c50af），线上标题/开局/HUD/资源已验证 |
| 手机真机 | 横屏渲染、触控移动/跳跃、暂停、全屏按钮已验证；完整两关建议人工复跑 |
| 失败音效 | 用户提供的 mp3 已降噪/转码为 `fail.ogg` + mp3 + m4a；`sfx.fail` 已实际加载 |
| 待补 | 第二关 Boss 正式名；其余 17 个音效/BGM；少量打磨项见 §8 |

## 2. 用户已拍板 / 已实现的关键决策

| 事项 | 决定 |
|---|---|
| 主角 | 物化帝本人；**皇帝形象**（龙袍 + 冕冠 + 圆框眼镜），用户 2026-11-22 补充 |
| 第二关 Boss | **学生形象**（校服 + 方框眼镜 + 领带）；正式名字仍未给，UI 用「BOSS」/「第二关 Boss」占位 |
| 夺枪 NPC | 「潮」：仅过场出现的蒙面剪影，无台词，击毙笑长后把枪抛回主角 |
| 道具 | 子弹枪，介绍「潮的馈赠」 |
| 失败音效 | `public/audio/fail.ogg`（另附 mp3/m4a 兜底），缺失静默 + 每个 ID 只 warn 一次 |
| UI 分层 | 世界用 canvas（Kaplay），HUD/弹层/触控用 DOM 覆盖层 |
| 存档 | `localStorage` key `cmi.save.v1`，`.bak` 轮换、损坏档 `.bad`、隐私模式内存降级 |
| 商店 | 45s 后出现，10 金币买枪，金币不足时笑长撒币补到 10（`borrowed`） |
| 失败重试 | 第一关回本房间检查点；第二关 CP1/CP2，CP2 重试 HP≥3、金币≥15000、Boss 40、巨大化开场 |
| 固定文案 | 你这玩意能大四人你知道不 / 纱魔罗托 / 非洲怎么可能有香蕉呢… / 都这个点了还没死呢 / 潮的馈赠 / 未完待续 |

## 3. 阅读顺序

1. **本文件**（当前状态、命令、坑）
2. `README.md`（运行、操作、验收、已知偏差）
3. `src/config/balance.ts`（全部数值唯一来源）
4. `src/app/app.ts`（运行时编排：关卡/房间/战斗/商店/过场/失败重试）
5. `src/content/`（关卡/Boss/NPC/对白/道具/商品/过场/音频清单）
6. `docs/02-data-contracts.md`（数值/schema/事件/存档，唯一事实来源）
7. `docs/51 — 50 — 10 — 20/21 — 30/31 — 40/41 — 01`（设计文档；与 02 冲突以 02 为准）

## 4. 运行 / 测试 / 构建

```bash
cd /root/workspace/wuhua-dixiao
pnpm install        # 已装过可跳过；pnpm 12，已配置 esbuild 构建白名单
pnpm dev            # http://localhost:5173/ ，手机同局域网用 http://<IP>:5173/
pnpm test           # Vitest 纯逻辑单测（81 条）
pnpm typecheck      # tsc --noEmit
pnpm build          # dist/，base: "./"，可子路径托管
pnpm preview        # 预览生产构建
```

- 生产构建不要暴露 debug：`window.__CMI__` 只在 `import.meta.env.DEV` 下挂载。
- 真机调试可用 `pnpm dev --host 0.0.0.0`；手机浏览器打开局域网 IP。
- 本项目**必须 WebGL2**；无 WebGL2 会显示说明页（不是白屏）。

## 5. 目录与职责

```
index.html                  # DOM 壳、viewport、100dvh、安全区、rotate hint、boot
public/audio/               # fail.ogg/mp3/m4a + README（处理后）
src/
  main.ts                   # WebGL2 探测 → kaplay() → 场景 → 错误显示
  style.css                 # DOM 设计 token / HUD / 弹层 / 触控 / 响应式
  app/
    fsm.ts                  # 11 状态迁移 + overlay 栈
    state.ts                # RuntimeState / checkpoint / save 同步
    app.ts                  # 顶层运行时（最大文件，约 1.7k 行）
  config/
    balance.ts              # 全部可调数值（唯一来源）
    theme.ts / layout.ts    # 色板 / 逻辑坐标 / 触控尺寸
  core/types.ts             # Vec/Rect/ActionId/事件 payload/工具
  save/                     # schema / serialize（纯函数）/ storage（localStorage 兜底）
  systems/
    input.ts                # 8 action；键盘/鼠标/触控/多 pointer；边沿在帧末清理
    physics.ts              # 积分、AABB、土狼、跳跃缓冲、短跳、掉坑
    geom.ts                 # 线段-矩形相交（视线遮挡）
    vision.ts               # 暴露读条纯函数
    shop.ts                 # 扣款/借币纯函数
    combat.ts               # 统一伤害结算纯函数
    boss.ts                 # 阶段阈值 / 刮痧 / 掉币
    laser-boss.ts           # 笑长激光状态机（idle/telegraph/sweep/recover/blink）
    arena-boss.ts           # 第二关 A1–A6、阶段、巨型攻击
    dialogue-runner.ts      # 逐字机 + 跳过
    cutscene-player.ts      # 数据驱动过场时间轴
    audio.ts                # 逻辑 ID → 文件；缺失静默 + warn 一次
    events.ts               # game:* 类型化事件总线 + 40 条事件环
  content/
    levels/level1.ts        # R1–R4 像素布局、金币、尖刺、眼位、挂牌、商店
    levels/level2.ts        # 竞技场、讲台、Boss 受击盒、鞋
    bosses/                 # 笑长 / 学生 Boss 数据
    npcs.ts / dialogue.ts   # 四 NPC + 逐字台词（小明 lines: []）
    items.ts / shops.ts / buffs.ts / memes.ts / cutscenes.ts / audio-manifest.ts
  art/                      # 代码生成扁平矢量：玩家/笑长/Boss2/NPC/瓦片/物品/FX
  ui/                       # HUD / 对话 / 商店 / 过场跳过 / 标题/暂停/失败/结算/TBC / 触控
  tests/                    # 12 个 vitest 文件，81 条
docs/                       # v0.1 设计文档（冻结）
screenshots/                # 手机实机、音频处理前后频谱
```

## 6. 关键实现说明（改代码前先看）

### 6.1 数值与内容
- 所有玩法数值在 `src/config/balance.ts`；系统里禁止硬编码。
- 关卡/NPC/Boss 阶段/商品/梗都在 `src/content/`，`content/index.ts` 的 `validateContent()` 在 dev 启动时校验引用完整性。
- 加关卡：加 `LevelDef` + 注册 `CONTENT.levels`，再在通关链里加解锁；加 Boss 阶段：只加 `BossPhaseDef`/`AttackDef`。

### 6.2 逻辑坐标与世界
- 960×540；脚底 y=512（地板顶 512，高 28）。**文档 02 的礼堂示例写 500/470，与 20/21/30 不一致；实现按 512 统一**。
- Canvas 用 CSS `aspect-ratio: 16/9` + `min(100%, 100dvh*16/9)` 做 letterbox；不要改回 `width:100%;height:100%`，否则手机横屏会拉伸、只看到天空。
- 相机固定；`k.shake()` 只抖 canvas，DOM UI 不抖。

### 6.3 输入
- `InputSystem` 帧末 `endFrame()` 清 `pressed`；**不要在帧首清**，否则对话/过场跳过会偶发丢键（已踩过坑）。
- 键盘映射：A/D/←/→ 移动；Space/W/↑/Z/K 跳；E/F/Enter 交互；J/X/鼠标左键射击；Esc/P 暂停。
- 触控每个 pointer 独立，左/右后按下者生效；触控按钮多指可同时按。
- 触控控件用 `@media (any-pointer: coarse)` 显示；HUD 有全屏按钮（触控设备）。

### 6.4 第一关视线（2026-11-23 改为扇形“目光”）
- `LaserBoss` 状态机：idle 0.4 → telegraph 0.8 → sweep（P1≈1.882s / P2 1.8s / P3 4.0s）→ recover 1.0；4 轮循环 P1/P1/P2/P3。
- **每只出束眼从瞳孔射出一个扇形**（半角 8°，`BALANCE.level1.gazeFanHalfAngle`）：玩家身体 3×3 采样点任一点落在扇形内、且到瞳孔连线未被挂牌挡住 → 暴露。挂牌后是斜向阴影。
- 扇形中心射向地面瞄点：P1 右眼 160→800、P2 左右眼反向对扫、P3 预警期追踪玩家 x 后锁死。
- 眨眼每 4s 闭眼 1.2s；眨眼期间扇形/判定同时消失，睁眼后若原本在扫射会恢复。
- 暴露读条 +1/s、离开 3× 回落、2.5s 失败；老吴 buff ×0.6 / 25s / CD 60s。
- **P3 锁定 4.0s**（原文档 1.2s）：锁定后停在锁定点不再追人；站着不动 2.5s 读条打满，开火瞬间横移可躲。
- 第一关 R2/R3 加了 64px 坑以满足「掉坑失败」；R1 地面完整教学。

### 6.5 第一关商店/过场
- 计时从进入 R3 开始；45s 解锁；在 R4 出现（延迟 1s）；金币<10 借到 10。
- 打开商店冻结世界；购买扣 10 → `game:shop-purchased` → 220ms 后 `l1_gun_gag` 6s 过场。
- 过场 step：气泡 2.2s → 潮冲入 0.4s → 枪响 0.3s → Boss 倒 1.5s → 抛枪/给道具 0.7s。
- **2026-11-23 夺枪动画重做**：潮从右侧冲向玩家（锚点=购买时玩家 x，不再固定冲到画面中央 520）、带速度线与尘土；枪响有枪口火光 + 曳光到笑长、命中闪；笑长连人带椅侧倒、帽子掉落、扬起尘土；潮把枪沿抛物线旋转抛回玩家手里。过场开始即 `laserBoss.reset()`、读条清零、玩家无敌（docs/20 §2.5）。
- 过场可跳过：0.3s 保护期后首次加速 2.5×，再按跳到收尾；跳过不影响状态迁移。
- 夺枪后才把 `bullet_gun` 加入物品栏，避免“买完没看演出就入包”。

### 6.6 第二关
- `ArenaBoss` A1 三连追踪 / A2 粉笔雨 / A3 地面冲击波 / A4 香蕉皮 / A5 巨型冲击波 / A6 巨足踩踏。
- 受击 `resolveDamage`：−1 HP、−5000 金币，1.2s 无敌；香蕉是滑倒不是伤害。
- 每 3 次有效命中掉 2500；场上最多 5 枚、8s 消失、磁吸。
- Boss HP≤40 触发 3s 转阶段过场；巨型期间子弹刮痧（−0 / 刮痧 toast），不掉币。
- 阶段 2 鞋判定 192×64（x640–832 / y448–512），1.0s 后激活；**若转阶段时玩家在鞋框内，会软推到 x=560**，避免瞬赢。
- 失败回 CP1/CP2；CP2 重试直接巨大化、1.5s 无敌。
- 碰鞋 → 3s 胜利过场 → LevelClear → **未完待续**。
- **2026-11-23 Boss 战修复**：A2 粉笔雨按玩家过去 1.5s 等距采样（旧实现 5 个落点几乎叠在一列；站桩时也会铺开）；A6 踩踏在预警时锁定落点（旧实现影子在旧位置、脚落在玩家新位置，躲不掉）；A3 冲击波预警改画在 Boss 脚下；同帧受击与碰鞋胜利改为胜利优先；香蕉皮不再每帧重复红闪/刷滑倒（底层 0.3s 去抖）；讲台掩体从 `room.desks` 传入，移除 arena-boss 里的硬编码坐标。
- **2026-11-23 二轮修复（独立审计）**：A5/A6 改为独立计时 + 独立 pending，计时器保留帧超期量（`+= interval`），预警间隔恢复 ≈2s/≈3s（旧版被 telegraph 冻结成 3.4s/4.4s），同帧双到时 A6 延后 `giantStagger=0.35s`；A5 补 `onAttack` 预警音；转阶段那一发不再掉 2500 金币；`run.giant` 改到巨大化 1.2s 时刻才置 true；CP2 重试不再重复鞋气泡；香蕉皮底层 0.3s 去抖；A2 站桩时落点铺开；`game:retry` 改为按 bossPhase 推导 cp1/cp2。
- **2026-11-23 软锁修复**：第一关 R4 买枪后刷新（过场中/通关前）会回到无枪、无商店、无出口的 R4。`planResume()` 现在判断：枪未入包 → 回 R4 补播夺枪过场（玩家放回商店位置）；枪已入包且已结算 → 直接进第二关并补发 15000。用 `npcFlags.l1_cleared`（buyGun 写 false、markLevelComplete 写 true）区分“5.3s grantItem→6.0s 结算”的 0.7s 窗口，避免少记通关；旧档无该键时用“有枪+看过过场”推断。`src/tests/resume.test.ts` 覆盖 7 条分支，运行时用 localStorage 四种存档验证。

### 6.7 存档
- `SaveV1` 字段见 `src/save/schema.ts` 与 `docs/02 §4`；纯函数序列化在 `serialize.ts`，localStorage 在 `storage.ts`。
- 写档时机：房间切换、金币变化（防抖 300ms）、通关、设置变更、页面隐藏 `flush`。
- 损坏/版本不匹配：`.bad` 备份、默认档、toast；隐私模式自动内存降级。
- 第二关阶段重试以 `RuntimeState.checkpoint` 为准，不用存档回滚。

### 6.8 音频
- `AudioManager` 逻辑 ID → `public/audio/<name>.ogg`，自动尝试 `ogg→mp3→m4a`；每个 ID 只 warn 一次。
- 首版只有 `fail.ogg`；其余缺失静默。放入同名文件即生效，无需改代码。
- 首次用户手势后解锁；BGM 缺失不阻塞。失败瞬间 `playSfx('sfx.fail')`。

### 6.9 DOM UI
- `#ui-root` 覆盖层；`#stage` 内 canvas；`world-layer` 按 canvas rect 缩放用于世界气泡。
- HUD 事件驱动更新；对话/商店/暂停/失败/结算/TBC 都是 DOM。
- 过场有全屏透明 skip 层 + 右上「跳过 ▸▸」按钮，触控可用。
- 减少动效：`prefers-reduced-motion` + `body.reduce-motion`，设置写存档。

### 6.10 跳跃手感（2026-11-23 修复）
- `jumpCutDelay = 0.12s`：起跳后 0.12s 内不结算短跳，避免触屏轻点（<1 帧）只跳 20–37px。
- 实测：轻点约 **69px（2.2 格）**，按住约 **103px（3.2 格）**；数值在 `BALANCE.player.jumpCutDelay`。
- R1 上层平台从 `x480` 移到 `x352`、R3 从 `x448` 移到 `x288`，因为原横距 192px 超出 96px 高度差下的跳跃弧（约 98px）。
- `src/tests/physics.test.ts` 覆盖轻点/按住高度、短跳只结算一次、空中不可二段跳。

### 6.11 笑长激光判定修复（2026-11-23）
- **P2 双眼交叉完全不动**：交叉分支的目标写反（两束都瞄向自己起点），两束永远停在 x=160/800，整段攻击无威胁。改为左束往右端、右束往左端真正交叉。
- **预警期提前漂移**：横扫/交叉在 0.8s 预警期就执行了开火移动，预警线不是落点（P1 实际从 x≈432 而不是 160 开火）。改为预警期只让 P3 追踪，P1/P2 停在起始位置。
- **P3 锁定后继续追人**：`lock` 在 4.0s 锁定期间仍按 240px/s 跟随玩家，等于无解追踪。改为预警期追踪、开火后停在锁定点；站着不动 2.5s 读条打满，锁定瞬间横移可以躲。
- 单眼房间（R2）的交叉段原本是钉死在 x=800 的死光束，现在作为单束横向扫射。
- **P1 扫射时长改为按「行程/速度」推导 ≈1.882s**（用户 2026-11-23 拍板），扫满 160→800；P2 仍用 1.8s，攻击轮变成 ≈4.08s（见 §8.11）。
- 新增 `src/tests/laser-boss.test.ts`（10 条：P1/P2/P3 轨迹、终点、单眼、眨眼恢复、挂牌截断、锁定读条）与 `gazeFanHitsPlayer` 几何断言（4 条）；`pnpm test` 全绿（当前 81 条）。测试做过变异验证：去掉 P3 追踪、眨眼 active 恢复、P2 交叉修复会分别让对应用例失败。
- 顺手修了眨眼期间仍画 1px 预警线的视觉残留（眼睛已闭、判定冻结时不再画）。
- 无头运行时验证（Chromium `--use-angle=swiftshader-webgl` 可跑 WebGL2 + `window.__CMI__` 调试桥）：P3 锁定站着不动 2.5s → `Fail/gaze`；锁定后横移 → 暴露 0、不失败；P2 实机光束从 `[180,780]` 交叉到 `[380,580]`。

## 7. 验收记录（已跑）

| 项 | 结果 |
|---|---|
| `pnpm typecheck` | 通过 |
| `pnpm test` | 81/81 通过（12 文件，约 2s） |
| `pnpm build` | 通过，dist gzip ≈ 114KB JS + 6KB CSS |
| PC 全流程 | 标题→第一关→商店→买枪→过场跳过→结算→第二关→巨大化→碰鞋→TBC，全通 |
| 失败 | 尖刺/掉坑、视线满、HP≤0、金币≤0；失败页与 `sfx.fail` 正常 |
| CP2 | 失败重试后 HP≥3、金币≥15000、Boss40、giant=true、鞋 1s 后激活 |
| 存档 | 刷新继续（金币/房间/道具/设置）；损坏档 `.bad` + toast 重置 |
| 设置 | 减少动效/音量/控制方案写档并即时生效；暂停菜单正常 |
| 手机真机 | 横屏渲染/触控移动跳跃/暂停/全屏已截图；线上 GitHub Pages 可开局 |
| 生产子路径 | `dist/` 放在 `/WUHUADIxiaozhuan/` 下静态服务可跑，无 404（除故意缺失的音频） |
| 笑长激光判定 | 单测 + 无头运行时：P1 预警线即落点、P2 真交叉、P3 锁定冻结；锁定站着不动 2.5s 失败、横移不失败 |
| 线上发布（改名后） | 2026-11-23：master `9dd18ee`、gh-pages `f8c50af`；线上 JS SHA256 与本地 `dist` 逐字节一致；点击「开始」进入第一关 HUD；除故意缺失的音频外无 404 |
| 扇形视线 | 单测 + 无头运行时：从瞳孔发出 19 条采样、半角 8°、挂牌斜向遮挡；锁定站桩 2.5s → `Fail/gaze`，锁定后横移暴露 0 |
| 夺枪过场 | 无头运行时：锚点 864、潮冲到 906、枪响 2.6s、倒地 3.0s、抛枪 502→864、5.3s 入包、6.0s LevelClear |
| 第二关 Boss | 单测：A2 落点跨度 >100px（站桩也铺开）、A3 预警在 Boss 脚下、A6 落点=预警位置、A5/A6 间隔 2s/3s、转阶段不掉币、CP2 不重复气泡；运行时碰鞋优先于同帧伤害 |
| 继续游戏软锁 | `planResume` 单测 7 条：普通恢复 / R4 未拿枪补播过场 / 0.7s 结算窗口补播 / 旧档无标记推断 / 已结算直进第二关 / 矛盾档仍补播 / 第二关恢复 |

> 注意：本机 Playwright/无头 Chromium 默认 SwiftShader 参数下 Kaplay 的 WebGL2 会 context lost，无头截图里 canvas 是空的；这是测试环境限制，**真机手机/正常浏览器渲染正常**。不要据此误判游戏坏掉。
> 纯逻辑/运行时验证可用 `--use-gl=angle --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --ignore-gpu-blocklist` 启动 Chromium：WebGL2 可用、游戏循环可跑、`window.__CMI__.debugState()` 可取状态；截图仍可能是空白 canvas（context lost），不要以截图为唯一证据。

## 8. 已知偏差 / 技术债（按优先级）

1. 第二关 Boss 正式名未定 → `content/bosses/boss2.ts` 的 `name`、UI 的「BOSS」。
2. 其余 17 个音频 ID 未提供；`public/audio/` 放同名文件即可。
3. P3 锁定 4.0s（文档 1.2s）——为可玩性调参，已在 README 记录。
4. 死亡数字大动画（10 §2.3）未单独实现；失败页直接显示死亡计数。
5. 商店不买 60s 的激光加速未实现，只出「你搁这陪我唠嗑呢？」嘲讽。
6. R2/R3 坑为满足掉坑新增，与 20 的满地面网格图略有出入。
7. 金币不加千分位（02/10 明文，覆盖 40 的 `15,000`）。
8. iOS Safari 全屏/方向锁定能力有限，已静默降级；真机体验可能不如 Android。
9. **跳跃短跳**新增 `jumpCutDelay=0.12s`；R1/R3 上层平台横移，均已在上文 6.10 记录。
10. `git push` 在本机网络偶发超时；线上 master/gh-pages 最终通过 GitHub Git Data API 更新。**本地 HEAD 与远端 commit hash 可能不同，内容一致；新对话请先 `git fetch` 或重新 clone，再改，不要直接 force push。**
11. **P1 扫射时长改为 ≈1.882s（用户 2026-11-23 拍板）**：按「行程 640 / 速度 340」推导，保证 160→800 扫满；docs/20 写的 1.8s 只能扫 612px（终点 ~772），与 160→800 / 640px / 340px/s 互斥。P2 交叉仍是 1.8s；攻击轮周期由 4.0s 变为 ≈4.08s。实现见 `startSweep()`，没有新增 balance 数值。
12. **R3「交替单眼」只实现固定右眼出束**：docs/20 P1 表本身写“右眼”，而 §10 风险说明又写“交替单眼”。两眼的 y 相同、光束是同一根竖列，交替只影响哪只眼变红（美术），不影响判定；未改玩法，等需要时再定视觉方案。
13. **眨眼时的预警线（已修）**：`drawLaserBoss` 现在眨眼期间不再画 1px 预警线（眼睛已闭、判定冻结）；此前会残留一条没有判定的线。
14. **扇形视线**：docs/02 已补 `gazeFanHalfAngle=8°` / `gazeFanSlices=18`；docs/20 已改成“从瞳孔射出的扇形”。核心光束 6/10px 只剩视觉强化作用。
15. **A6 踩踏**：docs/21 原文“落点=玩家当前 x”与“预警期离开阴影”矛盾；实现改为预警时锁定落点（否则移动无法躲）。已同步文档措辞。
16. **移动端**：小屏横屏（≤720px）BOSS 血条缩到 34vw 避免和金币重叠；减少动效设置现在同时关闭 canvas 震屏（此前只关 CSS 动效）；移动端子代理补齐触控防粘键/滑出释放/全屏按钮隐藏等。
17. **继续游戏软锁（已修）**：买枪过场中刷新曾是死档；现在按 `planResume` 补播过场或直进第二关。建议真机回归：购买后立刻刷新、过场结束前刷新各一次。

## 9. 待用户提供

1. **第二关 Boss 名字**（外形已按“学生”实现）。
2. 其余音效/BGM（可选；缺失静默，不阻塞）。
3. 是否要 Gitee Pages 镜像：Gitee 新账号 `idealismo10` 下还没有本游戏仓库（只有 `traceless`、`crazy-water-cube`），需要先建仓并给推送凭据。
4. 是否补「梗图鉴」入口 / 死亡数字大动画 / 更硬核难度。

## 10. 发布与凭据

- GitHub：`idealismo10/WUHUADIxiaozhuan`；Pages 源为 `gh-pages` 分支，URL `https://idealismo10.github.io/WUHUADIxiaozhuan/`。
- **2026-11-23 账号/仓库改名**：GitHub 用户名 `Lhy220402` → `idealismo10`，仓库 `wuhua-dixiao` → `WUHUADIxiaozhuan`；旧地址由 GitHub 重定向。Gitee 用户名也改为 `idealismo10`，但本游戏尚未在 Gitee 建仓/发布 Pages 镜像。
- **发布记录（2026-11-23）**：`pnpm build` 后把 `dist/` 覆盖到 `gh-pages`（commit `f8c50af`），master 已推送（含激光修复与本文档更新）；线上 `assets/index-glJx25Xp.js` 的 SHA256 与本地 `dist` 完全一致。`base: "./"` 未改。
- 本机 `gh` 已登录该账号；**不要把 token 写进任何文件/提交/README**。
- 用户曾在聊天中贴过 GitHub PAT / Gitee token，建议发布完成后立即轮换/撤销。
- 更新线上：
  ```bash
  pnpm build
  # 方式 A：把 dist/ 推到 gh-pages
  # 方式 B（本机网络不稳时）：用 GitHub Git Data API 创建 tree/commit 并 PATCH gh-pages ref
  ```
- 线上构建注意：`base: "./"`，不要改成绝对 `/`，否则子路径 404。
- 当前线上 `gh-pages` 与 `master` 已包含跳跃修复；若本地与远端分叉，以远端内容为准，先拉取再改。

## 11. 常见问题

| 症状 | 处理 |
|---|---|
| 无头浏览器 canvas 空白 | SwiftShader/WebGL2 context lost；换真机/正常 GPU 浏览器验证 |
| 手机上画面只看到天空 | 检查 canvas CSS 是否被改回 `width:100%;height:100%`；必须是 16:9 letterbox |
| 对话/过场跳过偶发无效 | 检查 `InputSystem.endFrame()` 是否在 `GameApp.update()` 末尾调用 |
| 第二关转阶段瞬赢 | 检查 `endGiantCutscene()` 的鞋框软推 x=560 是否还在 |
| 失败音效不响 | 检查 `public/audio/fail.ogg` 是否在 `dist/audio/`，控制台是否 `[audio] missing sfx.fail` |
| 商店按钮点不到 | 确认 fsm 处于 `Shop`、`#ui-root` 没被其它层挡；`ShopPanel` 的 scrim 事件 |
| 线上 404 | 检查 `vite.config.ts` `base: "./"` 与 gh-pages 文件结构 |
| 存档损坏白屏 | `SaveStore.load()` 应返回默认档并 toast，不应抛异常 |

## 12. 验收清单（下一轮回归用）

- [ ] `pnpm typecheck` / `pnpm test` / `pnpm build` 全绿
- [ ] PC：新档第一关完整通关（含商店、过场、结算）
- [ ] PC：第二关两种失败（HP/金币）与 CP2 重试
- [ ] 手机横屏：触控移动/跳/射击/交互/暂停/全屏；完整两关
- [ ] 刷新继续、损坏档重置、隐私模式可玩
- [ ] 删除 `public/audio/` 后仍可通关，控制台每 ID 只 warn 一次
- [ ] 第一关 R2/R3/R4：扇形从眼睛发出、P1 扫满 800、P2 两束交叉、P3 锁定后不追人；眨眼/挂牌斜向阴影安全
- [ ] 夺枪过场：潮冲向玩家、枪响曳光、笑长连椅倒地、枪抛回手里；触屏可跳过
- [ ] 手机横屏：BOSS 血条不压金币、射击/跳跃/移动多指同时按、减少动效关震屏
- [ ] 固定文案逐字未改；小明无台词
- [ ] 线上 URL 可开局、资源无 404（音频除外）

---

**交接结论**：代码、构建、测试、线上发布、失败音效处理均已完成；剩余主要是内容补全（Boss 名/音频）与可选打磨，不需要重做架构。
