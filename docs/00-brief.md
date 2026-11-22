# 《物化帝笑传》· 团队共用简报（只读，Lead 维护）

> 所有模块文档必须遵守本简报的约定；模块文档可以细化本简报，但不得改动第 4/5 节的顶层命名和全局数值，如确需改动在文末「待确认」里提出。

## 1. 一句话目标

把班里的梗做成一款「iwanna 式」网页闯关小游戏：**精准平台跳跃 + 搞笑演出 + 每关 Boss 战 + NPC 对话**，当前两关，第二关通关显示「未完待续」，失败播放失败音效（音效文件稍后由用户提供）。

- 游戏名：**《物化帝笑传》**
- 主角：**物化帝本人**（学生，班级昵称；已获用户确认），名字可配置、形象用程序化扁平矢量生成
- 本轮范围：**只交付设计 + 开发文档**（已确认）；代码实现等设计确认后开工
- 「移动端和 PC 端的视频」= 移动端 / PC 端**适配**（已确认，无视频制作需求）
- 世界观基调：校园 + 荒诞喜剧 + 一本正经地胡说八道；梗用原文，不改写、不解释到失去味道。

## 2. 技术与平台（已定，模块文档不要再选型）

- 引擎：**KAPLAY**（kaboom 后继者，npm 包名 `kaplay`），**TypeScript + Vite**，纯前端，无后端。
- 构建：同一份构建同时服务移动端浏览器与 PC 浏览器；部署为静态站点。
- 逻辑分辨率 **960×540（16:9）**，等比缩放 + letterbox；DPR 自适应；房间制（每屏一个房间，不做自由滚动镜头）。
- 移动端横屏优先；触控操作；PC 键鼠操作。
- 文本：简体中文；系统字体栈优先（不打包字体）。
- 美术：**代码生成的扁平矢量风格**（已确认）：统一色板 + 描边几何图形 + 纯色/渐变块 + 汉字/emoji 点缀，全部用 KAPLAY 图形 API 程序化绘制，不引入外部图片；每个视觉元素同时定义可替换资源槽（文件名/键名写进文档），后期可无缝换成手绘素材。
- 音频：全部占位/静默兜底。用户稍后提供失败音效，故音频系统必须支持「逻辑 ID → 文件缺失时静默 + 控制台 warn 一次」。音效逻辑 ID 见第 6 节。
- 依赖限制：除 `kaplay`、`vite`、`typescript` 外不新增运行时依赖；本轮**只写文档**，不要 `npm install`、不要建代码文件。

## 3. 文档硬性要求（每份模块文档都按这个结构写）

中文 Markdown，结构固定、顺序固定：

1. 目标与范围（本模块做什么、不做什么）
2. 机制 / 规则（玩家实际看到、感受到的规则）
3. 数值与参数表（参数名 | 建议默认值 | 单位 | 调参影响；全局已定的数值直接引用，不要重复定义）
4. 流程 / 状态机（Mermaid 或文本流程图 + 状态迁移表）
5. 交互与表现（操作、反馈、镜头、动效、音效、**逐字文案**）
6. 边界与异常（失败、连点、低帧、无音频、触控多点、键盘焦点等）
7. 与其他模块的接口（读写哪些数据、发/收哪些事件、依赖哪些文件）
8. 扩展点（后续加关卡 / NPC / Boss / 商品怎么加，做到不改核心代码）
9. 验收标准（可勾选 `- [ ]` checklist，每条可测）
10. 风险与待确认（明确写出你的假设 + 需要用户拍板的问题）
11. 与其他模块的接口汇总（谁给我什么、我给谁什么）

其他要求：
- 多用表格 / 清单，少写空话；**150–350 行**。
- 不写实现代码（伪代码、JSON/TS 数据样例、公式可以）。
- 同一数值只出现一次（放在数值表），其他章节引用参数名。
- 文案（Boss 气泡、NPC 台词、UI 标签、失败提示）必须逐字给出。
- 完成后一次性写全（不要半截），报告 3–5 行摘要 + 文件路径 + 待确认问题；**不要中途停下来等确认**，假设写进第 10 节。
- 只写分配给你的文件，禁止改别人的文档、00-brief、README。

