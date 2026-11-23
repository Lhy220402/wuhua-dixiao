# HANDOFF-WIP · 2026-11-23 晚（交接给新对话）

> 这是一份**进行中**的交接，不是最终验收。新对话先读本文件，再按需读 `HANDOFF.md` / `README.md` / `docs/02`。
> 工作目录：`/root/workspace/wuhua-dixiao`
> 线上地址：https://idealismo10.github.io/WUHUADIxiaozhuan/
> 仓库：https://github.com/idealismo10/WUHUADIxiaozhuan

## 0. 一句话状态

功能与修复已基本完成：**81 条测试全绿、typecheck 通过、build 通过**；但最新改动**尚未提交、尚未推 GitHub、尚未更新 gh-pages**。线上仍是旧构建（`index-glJx25Xp.js`，只有上一轮激光修复），不包含本轮扇形视线/夺枪动画/Boss 修复/移动端。

## 1. Git / 线上精确状态（写文档时实测）

| 项 | 值 |
|---|---|
| 分支 | `master` |
| 本地 HEAD | `94b199b`（上一轮第一版扇形/过场/Boss/移动端提交） |
| origin/master | `7af2b18`（本地领先 1 个 commit，**该 commit 还没 push 成功**） |
| 工作区 | **有未提交改动**（本轮审计修复 + 移动端队友改动 + 文档 + `src/tests/resume.test.ts`） |
| origin/gh-pages | `f8c50af`（线上旧构建） |
| 线上入口 JS | `assets/index-glJx25Xp.js`（旧） |
| 本地新构建 | `dist/assets/index-CdlTiSjT.js` + `index-PhGJTGGP.css`（未发布） |

`git status` 里的未提交文件（写文档时）：
`HANDOFF.md README.md START-PROMPT.md docs/02 docs/20 docs/21 index.html src/app/app.ts src/app/state.ts src/config/balance.ts src/style.css src/systems/arena-boss.ts src/systems/input.ts src/tests/arena-boss.test.ts src/ui/hud.ts src/ui/touch-controls.ts`，以及新文件 `src/tests/resume.test.ts`。

> 新对话先 `git log --oneline -5` / `git status` 核对；**不要丢弃工作区改动**。

## 2. 本轮已完成（可直接验收）

### 2.1 笑长扇形视线（用户明确要求“从眼睛射出扇形激光”）
- `src/systems/laser-boss.ts` 重写为从瞳孔发出的扇形：半角 `BALANCE.level1.gazeFanHalfAngle = 8°`、采样 `gazeFanSlices=18`；中心瞄点轨迹保持 P1 160→800、P2 交叉、P3 预警追踪后锁定 4s。
- `src/systems/vision.ts` 新增 `gazeFanHitsPlayer`：玩家 3×3 采样点任一点在扇形内且到瞳孔连线未被挂牌挡住 → 暴露；挂牌阴影变斜向。
- `src/systems/geom.ts` 新增 `segmentRectEntryT`（射线被挂牌截断）；`src/art/fx.ts` 新增 `drawGazeFan`（扇形填充 + 边界 + 核心光束）。
- `drawBoss1` 支持只让本轮出束的眼睛变红。
- 测试：`laser-boss.test.ts` 10 条 + `vision.test.ts` 11 条（含扇形边缘/遮挡/眨眼恢复）。
- 运行时证据：扇形 `aimX=160, eye=(512,64), end=(160,512), fanN=19, half=0.14rad`；P3 站桩 → 2.5s `Fail/gaze`，锁定后横移暴露 0。

### 2.2 夺枪过场重做
- `app.ts`：潮按购买时玩家 x 锚定冲向玩家（不再固定冲画面中央）、速度线/尘土、枪口火光 + 曳光、笑长连人带椅侧倒 + 帽子掉落、枪沿抛物线旋转抛回玩家。
- 过场开始清激光/读条、玩家无敌；`grantItem` 后隐藏 canvas 枪（交给玩家绘制）。
- 运行时证据：购买点 x=864 → anchor 864、chao target 906、bossDead、tossTo 864、items 入包、LevelClear。

