# 新对话提示词（复制下面的内容粘贴到新对话）

> ✅ 2026-11-23 晚第二轮收尾发布已完成（扇形视线/夺枪动画/Boss 审计修复/移动端），本文件是长期维护提示词；发布前的 WIP 快照见 `START-PROMPT-WIP.md` / `HANDOFF-WIP.md`（历史归档，不要再用）。

> 用法：新建一个对话，把下面代码块里的整段文字发给新对话里的 AI。
> 这是**续作/维护**提示词，不是从零读设计文档开工。项目已经实现并上线。

## 主提示词（续作 / 打磨 / 修 bug）

```text
你接手一个已经实现、已上线的网页小游戏项目《物化帝笑传》，继续维护和打磨。不要重做架构，不要重新设计玩法。

【工作目录】/root/workspace/wuhua-dixiao

【先读这些，不要先改代码】
1) HANDOFF.md —— 当前状态、目录、关键实现、已知坑、发布与验收记录
2) README.md —— 运行/操作/验收/已知偏差
3) src/config/balance.ts —— 全部数值唯一来源
4) src/app/app.ts + src/app/fsm.ts + src/app/state.ts（运行时编排/状态机/检查点）
5) src/content/ —— 关卡/Boss/NPC/对白/道具/商品/过场
6) docs/02-data-contracts.md —— 设计契约唯一事实来源（与其它 docs 冲突以 02 为准）
需要时再查 docs/10、20、21、30、31、40、41、50、51。

【当前状态】
- 技术栈：Kaplay 3001 + TypeScript + Vite，纯前端静态站；运行时依赖只有 kaplay。
- 两关可玩：第一关笑长视线战 + 45s 商店 + 潮夺枪 6s 过场；第二关 6 种攻击 + 巨大化 + 碰鞋 + CP1/CP2。
- 手机横屏触控 + PC 键鼠；DOM 覆盖层 UI；canvas 只画世界；存档 localStorage key `cmi.save.v1`。
- `pnpm typecheck` 通过；`pnpm test` **12 文件 / 81 条全绿**；`pnpm build` 通过。
- **线上已发布（2026-11-23 晚）**：master（代码发布提交 `2416500`，此后仅文档更新）、gh-pages `b531213`，Pages build `built`；线上入口 `assets/index-CdlTiSjT.js` SHA256 `de3bac…fa1c97`，与本地 `dist` 逐字节一致：
  https://idealismo10.github.io/WUHUADIxiaozhuan/
  仓库：https://github.com/idealismo10/WUHUADIxiaozhuan
- **Gitee 镜像（2026-11-23 晚）**：https://gitee.com/idealismo10/WUHUADIxiaozhuan （公开；master 最新 + gh-pages `b531213` 已推送，gh-pages 产物 SHA256 已与本地核对）。Gitee Pages **未开启**：需账号实名认证后在仓库「服务 → Gitee Pages」选 `gh-pages` / `/` 手动启动；免费版每次推送后需点「更新」，地址预期 `https://idealismo10.gitee.io/WUHUADIxiaozhuan/`。
- 失败音效已处理：public/audio/fail.ogg / fail.mp3 / fail.m4a（源文件已降噪、−16 LUFS、mono 48k）。
- 已知偏差见 HANDOFF.md §8，例如 P3 凝视锁定调成 4.0s、R2/R3 新增 64px 坑、第二关 Boss 名字仍是占位。
- 跳跃手感已修：`jumpCutDelay=0.12s`（轻点约 69px / 按住约 103px）；R1/R3 上层平台已横移到可达位置，详见 HANDOFF §6.10。
- 笑长激光判定已修：P2 双眼真交叉、预警期不再提前漂移、P3 锁定后停住不再追人；P1 时长按行程推导 ≈1.882s 扫满 160→800，详见 HANDOFF §6.11。
- 2026-11-23 晚新改动：扇形视线（瞳孔发出、半角 8°、挂牌斜向阴影）；夺枪过场重做；第二关 Boss 审计 9 条修复（A5/A6 独立计时、预警音、转阶段不掉币、run.giant 延后、香蕉去抖、CP2 气泡、retry checkpoint、A2 站桩铺开）；买枪后刷新软锁修复（planResume + l1_cleared）；移动端防粘键/滑出释放/全屏按钮隐藏/小屏 HUD。详见 HANDOFF §6.4/§6.6/§6.12。
- **发布注意**：GitHub 用户名已改为 `idealismo10`，仓库改为 `WUHUADIxiaozhuan`，Pages 地址是新 URL；本机 `origin` 指向 GitHub、`gitee` 指向 Gitee 镜像（均为无 token 的普通 HTTPS URL），推送 Gitee 需临时凭据。不要 force push。

【硬约束】
- 不新增运行时依赖；开发依赖最多 vitest 等已有项。
- 无外部图片素材；美术继续用 src/art/ 代码生成扁平矢量，保留资源槽。
- 固定文案逐字保留：你这玩意能大四人你知道不 / 纱魔罗托 / 非洲怎么可能有香蕉呢… / 都这个点了还没死呢 / 潮的馈赠 / 未完待续；小明任何界面都不能出现他说的话。
- 数值全部集中在 src/config/balance.ts，禁止散落硬编码；关卡/NPC/Boss 阶段/商品/梗保持数据驱动。
- 保留 `docs/` 设计文档，不擅自改契约；确需改先说明并更新文档。
- 手机横屏 + PC 都要能玩；无 WebGL2 显示说明页；无音频文件可全程通关。

