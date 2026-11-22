# 物化帝笑传

一款「iwanna 式」校园梗网页小游戏：精准平台跳跃 + 搞笑演出 + 两关 Boss 战 + NPC 对话。手机横屏触控与 PC 键鼠共用一份构建；美术全部为代码生成的扁平矢量，无外部图片；存档写入 `localStorage` 的 `cmi.save.v1`。

- 技术栈：**KAPLAY 3001 + TypeScript + Vite**，纯前端静态站点
- 第一关：3 个跳跃房 + 礼堂笑长视线战（45s 商店、10 金币买枪、潮夺枪 6s 过场）
- 第二关：一屏竞技场消耗战（6 种可躲攻击、巨大化、碰鞋胜利）
- 通关第二关显示「**未完待续**」
- 在线试玩（GitHub Pages）：**https://lhy220402.github.io/wuhua-dixiao/**

## 快速开始

```bash
cd /root/workspace/wuhua-dixiao
pnpm install
pnpm dev          # http://localhost:5173/
pnpm build        # 产物在 dist/，可丢到任意静态托管
pnpm preview      # 本地预览生产构建
pnpm test         # Vitest 纯逻辑单测
```

手机真机：手机与电脑同一局域网，打开 `http://<电脑局域网 IP>:5173/`；横屏游玩。生产构建 `base: "./"`，部署在任意子路径（GitHub Pages / Gitee Pages / Nginx / Netlify）均可。

## 操作

| 动作 | PC | 触控 |
|---|---|---|
| 移动 | A / D、← / → | 左下 ◀ ▶ |
| 跳 / 短跳 | 空格、W、↑、Z、K | 右下「跳」 |
| 交互 / 购买 | E、F、Enter | 靠近后右下「!」 |
| 射击（第二关 / 礼堂） | J、X、鼠标左键 | 右下「射」 |
| 暂停 | Esc / P | HUD 右上「Ⅱ」 |
| 跳过对话 / 过场 | Enter / 空格（跳过按钮 / 长按对话框） | 点对话框 / 「跳过」 |

## 两关怎么打

1. **第一关**：跳过尖刺与坑，进礼堂。笑长的激光每 4s 眨眼 1.2s；被照会涨暴露条，2.5s 满即失败；离开视线 3× 回落；挂牌下方是阴影安全区。左二房间的老吴唱「纱魔罗托」降低读条增速；三楼的小明只会对着空气说话（通篇无台词）；礼堂右侧 45s 后出现小卖部，10 金币买「子弹枪」，随后潮冲进来夺枪击毙笑长，把枪抛回给你（「潮的馈赠」）。
2. **第二关**：子弹打 Boss（4 伤 / 0.25s 冷却），每 3 次命中掉 2500 金币；受击 −1 心 −5000 金币；心或金币归零即失败。Boss ≤40 血巨大化，子弹只飘「-0 / 刮痧」，此时去**碰它翘在地上的皮鞋**（192×64 判定）即可赢。失败回本阶段检查点。
3. **NPC**：食菌给一次性香蕉；假生在第二关入口右侧，交互 −1 HP（不可致死、不扣金币）；老吴增益 25s / 冷却 60s；小明任何界面都不会有台词。

## 目录

```
index.html
vite.config.ts / vitest.config.ts / tsconfig.json
public/audio/                 # fail.ogg / fail.mp3 / fail.m4a（已处理）
src/
  main.ts                     # 入口：WebGL2 探测 → kaplay → 场景
  app/                        # fsm / state / app 编排
  config/                     # balance.ts（唯一数值来源）/ theme / layout
  core/types.ts               # Vec / Rect / 事件 payload / 工具
  save/                       # schema / serialize / storage（localStorage + 兜底）
  systems/                    # input / physics / geom / vision / shop / combat /
                              # boss / laser-boss / arena-boss / bullets /
                              # dialogue-runner / cutscene-player / audio / events
  content/                    # 关卡 / Boss / NPC / 对白 / 道具 / 商品 / 过场 / 音频清单
  art/                        # 代码生成扁平矢量（玩家 / 笑长 / 学生 Boss / NPC / 瓦片 / FX）
  ui/                         # HUD / 对话框 / 商店 / 暂停 / 失败 / 结算 / 触控 / 气泡
  tests/                      # Vitest 纯逻辑单测（45 条）
docs/                         # 冻结的 v0.1 设计文档（02 为唯一事实来源）
```

## 验收状态（2026-11-22）

