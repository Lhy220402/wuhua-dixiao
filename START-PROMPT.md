# 新对话提示词（复制下面的内容粘贴到新对话）

> 用法：新建一个对话，把下面代码块里的整段文字发给新对话里的 AI。
> 如果你希望它**直接开始写代码**，删掉最后一句「先复述……等我确认」即可。

```text
你接手一个已经完成设计的网页小游戏项目《物化帝笑传》，现在要把它从文档变成可运行的代码。

【工作目录】/root/workspace/wuhua-dixiao（里面已有 README.md、HANDOFF.md 和 docs/ 下 12 份设计文档；还没有 src/ 代码，也没装依赖）。

【技术栈】Kaplay + TypeScript + Vite，纯前端静态站点；手机横屏触控 + PC 键鼠同一份构建；美术全部用代码生成的扁平矢量（描边几何块+统一色板，无外部图片）；存档用 localStorage（key: cmi.save.v1）。

【第一件事：按顺序读文档】
1) docs/02-data-contracts.md —— 唯一事实来源（数值/schema/事件/存档/扩展）
2) docs/51-quality-and-delivery.md —— 15 个可验收实现任务 + 测试矩阵
3) docs/50-engine-architecture.md —— 目录/分层/每帧顺序/输入/音频/存档/双端
4) docs/10-gameplay-core.md
5) docs/20-level1-boss.md + docs/21-level2-boss.md
6) docs/30-npc-dialogue.md + docs/31-cutscene-and-audio.md
7) docs/40-ui-ux.md + docs/41-motion-responsive.md
8) docs/01-overview.md
读文档时不要重新设计机制；文档之间冲突以 02 为准，发现缺口先记下来问我。

【任务：做出可玩的两关】
1) 工程初始化：kaplay/vite/typescript/vitest，index.html、移动端 viewport、100dvh + 安全区。
2) 移动手感 + 输入抽象：PC 键鼠 + 触控统一成动作；土狼时间/跳跃缓冲/短跳。
3) 房间制加载、检查点、即时重试、死亡计数、存档。
4) 第一关：3 个跳跃房 + 礼堂；笑长双眼激光，0.8s 预警、每 4s 眨眼 1.2s 安全窗、挂牌阴影可躲；暴露读条 2.5s 失败（离开 3× 回落）；掉坑失败。
5) 45s 后商店出现：10 金币买「子弹枪」；笑长气泡「你这玩意能大四人你知道不」；NPC「潮」冲入夺枪、一枪击毙笑长、把枪抛回主角；获得「子弹枪（潮的馈赠）」；6s 过场可跳过。
6) 第二关：一屏竞技场，Boss 6 种可躲攻击；受击 -1 心且 -5000 金币；Boss 每 3 次有效命中掉 1 枚 2500；HP≤0 或金币≤0 失败；Boss≤40 血巨大化、子弹刮痧；碰到鞋（192×64 判定）即胜利；失败回阶段检查点；通关显示「未完待续」。
7) NPC：老吴唱「纱魔罗托」→ 视线读条 ×0.6 / 25s / CD 60s；小明全程无字（符号气泡+肢体）；食菌「非洲怎么可能有香蕉呢…」给一次性香蕉；假生「都这个点了还没死呢」→ 第二关 -1 HP、不可致死、不扣钱。
8) UI：DOM 覆盖层（HUD/商店/对话/物品栏/暂停/失败/结算），canvas 只画世界；Apple HIG 触控 ≥48–56px、safe-area、对比度、Reduce Motion；Material 动效 100/200/300/400ms + 标准/强调曲线；手机横屏触控 + PC 键鼠。
9) 音频缺失静默（每 ID 只 warn 一次）；失败音效接口 sfx.fail（用户稍后提供 public/audio/fail.ogg）；`pnpm build` 可静态部署。

【硬约束】不新增运行时依赖；无外部图片素材；固定文案逐字保留；固定文案：你这玩意能大四人你知道不 / 纱魔罗托 / 非洲怎么可能有香蕉呢… / 都这个点了还没死呢 / 潮的馈赠 / 未完待续；小明任何地方都不能出现他说的话；数值全部集中在 src/config/balance.ts；扩展性：关卡/NPC/Boss 阶段/商品/梗都数据驱动。

【工作方式】先读文档，然后给我一份「实现计划 + 里程碑拆分（对齐 51 的 15 个任务）」；每个里程碑做完给我可运行方式和简短验收结果（pnpm dev 或构建产物 + 手机/PC 实测），再进下一步。遇到文档缺口或冲突先问我，不要猜。

【环境提示】项目在 /root/workspace/wuhua-dixiao；本机 Ubuntu proot 无沙箱后端，跑 bash 命令用 sandbox_permissions="danger-full-access" 并写一句理由；npm/pnpm 用国内镜像；可联网安装依赖；产出放工作区，给用户的成品复制到 /sdcard/Download/DSH-Go/。

【用户还欠的信息】失败音效 fail.ogg（放 public/audio/）、第二关 Boss 名字与外形、物化帝形象（发型/眼镜/校服配色）；先按文档占位推进，收到后替换。

【验收】手机横屏 + PC 都能完整通关两关；失败会播 sfx.fail（缺文件时静默）；刷新不丢档；没有外部素材也能跑；移动端 60fps。

现在开始：先复述你对项目的理解 + 读文档后的实现计划与里程碑，等我确认后再写代码。
```
