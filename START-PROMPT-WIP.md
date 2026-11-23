# 新对话提示词（复制下面代码块整段粘贴）

> ✅ **本 WIP 已收尾发布（2026-11-23 晚，master `2416500` / gh-pages `b531213`）**，无需再执行下面提示词；保留作历史记录。后续维护用 `START-PROMPT.md` / `HANDOFF.md`。

```text
你接手《物化帝笑传》项目的收尾发布。项目已实现并上线，不要重做架构、不要重新设计玩法；当前处于“功能改完、待提交/发布/验收”的 WIP 状态。用户要求质量优先、不喜欢返工。

【工作目录】/root/workspace/wuhua-dixiao
【线上】https://idealismo10.github.io/WUHUADIxiaozhuan/ （仓库 https://github.com/idealismo10/WUHUADIxiaozhuan）

【先读，不要先改代码】
1) HANDOFF-WIP.md —— 当前 WIP 状态、精确 git/线上 hash、已完成、未完成、最短收尾步骤（最重要）
2) HANDOFF.md —— 项目长期交接（架构/目录/已知坑/发布流程）
3) README.md —— 运行/操作/验收/已知偏差
4) docs/02-data-contracts.md —— 设计契约唯一事实来源
5) 需要时：src/systems/laser-boss.ts、vision.ts、arena-boss.ts、src/app/app.ts、state.ts、src/tests/*
不要先跑全量重构；不要改动固定文案；小明任何界面都无台词。

【当前状态（HANDOFF-WIP 写文档时实测）】
- 本地分支 master，HEAD 94b199b；origin/master 7af2b18（本地领先 1 个 commit，push 没成功）；工作区有未提交改动（本轮审计修复 + 移动端队友改动 + docs + src/tests/resume.test.ts）。
- origin/gh-pages f8c50af；线上仍是旧构建 assets/index-glJx25Xp.js，不包含本轮改动。
- 本地 dist 最新构建 assets/index-CdlTiSjT.js（未发布）。
- pnpm typecheck 通过；pnpm test 12 文件 / 81 条全绿；pnpm build 通过。
- 本轮已完成：笑长扇形视线（从瞳孔射出、半角 8°、挂牌斜向阴影）；夺枪过场重做（冲向玩家/枪口火光/连椅倒地/抛枪）；第二关 Boss 审计 9 条修复（含买枪后刷新软锁 planResume+l1_cleared、A5/A6 计时、A5 预警音、转阶段不掉币、run.giant 延后、香蕉去抖、CP2 气泡、retry checkpoint、A2 站桩铺开）；移动端触控/HUD/全屏按钮改动（队友改的，Lead 已冒烟）。
- 已修复内容不要重做；独立审计报告已处理完，task-2 移动端队友未发最终报告但改动已在工作区。

【本次任务：按 HANDOFF-WIP.md §5 收尾】
1) 复核工作区：git status / git diff 重点看移动端 5 个文件（index.html、style.css、touch-controls.ts、hud.ts、input.ts）；如果发现问题再修，别丢改动。
2) 最终验证：pnpm typecheck && pnpm test && pnpm build。
3) 提交：git add -A && git commit（消息如 "feat(level1): 扇形视线/夺枪动画；fix(level2): Boss 战审计修复；移动端"）。
4) 推送 master：git push origin master（本地领先 origin/master；不要 force；网络超时可重试或用 HANDOFF.md §10 的 GitHub API，但不要覆盖错误内容）。
5) 发布 gh-pages：用 HANDOFF-WIP §5 的 worktree 命令，把最新 dist 覆盖到 gh-pages；保持 base: "./"。
6) 线上验证：gh api pages/builds/latest 变 built；线上 index 引用新 JS；对比线上 JS 与本地 dist 的 SHA256；用 Playwright 或手机打开新 URL，确认标题/开始/第一关 HUD、除故意缺失音频外无 404。
7) 更新 HANDOFF.md/README.md 的发布记录（新 commit、gh-pages commit、线上 JS hash、验证结果），再提交/推送 master（docs-only）。
8) 给用户最终报告：线上链接、发布 commit、验证结果、剩余可选项（真机手感回归、第二关 Boss 名、音效、Gitee 镜像）。如果用户还没有给第二关 Boss 正式名，不要编。

【硬约束】
- 不新增运行时依赖（运行时只有 kaplay）；开发依赖最多 vitest 等已有项。
- 无外部图片；美术继续 src/art/ 代码生成；保留资源槽。
- 固定文案逐字保留：你这玩意能大四人你知道不 / 纱魔罗托 / 非洲怎么可能有香蕉呢… / 都这个点了还没死呢 / 潮的馈赠 / 未完待续；小明任何界面都不能出现他说的话。
- 数值集中在 src/config/balance.ts；关卡/NPC/Boss/商品/梗保持数据驱动。
- docs/ 保留；docs/02 是唯一事实来源；改行为要同步 02/20/21。
- 手机横屏 + PC 都能玩；无 WebGL2 显示说明页；无音频文件可全程通关。
- 不把 token 写进文件/提交/聊天；不要 force push；本地与远端分叉先 fetch。

【验证/调试提示】
- dev server 每次 bash 调用结束会停：在同一次 bash 调用里 `(pnpm dev > /tmp/wuhua-dev.log 2>&1 &) ; sleep 4; node script.mjs`，或使用受控后台任务。
- dev 构建有 window.__CMI__ 调试桥（private 字段运行时也可访问），可 debugTeleport/debugSetBossHp/debugGotoRoom/debugFinishLevel1/debugShoeWin 驱动。
- Playwright 已安装在 /usr/local/lib/node_modules/playwright；Chromium 在 /root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome；参数：--headless=new --no-sandbox --disable-dev-shm-usage --use-gl=angle --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --ignore-gpu-blocklist --mute-audio。无头截图 canvas 可能空白（WebGL context lost），以 debugState/字段为准；真机/正常浏览器正常。
- 手机触控验证：568×320 / 667×375 / 844×390，hasTouch=true；移动+跳+射击多指、按住射击、暂停/恢复不粘键。

【不要做】
- 不要再起一套重构/换技术栈/换玩法；不要重做已修的扇形视线、夺枪过场、Boss 9 条修复。
- 不要重启旧对话的移动端/审计子代理（它们的改动已在工作区；需要只读复核可以直接自己做）。
- 不要在未验证的情况下宣称完成；每个结论给命令/测试/运行时证据。
```