- [x] `pnpm typecheck` / `pnpm build` 通过，`dist/` 静态产物可托管
- [x] `pnpm test`：8 个测试文件、45 条用例全绿（几何/视线/商店/FSM/存档/Boss/输入映射/房间入口）
- [x] PC 键鼠：标题 → 第一关 → 商店 → 夺枪过场 → 第二关 → 巨大化 → 碰鞋 → 未完待续（Playwright 逐段驱动验证）
- [x] 手机横屏渲染 / 触控移动 / 跳跃 / 射击 / 暂停（真机截图验证；渲染正常）
- [x] 失败：尖刺/掉坑、视线满、HP≤0、金币≤0 均进入失败页；`sfx.fail` 已放入 `public/audio/`
- [x] 刷新不丢档：`cmi.save.v1`（含 `.bak` 轮换、损坏档 `.bad` 备份、隐私模式内存降级）
- [x] 无音频环境可全程通关：缺失音频每个 ID 只 `warn` 一次、不阻塞
- [x] 第二关阶段检查点：CP1/CP2；CP2 重试 HP≥3、金币≥15000、Boss 40、直接巨大化并 1s 后激活鞋
- [x] 固定文案逐字保留：你这玩意能大四人你知道不 / 纱魔罗托 / 非洲怎么可能有香蕉呢… / 都这个点了还没死呢 / 潮的馈赠 / 未完待续
- [x] 小明数据层 `lines: []`，气泡只显示「……」；`validateContent()` 会拦截任何小明台词

### 与文档的已知偏差（实现取舍，均有注释/常量）

1. **P3 凝视锁定 4.0s**（文档 20 §3 L1-04 写 1.2s）。原值下 2.5s 暴露读条在中远距离几乎无法打满；调成 4.0s 后「被锁住不跑就会死」成立。数值集中在 `BALANCE.level1.p3LockHold`，可随时改回。
2. **地板顶 y=512**（02 的礼堂示例写 500、30 写 470，存在跨文档不一致）。实现按 20/21/30 的贴地坐标统一为 512，地板 28px。
3. **R2/R3 增加少量坑**：20 的网格图地面是满的，但任务要求「掉坑失败」；在不改平台/金币/尖刺主要位置的前提下，把 R2/R3 地面切了两段 64px 缺口。
4. **失败页主标题用「败了」**（40 §5.8），原因文案用 10 §5.2 的逐字（如「物化帝被笑长看穿了。」）；31 §5.4 的「你又没了」未被采用。
5. **第二关 Boss 名称仍为占位**「第二关 Boss」/ HUD「BOSS」；形象按用户补充画成学生（校服 + 方框眼镜 + 领带）。物化帝按用户补充画成皇帝（龙袍 + 冕冠 + 圆框眼镜）。
6. **金币不加千分位**（02/10 明文，如 `15000`），覆盖 40 的 `15,000`。
7. **音频只交付 fail**：用户提供的 `标准录音 1.mp3` 已做去首尾静音、降噪、EQ、压缩、−16 LUFS 归一，导出 `fail.ogg`（Vorbis）/`fail.mp3`/`fail.m4a` 三格式兜底；其余 17 个逻辑 ID 首版缺失静默。
8. **死亡数字大动画**未单独做（10 §2.3 的 fullscreen 死亡数字）；失败页直接展示死亡计数，重试流程/计数/存档均为文档语义。

## 音频处理记录

源文件：`标准录音 1.mp3`（3.04s、48kHz 立体声、320kbps、−12.9 LUFS、真峰 −0.5dBTP）。

处理链（ffmpeg）：

```
silenceremove（去首尾静音）
→ highpass 70Hz / lowpass 14kHz
→ afftdn（降噪）
→ acompressor
→ loudnorm I=-16 LUFS / TP=-1.5 / LRA=7
→ 淡入淡出、单声道 48kHz
```

产物：`public/audio/fail.ogg`（23KB）、`fail.mp3`（27KB）、`fail.m4a`（42KB）。运行时按 `ogg → mp3 → m4a` 顺序兜底；三份全缺时完全静默，每个 ID 只 `console.warn` 一次。

## GitHub Pages 发布

`dist/` 是纯静态资源（`base: "./"`，无后端、无 Service Worker）。发布步骤见下（需要仓库写权限）：

```bash
pnpm build
# 把 dist/ 推到 gh-pages 分支，或在仓库 Settings → Pages 选择 GitHub Actions
```

已发布：**https://lhy220402.github.io/wuhua-dixiao/**（仓库 `Lhy220402/wuhua-dixiao`，`gh-pages` 分支，构建类型为 branch）。后续更新：

```bash
pnpm build
# 将 dist/ 推送覆盖 gh-pages 分支即可
```

## 设计文档

`docs/` 下保留 v0.1 设计文档；`docs/02-data-contracts.md` 是数值/事件/存档/schema 的唯一事实来源，`docs/51-quality-and-delivery.md` 是 15 个实现任务与验收矩阵。实现中的取舍见本文「与文档的已知偏差」。

## 还没做 / 后续可加

- 第二关 Boss 正式名字与外形细节（用户确认后替换 `content/bosses/boss2.ts` + `art/bosses.ts`）
- 其余音效 / BGM（用户提供后直接放进 `public/audio/` 即可，无需改代码）
- 梗图鉴入口、死亡数字大动画、商店不买 60s 的激光加速（当前只出嘲讽气泡）
- 真机性能测试记录（目标：手机横屏 60fps / 地板 50fps）