【工作方式】
1. 先读 HANDOFF.md 和对应代码，复述当前实现与你要改的点；不要猜。
2. 起 `pnpm dev` / 跑 `pnpm test` / `pnpm build`，先复现问题再修。
3. 每个改动给出可验证证据（单测、Playwright 流程、真机截图、构建产物）。
4. 不要用“应该可以”当结论；测试失败就继续查。
5. 发现文档缺口或需要用户信息（例如第二关 Boss 正式名）先问，不要编。

【环境提示】
- 本机 Ubuntu proot 无沙箱后端：bash 用 sandbox_permissions="danger-full-access" 并写一句理由。
- npm/pnpm 用国内镜像；可联网装开发依赖。
- Playwright 无头 Chromium 用 SwiftShader 时 Kaplay 的 WebGL2 会 context lost，导致截图 canvas 空白；这是测试环境限制，真机/正常浏览器正常。不要据此误判游戏坏掉。
- 产出放工作区；给用户的成品/截图复制到 /sdcard/Download/DSH-Go/。
- GitHub CLI 已在本机登录 `idealismo10`（旧名 Lhy220402 会重定向）；不要把 token 写进文件/提交/聊天。git push 偶尔网络超时，可重试或用 GitHub Git Data API 更新分支。
- 本地 HEAD 已与 GitHub/Gitee master 一致（发布提交 `2416500`，此后仅文档更新），gh-pages 为 `b531213`；若分叉先 fetch 再处理，不要 force push 覆盖。Gitee 推送用一次性 HTTPS token（不落盘），token 用完建议轮换。

【当前待办（按用户优先级）】
A. 第二关 Boss 正式名字（用户给名字后改 content/bosses/boss2.ts 与 HUD 显示；外形已按“学生”实现）。
B. 其余音效/BGM（用户放入 public/audio/ 同名文件即生效；不要为缺失文件加运行时依赖）。
C. 可选打磨：失败页死亡数字大动画、商店 60s 后的激光加速、梗图鉴入口、减少动效细节。
D. 手机横屏完整两关人工回归（重点：触控射击、商店购买、过场跳过、CP2 重试、碰鞋）。
E. 线上更新：`pnpm build` 后更新 gh-pages（`git push origin` 前先 fetch）；保持 `base: "./"`，否则 GitHub Pages 子路径 404；发布后用 Playwright 核对线上 JS SHA256 == `dist`。
F. Gitee Pages：等账号实名认证后，在 Gitee 仓库「服务 → Gitee Pages」选 `gh-pages` / `/` 启动；之后每次发布需点「更新」（免费版无自动部署），再验证 `https://idealismo10.gitee.io/WUHUADIxiaozhuan/`。

【验收口径】
- 手机横屏 + PC 都能完整通关两关；失败会播 sfx.fail（缺失静默）；刷新不丢档；无外部素材也能跑；移动端 60fps。
- `pnpm typecheck` / `pnpm test` / `pnpm build` 全绿；固定文案逐字未改；小明无台词。

先复述你读到的当前状态 + 你准备先做哪一项，再开始改代码；每完成一项给我「改了什么 + 怎么验 + 结果」。如果需要我做产品决策（Boss 名字/是否加内容），先问我。
```

## 只修一个 bug / 只改一处时，把下面这段替换掉主提示词的「当前待办」

```text
【本次只做一件事】<在这里写具体问题/需求，例如：手机横屏商店购买按钮偶发点不到 / 把第二关 Boss 名字改成「XXX」/ 给第二关加一个阶段检查点提示>
- 先复现，给出根因，再修；不要顺手重构无关代码。
- 修完跑 `pnpm typecheck` / `pnpm test` / `pnpm build`，并给我最短复现步骤和验证结果。
- 不改固定文案、不改数值出处（balance.ts）、不新增运行时依赖。
```

## 另一个对话只做「发布/部署」时用

```text
项目：/root/workspace/wuhua-dixiao，已实现并构建。只做 GitHub Pages / Gitee 镜像发布与线上验证，不改玩法。
- 先读 HANDOFF.md §10（发布与凭据）与 README.md「GitHub Pages 发布 / Gitee 镜像」。
- `pnpm typecheck && pnpm test && pnpm build`；检查 dist/index.html 使用相对路径（base "./"）。
- 当前基线：代码发布提交 `2416500`（master 后续仅文档更新）；gh-pages `b531213`；线上 JS `assets/index-CdlTiSjT.js` SHA256 `de3bac…`。
- GitHub：更新 gh-pages 分支；线上 URL https://idealismo10.github.io/WUHUADIxiaozhuan/ 。
- Gitee：仓库 https://gitee.com/idealismo10/WUHUADIxiaozhuan（gh-pages 分支已推）。Gitee Pages 未开启（需实名认证 + 网页手动启动）；开启后每次推送需在 Pages 设置页点「更新」。
- 用无头浏览器验证标题、开始、第一关 HUD、资源无 404（缺失音频除外），并核对线上 JS 与本地 dist 的 SHA256。
- 不要把 token 写进文件/提交/文档；git push 失败可重试或用 GitHub API，不要 force 覆盖错误内容。
- 完成后给我线上 URL + 发布 commit + 验证结果。
```