### 2.3 第二关 Boss 修复（独立审计 9 条全部处理）
1. **买枪后刷新软锁**：`state.ts` 新增 `planResume()` + `npcFlags.l1_cleared` 标记；`buyGun` 写 false、`markLevelComplete` 写 true；枪未入包 → 回 R4 补播过场；已结算 → 直接进第二关并补 15000。运行时用 localStorage 四种档验证：A/B 补播后 LevelClear + 入包 + `clears.level1=1`；C/D 进第二关且金币 15004（不破产）。
2. A5/A6 间隔：独立 pending + 计时保留帧超期量（`+= interval`），恢复 ≈2s/≈3s；同帧双到时 A6 顺延 `BALANCE.level2.giantStagger=0.35`。长时程测试 60s/低帧 20s 通过。
3. A5 预警音：调度时 `onAttack("a5")`，app 映射 `sfx.warning`。
4. 打到 40 触发巨大化的那一发不再掉 2500 金币。
5. `run.giant` 延后到巨大化 1.2s 步骤才置 true。
6. 香蕉皮底层 0.3s 去抖（不再每帧回调）。
7. CP2 重试不再重复“别碰我鞋”气泡。
8. `game:retry` checkpointId 改为按 bossPhase 推 cp1/cp2；docs 20/21 的 `by` 改为 02 契约的 `method`；source 统一 `wave`。
9. A2 玩家站桩时 5 个落点铺开（不再叠一列）；贴墙时最多裁剪到 56px，测试用“去重后 ≥4 个 x”而非死锁 60px。
- 测试：`arena-boss.test.ts` 9 条 + `resume.test.ts` 7 条。

### 2.4 移动端（队友改动 + Lead 复核）
- `index.html`：`color-scheme=dark`、mobile-web-app 标题等。
- `input.ts`：指针捕获失败时 pointerleave 释放、按钮 `pointerIds` 计数、清空后还原高亮（防粘键）。
- `touch-controls.ts`：暂停/失活主动 `releaseHeld`，防粘键。
- `hud.ts`：不支持元素全屏的浏览器（iPhone Safari）隐藏全屏按钮。
- `style.css`：触控按钮 `-webkit-touch-callout:none`/最小 44px；交互键贴大跳左侧；小屏弹窗/商店/设置压缩；≤720px BOSS 血条 34vw 防压金币；旋转提示 safe-area。
- Lead 运行时验证（Playwright 568×320 / 667×375 / 844×390 + touch）：BOSS 条与金币不重叠；按住射击有子弹；右移+跳多指同时生效；暂停按钮正常；无 pageerror。
- **注意**：`task-2` 仍是 in_progress；移动端队友最后一轮没有发回逐项报告（被中断）。改动已由 Lead 复核 + 冒烟测试，但新对话最好再跑一遍移动端验收（见 §5）。

## 3. 验证结果（写文档时）

- `pnpm typecheck`：通过
- `pnpm test`：**12 文件 / 81 条全绿**
- `pnpm build`：通过（`dist` 已生成最新 `index-CdlTiSjT.js`）
- 运行时（dev server + Playwright，Chromium 位于 `/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome`）：
  - 无头 Chromium 参数：`--headless=new --no-sandbox --disable-dev-shm-usage --use-gl=angle --use-angle=swiftshader-webgl --enable-unsafe-swiftshader --ignore-gpu-blocklist --mute-audio`
  - dev 构建有 `window.__CMI__` 调试桥；截图 canvas 可能因 WebGL context lost 空白，**以 debugState/字段为准**。
  - 本机 dev server 每次 bash 调用结束会停：要在**同一次 bash 调用里**启动并跑脚本，或使用受控后台任务。

## 4. 已知风险 / 未完成

