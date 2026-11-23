# 《物化帝笑传》交接速览（2026-11-23 晚 · 第三轮）

> 一页版；完整细节见 [HANDOFF.md](HANDOFF.md)，新对话提示词见 [START-PROMPT.md](START-PROMPT.md)。

## 一句话

iwanna 式校园梗网页小游戏：精准平台跳跃 + 演出 + 两关 Boss + NPC 对话；手机横屏触控与 PC 键鼠共用一份构建；Kaplay 3001 + TypeScript + Vite；美术全部代码生成扁平矢量；第二关通关显示「未完待续」。

- 线上：https://idealismo10.github.io/WUHUADIxiaozhuan/
- GitHub：https://github.com/idealismo10/WUHUADIxiaozhuan
- Gitee：https://gitee.com/idealismo10/WUHUADIxiaozhuan
- 成品/截图/回归清单：`/sdcard/Download/DSH-Go/`

## 当前状态

| 项 | 值 |
|---|---|
| 测试 | `pnpm test`：13 文件 / 86 条全绿 |
| 构建 | `pnpm build` 通过；dist gzip ≈ 119KB JS + 6.8KB CSS |
| GitHub 线上 | 代码提交 `f0db370`（此后仅文档）→ gh-pages `e5727dd`，Pages build `built` |
| 线上产物 | `index-DX2eVvuX.js` SHA256 `5421955f…5570d`；`index-D4-97FbF.css` SHA256 `eafa4419…a0cd2`；与本地 dist 逐字节一致 |
| Gitee 镜像 | 第三轮已推 master + gh-pages `53bca87`；产物 SHA256 已核对；Gitee Pages 未开启（需实名+网页手动启动） |
| 运行时依赖 | 仅 `kaplay`；开发依赖 vite/typescript/vitest |
| 存档 | `localStorage` key `cmi.save.v1`（`.bak` 轮换、损坏 `.bad`、隐私模式内存降级） |

## 第三轮做了什么

- **网站图标**：物化帝半身像手写 SVG（冕冠/圆框眼镜/龙袍/红色凝视射线）→ `public/icons/` favicon.ico + 180/192/512 PNG + `site.webmanifest`；`index.html` 相对路径，子路径可用。
- **禁用复制/误触**：全局 `user-select:none` + 长按菜单关闭；`main.ts` 拦 `copy/cut/contextmenu/selectstart/dragstart`、Ctrl/Cmd+C/X、iOS 捏合。
- **提高 Boss 难度**：第一关 `blinkWindow` 1.2→1.0s、`p3LockHold` 4.0→4.5s；第二关 `attackGap` 1.6→1.2s、`a1.count` 3→4、`a2.count` 5→6；A1/A2 发数改由 `params.count` 驱动。
- **失败页死亡数字**：卡片顶部超大 `N` + 「死亡次数」，0→N 滚动 + 620ms 放大回弹；减少动效直出。
- **商店 60s 激光加速**：60s 未买枪，笑长攻击轮每轮提速 10%，下限 2.4s（`LaserBoss.setImpatient`）；买枪/过场后恢复。
- **「关于」菜单**：标题页第四枚描边按钮；玩法简介 + GitHub/Gitee 链接（新标签打开）；文案/URL 在 `src/content/about.ts`，短屏/触屏压缩为一屏。

## 关键文件

```
src/config/balance.ts        # 全部数值唯一来源
src/app/app.ts               # 顶层运行时（约 2.5k 行）
src/app/state.ts             # RuntimeState / checkpoint / planResume
src/systems/laser-boss.ts    # 笑长扇形视线 + 不耐烦加速
src/systems/arena-boss.ts    # 第二关 A1–A6 / 阶段 / 巨型攻击
src/ui/overlays.ts           # 标题/暂停/失败(死亡数字)/结算/TBC/关于
src/content/about.ts         # 关于文案 + 仓库链接
src/style.css                # 全部 DOM UI（含关于/触屏/失败页）
public/icons/                # 网站图标（SVG 源 + PNG/ICO）
docs/02-data-contracts.md    # 设计契约唯一事实来源
```

## 常用命令

```bash
cd /root/workspace/wuhua-dixiao
pnpm typecheck
pnpm test
pnpm build
pnpm dev          # http://localhost:5173/
pnpm preview      # 预览生产构建
```

## 已知偏差 / 坑

- P3 锁定 4.5s（docs 原 1.2s）、眨眼 1.0s；第二关收招 1.2s、A1 4 发、A2 6 根（2026-11-23 用户要求「两关都加、中等偏上」，已同步 docs/02/20/21）。
- R2/R3 为「掉坑失败」新增 64px 坑；地板顶统一 y=512。
- 第二关 Boss 名字仍是占位「BOSS」（用户未给正式名）。
- 其余 17 个音效/BGM 未提供；缺失静默 + 每个 ID 只 warn 一次。
- 无头 Chromium + SwiftShader 下 Kaplay WebGL2 可能 context lost，canvas 截图空白；真机/正常浏览器正常。
- 移动端小屏横屏 BOSS 血条缩到 34vw；iOS Safari 全屏/方向锁静默降级。
- 本机 `git push` 到 GitHub 偶发 TLS 超时，本轮用 GitHub Git Data API 发布；本地/远端 commit hash 可能不同，内容一致，**不要 force push**。
- Gitee 推送需一次性 token（用户 `idealismo10`，`https://oauth2:<token>@gitee.com/...`，不要落盘）；用过的 token 建议轮换。

## 发布流程（当前可用）

```bash
pnpm typecheck && pnpm test && pnpm build

# GitHub（网络正常时）
# 把 dist/ 推到 gh-pages；master 先 fetch 再 push，不要 force

# GitHub（git push 超时）
# 用 gh api 创建 blobs → trees(base_tree) → commit → PATCH git/refs/heads/<branch>
# master 与 gh-pages 都适用；gh-pages 用完整 dist 新建 tree（含 .nojekyll）

# Gitee
# master: git push https://oauth2:<token>@gitee.com/idealismo10/WUHUADIxiaozhuan.git master
# gh-pages: 从上一版 gh-pages 建 worktree，替换为 dist + .nojekyll，commit 后 HEAD:gh-pages
```

发布后必须核对线上 `assets/index-*.js` / `index-*.css` 的 SHA256 与本地 `dist` 逐字节一致（GitHub Pages 与 Gitee raw 都测）。

## 剩余待办

1. 第二关 Boss 正式名（用户给名字后改 `content/bosses/boss2.ts` + HUD）。
2. 其余音效/BGM（放进 `public/audio/` 即生效）。
3. Gitee Pages：实名认证后手动开启；之后每次推送点「更新」。
4. 手机横屏完整两关人工回归（清单在 `/sdcard/Download/DSH-Go/物化帝笑传-手机回归清单.md`）。
5. 可选：梗图鉴入口、独立全屏死亡演出、更高难度档位。

## 验收口径

- 手机横屏 + PC 都能完整通关两关；失败播 `sfx.fail`（缺失静默）；刷新不丢档；无外部素材也能跑；移动端 60fps。
- `pnpm typecheck` / `pnpm test` / `pnpm build` 全绿；固定文案逐字未改；小明无台词。