## 4. 顶层状态机与事件（不可改名，可细化）

```
Boot → Title → LevelIntro(n) → Playing
Playing ⇄ (Dialogue | Shop | Cutscene | Paused)
Playing → LevelClear(n) | Fail
Fail → Retry（回到当前房间/阶段检查点）
LevelClear(1) → LevelIntro(2)
LevelClear(2) → ToBeContinued
```

事件名（KAPLAY 自定义事件 / 轻量事件总线 `game:*`）：

`game:level-start` `game:room-enter` `game:player-damaged` `game:player-died`
`game:coin-changed` `game:item-acquired` `game:shop-opened` `game:shop-purchased`
`game:dialogue-start` `game:dialogue-end` `game:cutscene-start` `game:cutscene-end`
`game:boss-phase` `game:boss-defeated` `game:level-complete` `game:fail` `game:retry`

## 5. 全局数值 v0.1（最终以 `docs/02-data-contracts.md` 为准；全部集中在 `src/config/balance.ts`）

**角色手感**（像素 / 秒）

| 参数 | 默认值 | 说明 |
|---|---|---|
| 跑速 runSpeed | 220 | 最高水平速度 |
| 加速度 accel | 3000 | 地面加速 |
| 摩擦 friction | 2800 | 松手减速 |
| 重力 gravity | 1900 | |
| 起跳速度 jumpVel | 640 | 向上 |
| 短跳系数 jumpCut | 0.45 | 松开跳跃键时 vy 乘数 |
| 土狼时间 coyote | 0.10 s | 离开平台后仍可跳 |
| 跳跃缓冲 jumpBuffer | 0.12 s | 落地前按跳生效 |
| 最大下落 maxFall | 1000 | |
| 角色碰撞盒 | 20×28 | 设计网格 32px；房间数据用像素矩形（不做严格 tilemap） |
| 踩 / 交互半径 | 56 px | 商店、NPC 触发 |

**第一关（笑长 · 视线）**

| 参数 | 默认值 | 说明 |
|---|---|---|
| 房间数 | 4 | 3 个平台跳跃房间 + 1 个 Boss 礼堂 |
| 金币投放 | 14 枚 × 1 | 商店价格 10，保底玩家买得起 |
| 商店出现时间 | 45 s | 进入 Boss 房间后计时，或第 3 房间入口即触发（取先到） |
| 视线暴露阈值 | 2.5 s | 连续暴露累计，满则失败 |
| 暴露读条衰减 | 3× | 离开视线时按 3 倍速回落 |
| 视线预警 | 50% | 读条过半出现边缘暗角 + 心跳音 |
| 激光预警 telegraph | 0.8 s | 蓄力提示，眼睛变红/闪 |
| 眨眼安全窗 | 1.2 s / 每 4 s | Boss 眨眼，激光熄灭 |
| 商店价格 | 10 金币 | |
| 购买过场总时长 | ≈6 s | 气泡 2.2s + NPC 夺枪 0.4s + 动画 1.2s + Boss 倒地 1.5s + 通关 0.7s |

**第二关（Boss · 消耗战）**

| 参数 | 默认值 | 说明 |
|---|---|---|
| 初始血量 | 5 | 心形 HUD |
| 初始金币 | 15000 | 第二关开局补给（来源文案由叙事模块定） |
| 受击惩罚 | -1 HP，-5000 金币 | 同时扣 |
| 金币拾取 | +2500 | Boss 受击掉落，用于续命 |
| Boss 血量 | 100 | |
| 子弹伤害 | 4 | 满血约 25 发 |
| 射击冷却 | 0.25 s | |
| 子弹速度 | 700 | |
| 巨大化阈值 | ≤40 HP（40%） | 进入第二阶段，子弹失效/刮痧，改为「碰到鞋」获胜 |
| 巨型阶段冲击波 | 每 2 s 一道 | 需跳跃躲避 |
| 失败条件 | HP≤0 **或** 金币≤0 | 任一扣光即失败 |