1. **未提交 / 未 push / 未发布**（最重要）。
2. 移动端队友未给逐项报告（task-2 in_progress）；改动已在工作区并冒烟通过，但建议新对话按 §5 再验一遍，特别是真实手机。
3. 扇形视线与夺枪动画的**视觉**没有在真机/有 GPU 浏览器截图确认（无头截图空白）；逻辑/状态已验证。
4. 第二轮审计建议的 0.7s 窗口已用 `l1_cleared` 修；旧档无 marker 用“有枪+看过过场”推断（运行时 C 档验证）。旧档可能本来就没记 `clears.level1`，属历史数据，不伪造。
5. `docs/02` 已更新扇形参数；`docs/20/21` 已更新 method/A6/stagger。若新对话再改行为，记得同步 02（唯一事实来源）。
6. 第二关 Boss 正式名、其余 17 个音效/BGM 仍待用户提供；不要编。
7. Gitee 新账号 `idealismo10` 下没有本游戏仓库、本机无 Gitee token，未发布镜像。

## 5. 新对话最短路径（建议按顺序）

```bash
cd /root/workspace/wuhua-dixiao
git status && git log --oneline -5

# 1) 复核移动端改动（重点 diff）
git diff -- index.html src/style.css src/ui/touch-controls.ts src/ui/hud.ts src/systems/input.ts
pnpm typecheck && pnpm test && pnpm build

# 2) 提交（当前工作区全部改动）
git add -A
git commit -m "feat(level1): 扇形视线/夺枪动画；fix(level2): Boss 战审计修复；移动端"

# 3) 推送 master（本地领先 origin；不要 force）
git push origin master

# 4) 发布 gh-pages（覆盖旧构建）
git fetch origin gh-pages
git worktree add --detach /tmp/ghp origin/gh-pages
cd /tmp/ghp
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r /root/workspace/wuhua-dixiao/dist/. .
git add -A && git commit -m "deploy: 扇形视线/夺枪动画/Boss修复/移动端"
git push origin HEAD:gh-pages
cd /root/workspace/wuhua-dixiao && git worktree remove /tmp/ghp --force

# 5) 线上验证
gh api repos/idealismo10/WUHUADIxiaozhuan/pages/builds/latest --jq '{status,commit}'
# 对比线上 JS 与本地 dist 的 SHA256；Playwright/手机打开新 URL，点开始进第一关 HUD
```

> 本机 git push 偶发超时；可重试，或按 HANDOFF.md §10 用 GitHub API 更新。**不要 force push 覆盖远端。**

## 6. 真机/移动端回归清单（建议新对话或用户本人）

- 手机横屏：开局/第一关跳跃、R2/R3/R4 扇形视线（从眼睛射出、能看到扇形；挂牌后斜向阴影安全）
- R4 买枪：商店购买 → 夺枪过场（潮冲向玩家、枪响曳光、笑长连椅倒地、枪抛回）→ 跳过按钮可用
- 买枪后 1s 内刷新、过场 5.3s 后刷新、结算页刷新：都应正常（补播或进第二关，不软锁）
- 第二关：A1–A6 预警/音效、A6 预警后离开可躲、A5/A6 不同帧双杀、碰鞋胜利、CP1/CP2 重试、触控射击/多指
- 设置里“减少动效”：关震屏与过场粒子；CSS 动效也关
- 线上新构建：标题/开始/HUD/资源无 404（缺失音频除外）

## 7. 本轮新增/改动关键文件

- `src/systems/laser-boss.ts`、`src/systems/vision.ts`、`src/systems/geom.ts`、`src/art/fx.ts`、`src/art/bosses.ts`
- `src/app/app.ts`（扇形接入、过场动画、软锁恢复、Boss 修复、减少动效）
- `src/app/state.ts`（`planResume`、`l1_cleared` 标记说明）
- `src/systems/arena-boss.ts`（A2/A3/A5/A6/香蕉/掩体/计时）
- `src/config/balance.ts`（`gazeFanHalfAngle`/`gazeFanSlices`/`giantStagger` 等）
- `src/tests/laser-boss.test.ts`、`vision.test.ts`、`arena-boss.test.ts`、`resume.test.ts`
- `src/style.css`、`src/ui/touch-controls.ts`、`src/ui/hud.ts`、`src/systems/input.ts`、`index.html`
- `docs/02`、`docs/20`、`docs/21`、`README.md`、`HANDOFF.md`、`START-PROMPT.md`
