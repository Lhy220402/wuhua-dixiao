# 物化帝笑传 · 设计文档包

一款「iwanna 式」班级梗网页小游戏：精准平台跳跃 + 搞笑演出 + 两关 Boss 战 + NPC 对话，手机和 PC 都能玩。当前版本到第二关通关显示「未完待续」。

## 现在有什么

**这一轮只交设计与开发文档，还没写代码。** 文档共 12 份，v0.1 已完成（2026-11-22），覆盖玩法、关卡、Boss、NPC 对话、过场动画、UI/UX、工程架构和实现计划，确认后即可开工。

| 文档 | 内容 |
|---|---|
| [docs/01-overview.md](docs/01-overview.md) | 项目总览、两关流程、模块划分、里程碑、风险、待确认事项 |
| [docs/02-data-contracts.md](docs/02-data-contracts.md) | 全局数值、内容数据 schema、事件、存档、扩展流程（唯一事实来源） |
| [docs/10-gameplay-core.md](docs/10-gameplay-core.md) | 手感、房间与检查点、重试、金币经济、商店、物品栏、Buff |
| [docs/20-level1-boss.md](docs/20-level1-boss.md) | 第一关房间编排、笑长视线战、商店与夺枪过场触发 |
| [docs/21-level2-boss.md](docs/21-level2-boss.md) | 第二关 Boss 攻击模式、双资源、巨大化、踩鞋胜利 |
| [docs/30-npc-dialogue.md](docs/30-npc-dialogue.md) | 老吴 / 小明 / 食菌 / 假生 的对话与触发 |
| [docs/31-cutscene-and-audio.md](docs/31-cutscene-and-audio.md) | 夺枪平面动画分镜、失败画面、音效清单 |
| [docs/40-ui-ux.md](docs/40-ui-ux.md) | 设计 token、全部界面组件、HIG 触控与安全区 |
| [docs/41-motion-responsive.md](docs/41-motion-responsive.md) | Material 动效曲线与时长、双端布局、触控控件 |
| [docs/50-engine-architecture.md](docs/50-engine-architecture.md) | Kaplay 工程架构、目录、输入/音频/存档系统 |
| [docs/51-quality-and-delivery.md](docs/51-quality-and-delivery.md) | 实现任务拆解、测试矩阵、性能与里程碑 |
| [docs/00-brief.md](docs/00-brief.md) | 团队共用简报（给协作用，可跳过） |

## 一分钟看懂怎么玩

1. **第一关**：平台跳跃穿过教学楼，礼堂里的「笑长」双眼扫射激光（视线）——暴露 2.5 秒就失败。躲够 45 秒，地图里冒出商店，花 10 金币买「子弹枪」；笑长吐槽「你这玩意能大四人你知道不」，然后 NPC 抢走枪一枪把他带走。你捡到「子弹枪 / 潮的馈赠」。
2. **第二关**：用子弹枪打 Boss。挨一下掉 1 心、扣 5000 金币，血量或金币扣光就失败。Boss 血到 40% 会巨大化，子弹变成刮痧——去**碰他的鞋**就能赢。
3. **NPC**：老吴唱歌给增益；小明对着空气自言自语；食菌念叨「非洲怎么可能有香蕉呢…」；假生问「都这个点了还没死呢」然后扣你血。失败播放失败音效（文件待提供）。

## 下一步

1. 你确认玩法/数值/文案/UI 方向，并补上 [01 文档第 7 节](docs/01-overview.md#7-需要你确认提供的信息) 里的信息（失败音效、第二关 Boss 名字与形象、物化帝形象等）。
2. 开工写代码：先做可跑骨架（双端输入 + 房间 + 存档 + 手感），再做第一关、过场、第二关、打磨。
3. 代码完成后 `pnpm dev` 手机/PC 都能玩，`pnpm build` 后丢静态托管即可上线。

## 新对话 / 交接

- [HANDOFF.md](HANDOFF.md)：给接手 AI 的交接文档（当前状态、已定决策、阅读顺序、执行计划、环境与验收口径）。
- [START-PROMPT.md](START-PROMPT.md)：新对话提示词，复制粘贴即用（想让它直接开工就删掉最后一句「等我确认」）。