> 所有数值都是 v0.1 可调值，文档里标注「调参影响」。

## 6. 内容数据与资源约定

- 内容数据化：关卡、房间、NPC、对话、Boss、商品、物品、梗，全部是数据（`src/content/*.ts`），新增内容不改引擎代码。
- 音频逻辑 ID（缺失时静默 + 只 warn 一次）：
  `sfx.fail`（用户后续提供 → `public/audio/fail.ogg`）、`sfx.jump` `sfx.land` `sfx.coin` `sfx.hurt` `sfx.shop` `sfx.purchase` `sfx.gunshot` `sfx.laser` `sfx.warning` `sfx.dialogue` `sfx.buff` `sfx.phase`、`bgm.title` `bgm.level1` `bgm.boss1` `bgm.level2` `bgm.boss2`。
- 存档：`localStorage` key **`cmi.save.v1`**，字段：`version` / `settings`（音量、减少动效、控制方案）/ `progress`（已解锁关卡、当前关卡、金币、持有物品、已看过的过场）/ `memes`（已收集梗）/ `stats`（死亡次数、通关时间）。完整 schema 见 `docs/02-data-contracts.md`。
- 可替换资源槽命名：`art/player`, `art/boss1`, `art/boss2`, `art/npc/laowu` … 文档里列出即可，首版用图形占位。

## 7. 模块与文件分工（写作用范围）

| 模块 | 负责人 | 交付文件 |
|---|---|---|
| M0 总览 / 数据契约 / README | Lead | `docs/00-brief.md`、`docs/01-overview.md`、`docs/02-data-contracts.md`、`README.md` |
| M1 核心玩法系统 | gameplay-systems | `docs/10-gameplay-core.md` |
| M2 关卡与 Boss | level-boss | `docs/20-level1-boss.md`、`docs/21-level2-boss.md` |
| M3 叙事 / NPC / 过场 / 音频 | narrative-content | `docs/30-npc-dialogue.md`、`docs/31-cutscene-and-audio.md` |
| M4 UI/UX / 动效 / 响应式 | ui-ux | `docs/40-ui-ux.md`、`docs/41-motion-responsive.md` |
| M5 工程架构 / 实现与测试计划 | engine-impl | `docs/50-engine-architecture.md`、`docs/51-quality-and-delivery.md` |

## 8. 角色与梗词表（统一用词）

| 名称 | 说明 | 固定文案（不要改写） |
|---|---|---|
| 物化帝 | 主角（默认名） | — |
| 笑长 | 第一关 Boss（校长梗） | 购买后头顶气泡：「你这玩意能大四人你知道不」 |
| 第二关 Boss | 名称待定（用户未给，文档用「第二关 Boss」占位） | — |
| 老吴 | NPC，唱歌给增益 | 「纱魔罗托」（歌名） |
| 小明 | NPC，对空气自言自语 | **不要写他说了什么**，用语气泡/省略号表现自言自语 |
| 食菌 | NPC | 「非洲怎么可能有香蕉呢…」 |
| 假生 | NPC，问话扣血 | 「都这个点了还没死呢」 |
| 子弹枪 | 道具，第一关获得，第二关可用 | 介绍：「潮的馈赠」 |
| 失败音效 | 稍后由用户提供 | 逻辑 ID `sfx.fail` |
| 未完待续 | 第二关通关后显示 | 「未完待续」 |

## 9. 写作纪律

- 你是这个模块的负责人：规则自己定死，别写「TBD/看情况/待定」当结论；真正需要用户拍板的放第 10 节。
- 模块之间通过第 4 节事件、第 5 节数值、第 6 节数据契约对接，发现冲突以本简报为准并记入第 10 节。
- 不要执行 `npm install`、不要创建 `src/` 代码、不要修改他人文件；只允许 `write/edit` 自己的文档（必要时 `read` 别人的）。
- 完成后用 `team_task_update` 把任务标记 complete，再给 Lead 发 3–5 行摘要。
