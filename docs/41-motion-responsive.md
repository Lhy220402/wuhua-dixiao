# 41 · 动效与响应式（M4）

> 负责人：ui-ux ｜ 上游：`00-brief` §2/§5/§6、`40-ui-ux.md`（token 与组件尺寸权威）｜ 规范基线：**Material 3** 时长 token 100/200/300/400ms + standard/emphasized 曲线、状态层、高度层级、触觉；**Apple HIG** 的 Reduce Motion、动态字号、安全区、44pt 触控目标。
> 视觉载体：世界层为 **代码生成的扁平矢量**（KAPLAY 图形 API），动效 = 位移/缩放/旋转/色块切换/闪白，作用于容器节点（描边不随缩放变粗）。归本文件：时长/曲线/震屏/DPR/安全区/触控位置/输入抽象/降级；归 40：色/字/距/圆角/层级/断点宽度/组件尺寸/文案/状态。**不包含视频制作**，本轮只做适配。
## 1. 目标与范围

- **做什么**：动画语法与 token、逐元素动效清单、场景/房间切换、战斗反馈、Boss 预警、弹层曲线、失败页序列、Reduce Motion 降级；横竖屏/平板/PC 的 canvas 适配、DPR、letterbox、安全区、触控键位、多点触控、键鼠与焦点、全屏与方向锁定、统一 action 抽象。
- **不做什么**：不定义业务数值（跑速/血量/伤害见 00-brief §5 与 02-data-contracts）、不写实现代码、不做竖屏游戏布局（竖屏只给提示层）、不引入视频或 GIF。

原则：**动效必须有因果**——每个动画绑定一个事件，不出现装饰性循环（例外：Boss 预警、暴露 50% 警告、低血量心跳，它们承载信息）；**世界可抖、UI 不抖**，震屏只作用于 canvas，DOM UI 保持文字稳定。
## 2. 动效与响应式语法

**2.1 动效语法（扁平矢量）**
1. **只用五种变换**：位移、缩放、旋转、透明度、色块切换（填充/描边换色）；禁止模糊、形变（skew）、逐点路径动画。
2. **闪白即反馈**：受击/开枪/巨大化统一用 100–120ms 白色叠加（世界层矩形或全屏特效层），不允许长促闪烁。
3. **作用于容器**：角色/Boss 的几何子节点挂在容器上，缩放时描边保持 2 逻辑 px；旋转只用于印章与倒下演出。
4. **帧率无关 + 信息型循环 ≤2.5Hz**：时长按 `performance.now()` 计算，掉帧不缩短动画、delta 钳制 50ms；Boss 预警 400ms/周期（2.5Hz）、低血心跳 1200ms，非信息循环一律删除。

**2.2 响应式规则**
1. **contain 适配**：canvas 永远等比缩放 + letterbox，绝不裁切或拉伸；UI 用 CSS px 独立布局（40 §3.5）。
2. **横屏优先**：竖屏只显示「把手机横过来」提示层，不做竖屏玩法布局；方向锁定失败不阻断。
3. **安全区优先于美观**：HUD/按钮永远位于 `safe-area-inset` 内侧，宁可缩小画面感也不进刘海。
4. **触控层不随 canvas 缩放 + 输入统一**：DOM 覆盖层用 CSS px，最小命中 48×48、跳跃 80；键盘/鼠标/触控/手柄（扩展）映射到同一套 action，UI 与玩法不直接读事件。

**2.3 时长与曲线 token**

| Token | 值 | 用途 | 调参影响 |
|---|---|---|---|
| `--dur-100` | 100ms | 按下/悬停、状态层、开枪后坐、受击闪白 | 低于 80ms 像没反应，高于 150ms 迟滞 |
| `--dur-200` | 200ms | 气泡、对话进出、金币滚动、血心消失、暂停 | 交互反馈的默认值 |
| `--dur-300` | 300ms | 底部弹层、结算行、关卡标题退场 | 低于 250ms 显仓促，高于 400ms 慢 |
| `--dur-400` | 400ms | 失败/通关整屏、标题入场、印章、未完待续 | 上限；不再新增 500ms+ |
| `--dur-room` | **120ms** | **房间/场景淡入（固定）** | 唯一 off-scale 值：房间制手感要求 <150ms，不参与全局缩放 |

| 曲线 | cubic-bezier | 用途 |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | 默认移动、淡入、数字滚动、房间淡入 |
| `--ease-emphasized-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | 弹层入场、失败覆盖层、印章、Boss 巨大化 |
| `--ease-emphasized-accelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | 弹层退场、场景淡出、重试转场 |
| `--ease-linear` | `cubic-bezier(0, 0, 1, 1)` | 闪白、遮罩、震屏衰减、打字机光标 |

**2.4 动效强度参数**

| 参数 | 值 | 说明 | 调参影响 |
|---|---|---|---|
| 震屏幅度 / 时长 | 6px（受击）/ 3px（落地）；240ms、3 次往返 | 仅 canvas transform，X+Y 交替，线性衰减 | >8px 晕动风险，<3px 感知不到 |
| 受击闪红 | 120ms（40 升 / 20 持 / 60 降），峰值 α 0.28 | 全屏 `--c-laser` 叠加，`pointer-events:none` | 峰值 >0.4 会盖住 HUD 读数 |
| 无敌闪烁 | 600ms，α 1↔0.35，100ms 半周期 | 只作用于角色容器 | 与玩法无敌时长解耦 |
| 伤害数字 | 400ms，上移 24px，scale 1→1.1→1 | 世界层文字 | 同时最多 6 个，超出顶掉最旧 |
| 金币滚动 | 200ms，每位 stagger 24ms（≤5 位） | 数字列 translateY | 首位 ≥4 位时总时长封顶 320ms |
| Boss 预警脉冲 | 周期 400ms ×2，scale 1→1.06→1 | 配合 0.8s telegraph | 频率不得超过 2.5Hz |
| 弹层位移 / 结算 stagger | 入 24px、出 16px；每行 300ms、stagger 40ms | translateY + opacity | 距离 >32 像整页翻动；行数 >6 时 stagger 降至 24ms |
| 屏幕闪烁 | 单次 ≤120ms，频率 ≤2.5Hz | WCAG 2.3 | 禁止连续闪白两次以上 |

**2.5 响应式与画布参数**

| 参数 | 值 | 说明 | 调参影响 |
|---|---|---|---|
| 逻辑分辨率 | 960×540（16:9） | 00-brief §2 | 改比例需重排全部 UI |
| 适配模式 | contain（等比 + letterbox） | 居中，留边 `--c-ink-0` | 绝不用 cover，避免丢玩法信息 |
| 缩放 | `scale = min(vw/960, vh/540)` | CSS 尺寸 = 逻辑 × scale，取整到 0.5px | 非整数缩放世界层会有 1px 缝 |
| DPR 上限 / 预算 | `dprEff = min(devicePixelRatio, 2, sqrt(2.4M/(cssW×cssH)))`；桌面可到 4.0M | 后备缓冲取偶数；低端机 1.6M | 超过 2.4M 像素会掉帧 |
| 视口高度 / 重排 | `100dvh` + `visualViewport.height`；resize 防抖 150ms | 处理地址栏收缩与全面屏 | 只用 100vh 会露出底边 |
| 低帧阈值 | <45fps 持续 2s → 降级；>55fps 持续 5s → 恢复 | 每 30s 最多降级一次 | 避免抖动式降级 |
| 帧预算 | 16.6ms（60fps） | 动效只改 transform/opacity/filter | 改 width/height 会掉帧 |

**2.6 安全区（横屏为默认态）**

```
--safe-t: max(8px,  env(safe-area-inset-top, 0px))
--safe-r: max(12px, env(safe-area-inset-right, 0px))
--safe-b: max(12px, env(safe-area-inset-bottom, 0px))
--safe-l: max(12px, env(safe-area-inset-left, 0px))
HUD 上边距 = --safe-t + 8     HUD 左右 = --safe-l/r + 12
对话框底 = --safe-b + 12      触控组底 = --safe-b + 16
触控组左右 = --safe-l/r + 16  暂停键 = --safe-t + 8
```

- JS 侧用 1×1 探针元素的 `getComputedStyle` 读四个自定义属性，不硬编码机型；刘海横屏表现为左右 inset（最大实测 44px），挖孔靠 `--safe-t`。
- 安全区为 0（PC）时 `max()` 保证最小 8/12px 边距；canvas 可铺满，DOM HUD/触控层必须落在安全区内。
## 3. 交互与表现
### 3.1 动效清单（权威表）

| 元素 | 触发 | 时长 token | 曲线 | 属性 | 备注 |
|---|---|---|---|---|---|
| 场景淡出 | `ui:screen-change` | 120ms | emphasized-accelerate | opacity 1→0 | Title/LevelIntro/Fail 共用 |
| 场景 / 房间淡入 | 下一屏挂载、`game:room-enter` | `--dur-room` 120ms | standard | opacity 0→1 | 房间制硬切，无淡出、无推镜 |
| 标题入场 | Title 挂载 | 400ms | emphasized-decelerate | opacity + translateY(12→0) | 按钮 stagger 60ms |
| 按钮按下 / 悬停 | pointerdown / hover（仅 PC） | 100ms | standard | scale .96 + 硬影 −2px；状态层 0→8% | 触屏不触发 hover |
| 对话框入 / 出 | `game:dialogue-start` / `end` | 200ms | emphasized-decelerate / accelerate | translateY(16↔0) + opacity | 名牌 100ms 后弹入；退出期间输入锁 |
| 打字机 | 每句开始 | 33ms/字 | linear | 文本逐字出现 | 标点额外 60ms；可「跳过」 |
| NPC 气泡入 / 出 | 说话触发 / 停留结束 | 200ms / 100ms | standard | scale .92→1 + opacity / opacity | 世界锚定；新的顶掉旧的 |
| 受击闪红 | `game:player-damaged` | 120ms | linear | 全屏 α 0→.28→0 | 见 §3.2；不循环 |
| 震屏 | 受击 / 落地 | 240ms | linear | canvas translate ±6→0 | 只抖世界，不抖 UI |
| 血心消失 / 金币扣款闪红 | HP 减少 / 大额减少 | 200ms / 100ms | standard / linear | scale 1→1.4→1 + 空心淡入；数字色 coin→pen→coin | 与扣血同帧开始 |
| 金币滚动 | `game:coin-changed` | 200ms | standard | 数字列 translateY | 见 §3.3 |
| Boss 受击白闪 | Boss 掉血 | 100ms | linear | 色块→白→原色 | 扁平矢量「色块切换」 |
| 伤害数字 | 命中 | 400ms | emphasized-decelerate | translateY(−24) + opacity | 同时 ≤6 个 |
| 开枪后坐 | 射击 | 100ms | standard | 枪身 translateX(−3→0) + 枪口白闪 | 冷却 0.25s 不排队 |
| 跳跃拉伸 / 落地压扁 / 踩敌弹跳 | 起跳 / 落地 / 踩中 | 100ms | standard | scaleY 1.08 / .92；Boss 压扁 | 仅角色容器 |
| Boss 预警脉冲 | `game:boss-phase` 蓄力 | 400ms×2 | emphasized-decelerate | scale 1→1.06 + 能量环 α .4→.9 + 眼睛换色 | 0.8s telegraph 内 2 个周期 |
| 激光发射 | telegraph 结束 | 100ms | linear | 白闪 + 激光条 scaleX 0→1 | 与 `sfx.laser` 对齐 |
| Boss 巨大化 | HP ≤40 | 400ms | emphasized-decelerate | scale 1→1.9（过冲 1.12）+ 压暗 | 首帧 120ms 白闪；见 §3.4 |
| 弹层入 / 出 | 商店打开 / 关闭 | 300ms / 200ms | emphasized-decelerate / accelerate | translateY(24→0 / 0→16) + opacity | 遮罩 200ms 同步 |
| 遮罩 | 弹层/模态 | 200ms | linear | opacity 0→.56/.72 | 与弹层同时启动 |
| 购买成功 | `game:shop-purchased` | 400ms | emphasized-decelerate | 卡片描边→success + 金币滚动 | 触觉 [10,40,10] |
| 暂停入场 | Pause | 200ms | standard | 遮罩 + 卡片 scale .96→1 | 世界立即停帧 |
| 失败序列 / 重试 | `game:fail` / `game:retry` | 200+400+400ms / 120+120ms | 见 §3.5 | 冻结→去饱和→覆盖层；淡出淡入 | 回到检查点 |
| 结算行 / 印章 / 未完待续 | LevelClear / ToBeContinued | 300ms 每行；400ms | emphasized-decelerate | translateY(8→0) + opacity；scale .8→1 + rotate −6° | stagger 40ms；印章单次不弹跳 |
| 低血量心跳 | HP=1 | 1200ms 循环 | standard | 心形 scale 1→1.04→1 | 信息型，降级为静态描边 |
| 道具获得 | `game:item-acquired` | 400ms | emphasized-decelerate | 道具槽 scale .8→1 + success 描边 | 一次 |
### 3.2 受击闪红与震屏（组合）

- 顺序：① 同帧把闪红 α 拉到 0.12；② 40ms 升到峰值 0.28；③ 持 20ms；④ 60ms 线性降到 0；⑤ 震屏同时开始、240ms 线性衰减到 0。
- 闪红层 `inset:0`、`z-index:900`、`pointer-events:none`；α≤0.28 时 HUD 文字对比度仍 ≥4.5:1。
- 无敌闪烁 600ms（α 1↔0.35，100ms 半周期）只作用于角色容器，不影响 HUD。
- Reduce Motion：不闪红、不震屏，改为 120ms `--c-pen` 1px 屏幕内描边脉冲（无位移、无大面积颜色翻转）。
### 3.3 金币数字滚动

- 200ms 标准曲线，每位数字列独立 translateY，**stagger 24ms**，最多 5 位 → 总时长封顶 296ms。
- 增加（+2,500）向上滚，减少（−5,000）向下滚；先滚旧值→新值，不滚空格；超过 5 位改为千分位缩写 + 瞬时切换。
- 大额减少（|Δ|≥5,000）先 100ms 闪红再滚动；`aria-live` 只播报新值一次。
- Reduce Motion：0ms 瞬时切换数字，仅保留 120ms 颜色变化。
### 3.4 Boss 预警脉冲与巨大化

- 预警 0.8s：蓄力环 scale 1→1.06→1，周期 400ms 共 2 次；能量环 opacity 0.4→0.9；眼睛色块 `--c-ink-0`→`--c-laser`（100ms 色块切换）。
- 发射：100ms 白闪 + 激光条 scaleX 0→1（transform-origin 在眼睛），保持到眨眼安全窗。
- 巨大化（HP≤40）：120ms 白闪 → 400ms scale 1→1.9（过冲 1.12 再回落）+ 填充压暗 20% + 眼睛切白；冲击波用圆环 scale 0→1 + opacity 衰减，周期 2s。
- Reduce Motion：预警改为静态红色描边（常亮）+ 文字「激光」12px；巨大化直接切终态（120ms 透明度）；冲击波保留碰撞、去掉圆环扩散。
### 3.5 失败画面（Material 时长）

```
t=0        200ms 冻结（世界停帧、输入锁）
t=200ms    400ms 去饱和（filter: saturate 1→0，linear）
t=600ms    400ms 覆盖层入场（emphasized-decelerate，opacity + scale .98→1）
t=600ms    「败了」标题 400ms（同上曲线）
t=640ms    统计行 300ms
t=680ms    按钮组 stagger 40ms，每个 300ms
```

- 总时长 ≈1.08s；点击「重试」后 120ms 加速淡出 + 120ms 标准淡入（见 40 §5.8）。
- Reduce Motion：跳过冻结与去饱和，t=0 起 120ms 直接显示覆盖层；标题/按钮仅做透明度。
- 失败音效 `sfx.fail` 在 t=600ms 触发（与覆盖层同帧）；文件缺失时静默 + `warn` 一次。
### 3.6 Reduce Motion 降级规则

触发条件：系统 `prefers-reduced-motion: reduce` **或** 存档 `settings.reduceMotion = true`（OR 关系），可在设置中单独覆盖为关。

| 类别 | 默认 | Reduce Motion |
|---|---|---|
| 位移动画 | translate 8–24px | 0ms 或 ≤120ms 透明度 |
| 缩放/旋转 | 按钮 .96、印章旋转、Boss 1.9× | 去掉中途帧，直接终态 |
| 震屏 | 6px / 240ms | 关闭，改 120ms 静态描边脉冲 |
| 闪红/闪白 | 120ms 峰值 α .28 | 单次 120ms α .12，不闪白 |
| 循环脉冲（Boss 预警/低血/等待推进） | 2.5Hz 以内 | 静态描边/常亮指示，保留数值 |
| 金币滚动 | 296ms 数字列 | 0ms 切换 + 120ms 颜色 |
| 去饱和 | 400ms | 直接跳终态 |
| 打字机 | 30 字/秒 | 保留但首句即支持「跳过」；可在设置中关闭逐字 |
| 弹层入场 | 300ms + 24px | 120ms 透明度，无位移 |
| 场景/房间淡入 | 120ms | 保留（信息性转场，低于 3 次/秒） |
| 粒子/浮动伤害数字 | 上浮 + 淡出 | 原地 120ms 淡出，同时 ≤3 个 |
## 4. 流程 / 状态机

**4.1 转场**

```
Idle ─scene-change→ Out(120ms) ─mount→ In(120ms) ─→ Idle
Idle ─room-enter→ In(120ms)（无 Out，硬切）─→ Idle
Fail ─retry→ Out(120ms) → In(120ms) → Idle
```

**4.2 失败序列**：`Playing → Freeze(200) → Desaturate(400) → Overlay(400) → FailUI`（见 §3.5）。

**4.3 自适应状态机**

| 当前 | 条件 | 下一个 | 行为 |
|---|---|---|---|
| Normal | <45fps 持续 2s | Degraded | 粒子关闭、震屏减半、`motionScale=0.6`、保留闪红 |
| Degraded | >55fps 持续 5s | Normal | 恢复完整动效（30s 内不重复降级） |
| 任意 | 系统/设置 reduceMotion | Reduced | 按 §3.6 表逐项替换；用户设置优先于自动降级 |
| Stable | orientationchange | Rotating | 防抖 150ms 后重排 + 输入锁 200ms |
| Rotating | 重排完成 | Stable | 恢复输入；不重复触发暂停 |

**4.4 输入源状态**：`Keyboard/Mouse ⇄ Touch`，记录最后输入源并切换按钮提示字形；200ms 内不来回切。
## 5. 响应式：画布、安全区与触控

**5.1 canvas 适配与 letterbox**

- 逻辑 960×540；`scale = min(vw/960, vh/540)`；canvas CSS 宽高 = 逻辑 × scale；容器 `display:grid; place-items:center`；留边填 `--c-ink-0`。
- 竖屏（BP1）：画面上下留黑 + 横屏提示层；提示层不遮住「仍然继续」。
- 平板/PC：画面居中，UI 内容最大宽 1200 居中；不允许整页拉伸；letterbox 不放置可点内容。
- 重排时机：`resize`、`orientationchange`、`visualViewport.resize`、`fullscreenchange`；统一防抖 150ms，重排后重读安全区。

**5.2 DPR 与清晰度**

- `dprEff = min(devicePixelRatio, 2, sqrt(pixelBudget/(cssW×cssH)))`；`pixelBudget` 默认 2.4M、桌面 4.0M、低端（`deviceMemory ≤4`）1.6M。
- canvas 后备缓冲 = round(cssW×dprEff) × round(cssH×dprEff)，取偶数避免半像素；绘制时按 dprEff 缩放坐标系。
- 世界层矢量按逻辑坐标绘制，描边宽度 ×dprEff 后取整；跨屏 DPR 变化监听 `matchMedia('(resolution: …dppx)')` + resize。
- 低端机掉帧优先降 dprEff（2→1.5），不降逻辑分辨率。

**5.3 触控布局（横屏 + 安全区）**

```
┌──────────────────────────────────────────────┐
│ ♥♥♥♥♡ [暴露条]                  🪙 15,000 ⏸ │ ← safe-t+8
│                  游戏世界                     │
│                          [射击 56]           │
│  [◀ 64] [▶ 64]      [交互 56] [跳跃 80]      │ ← safe-b+16
└──────────────────────────────────────────────┘
   safe-l+16                              safe-r+16
```

| 控件 | 视觉 / 命中 | 位置公式 | 备注 |
|---|---|---|---|
| 左移 / 右移 | 64×64 圆 / 72×72 | left = safe-l+16；bottom = safe-b+16；彼此 gap 12 | 后按下者优先 |
| 跳跃 | 80×80 圆 | right = safe-r+16；bottom = safe-b+16 | 主拇指键 |
| 射击 / 交互 | 56×56 圆 / 60×60 | 跳跃上方 +12px；跳跃左侧 −12px | 均 ≥48 |
| 暂停 | 48×48 | top = safe-t+8；right = safe-r+12 | 右上与金币同排 |
| 商店购买 | Primary 56 | 弹层内 | 弹层本身滚动手势 |

- **拇指热区**：横屏双手握持，控件全部落在屏幕下 35% 与左右下角；除暂停外不允许在屏幕上半区放触控按钮。
- **compact（高度 ≤380）**：移动 56、跳跃 64、射击/交互 48，间距 8，HUD 缩小（40 §3.5）。
- 触控层用 `(pointer: coarse)` 或 `(any-pointer: coarse)` 显示；PC 隐藏；触屏笔电两者都保留，按最后输入源切换提示。

**5.4 多点触控与防误触**

- 每键独立跟踪 `pointerId`；`pointerdown` 绑定、`pointerup/pointercancel/lostpointercapture` 释放；最多 5 个触点，超出忽略。
- 同时按左+右：**后按下者生效**，松开后回落仍按住的另一键；支持「移动+跳跃+射击」三指，按钮区外不做手势识别。
- 防误触：浮层/转场后 200ms 输入锁；按钮边缘 8px 死区；`touch-action:none`、`user-select:none`、屏蔽 `contextmenu` 与双击缩放；接触面积 ≥40px 的手掌触点忽略。
- `pointerType` 区分鼠标/触控/笔；笔按触控处理；按钮滑出命中区立即释放 action，避免「粘键」。

**5.5 PC 键位映射与键盘焦点**

| action | 键盘 | 鼠标 | 触控 | 手柄（扩展） |
|---|---|---|---|---|
| move_left / move_right | A / D 或 ← / → | — | 左/右移动键 | 左摇杆 X |
| jump | Space / W / ↑ / K | — | 跳跃 80 | A |
| shoot | J | 左键（仅 Playing） | 射击 56 | X |
| interact | E / F | 左键（NPC 圈内） | 交互 56 | Y |
| pause | Esc / P | 右上暂停 | 暂停 48 | Start |
| confirm / cancel | Enter / Esc | 点击 / 关闭 | 按钮 | A / B |
| skip_dialogue | Space / Enter / 点击 | 左键 | 点框 | A |
| retry | R / Enter | 点「重试」 | 点「重试」 | A |

- 键盘焦点：DOM 顺序 = HUD 暂停 → 主区按钮 → 弹层内容；菜单用 roving tabindex（↑↓/←→ 移动，Enter 确认，Esc 返回）；模态焦点陷阱、关闭后还原到触发控件；canvas `tabindex="-1"`，窗口级监听。
- 焦点环 = 3px `--c-chalk` + 2px `--c-ink-0` 外环、offset 2px；仅 `:focus-visible` 显示，鼠标点击不显示，焦点环不得被裁切。
- 阻止 Space/方向键滚动；`keydown.repeat` 只对移动生效，跳跃/射击只认首次按下；iOS 外接键盘 Esc 可能触发系统手势，保留屏幕暂停键兜底。

**5.6 全屏与方向锁定**

- 首次用户手势（「开始」「进入全屏」）里请求 `requestFullscreen()`（含 webkit 前缀），失败只 `warn` 一次、不弹错误。
- 全屏后尝试 `screen.orientation.lock('landscape')`；失败（Safari/iOS/桌面）不阻断，保留横屏提示层。
- 退出全屏/解锁：`fullscreenchange` 更新设置状态；原生 Esc 退出全屏时同时进入 Pause（200ms 防重复）。
- 竖屏提示层：标题「把手机横过来」/副文「礼堂才装得下。」/按钮「进入全屏」「仍然继续」；`仍然继续` 后按 BP1 降级，不锁死用户。
- iOS 无全屏 API：隐藏全屏项并提示「当前浏览器不支持全屏」；无 `navigator.vibrate` 时触觉静默降级为视觉反馈。
- 朝向变化：防抖 150ms → 重排 → 输入锁 200ms；不重置关卡、不丢暂停状态。

**5.7 统一 action 抽象**

- 输入路由把 键盘/鼠标/触控/手柄 归一为 `action`（见 5.5 表），输出 `action-pressed` / `action-released`（带逻辑帧号与来源）。
- 去重：同一 action 在 16ms 内重复按下只触发一次；键盘 repeat 与触控多指重复同样去重；玩法只读 action，禁止直接读 `keydown`/`pointerdown` 做业务。
- 提示字形随最后输入源切换（WASD ↔ 触控图标），切换节流 200ms；不改变实际键位；手柄新增映射即可，不改 action 消费方。
**5.8 触觉反馈（`navigator.vibrate`）**

| 事件 | 模式（ms） | 说明 |
|---|---|---|
| 跳跃 / 射击 | 10 | 轻，按压即震 |
| 受击 | [20,30,20] | 中 |
| 金币拾取 | 8 | 极轻 |
| 购买成功 | [10,40,10] | 中，与绿边同步 |
| 失败 | [30,60,30,60,60] | 重 |
| Boss 阶段切换 | [40,80,40] | 重 |

- iOS 无 `navigator.vibrate` → 静默降级，必须有等价视觉反馈；振动与按下同帧触发、不计入时长 token。

## 6. 边界与异常

| 场景 | 处理 | 关键数值 |
|---|---|---|
| 320px 宽 / BP0 | 提示层可滚，按钮 `100vw−32`，canvas 按 contain 缩到最小仍完整 | 40 §3.5 |
| 320px 高横屏 | compact 键位 56/64/48；HUD 压缩；不隐藏 HUD | h≤380 |
| 刘海/挖孔（横屏） | 左右 inset 最大 44px，由 `--safe-l/r` 吸收；HUD 不进入切角区 | §2.6 |
| 横竖屏切换 | 状态保留；150ms 重排 + 200ms 输入锁；不重复暂停、不误触 | §5.6 |
| 键盘 + 触控混用 | 按最后输入源切提示；16ms 去重防双跳；鼠标点击不显示焦点环 | §5.5/5.7 |
| 低帧 / 高刷 | 2s <45fps 降级、5s >55fps 恢复、30s 冷却；120/144Hz 按时间不按帧，震屏时长不变 | §4.3 |
| 切后台 / 锁屏 | rAF 暂停；恢复时 delta 钳制 50ms，不补播动画；自动 Pause | |
| 浏览器缩放 / 双屏 DPR | 200% 时 rem 放大、canvas 重排、弹层可滚；DPR 变化走 `matchMedia` + resize | §5.2 |
| 全屏被拒 / 方向锁定失败 | 控制台 warn 一次；按钮隐藏或提示「请手动横屏」，不阻塞游戏 | §5.6 |
| pointercancel / 手势中断 | 立即释放全部 action，清空按住状态 | §5.4 |
| 无振动 / 无音频 | 触觉静默；音频缺失静默 + warn 一次；视觉反馈不依赖两者 | |
| 系统「减少动态效果」 | 全部按 §3.6 替换，不询问 | §3.6 |
## 7. 与其他模块的接口

| 方向 | 对象 | 内容 |
|---|---|---|
| 收 | `40-ui-ux.md` | 颜色/字号/间距/圆角/断点宽度/组件尺寸/文案 |
| 收 | 玩法/关卡 | `game:player-damaged`、`game:boss-phase`、`game:coin-changed`、`game:room-enter`、`game:fail`、`game:retry`、`game:level-complete` |
| 收 | 存档 | `settings.reduceMotion`、`settings.controlScheme`、`settings.volume` |
| 发 | 引擎/渲染 | `resize()`、`getScale()`、`getDprEff()`、`getSafeInsets()`、`motionScale`、`input lock` 状态 |
| 发 | UI / 音频 | 焦点与焦点陷阱、lastInputSource、转场完成回调、降级状态；转场/失败/购买的动效时间点（`sfx.fail` 在覆盖层首帧） |
| 依赖 | 50 工程 | 渲染层划分、rAF 循环、resize 事件、全屏 API 封装 |
## 8. 扩展点

- **加动效**：只在 §3.1 表追加一行，必须引用已有 token 与曲线；新曲线需先加 token 并说明理由。
- **加平台 / 输入**：§2.6 增加 inset 规则、§5.5 增加键位表即可；手柄/新输入只扩 action 表，UI 不感知设备。
- **加屏 / 降级档位**：复用场景 120ms 淡入 + `ui:screen-change`；在 §4.3 加 `LowPower` 中间态（如 30fps 档），保留接口。
- **加语言 / 字号**：动效不改文本排版；200% 字号下弹层滚动与 stagger 行数自适应。
## 9. 验收标准

- [ ] 房间切换实测 120ms 淡入、无淡出、无推镜；场景切换 120ms 出 + 120ms 入。
- [ ] 受击同帧闪红（≤1 帧延迟），峰值 α 0.28±0.02，240ms 震屏只抖 canvas、DOM UI 不动。
- [ ] 金币 15000→10000 滚动 ≤320ms，数字列不抖动（tabular-nums），`aria-live` 只播报一次。
- [ ] Boss 预警 0.8s 内 2 个 400ms 脉冲，频率 ≤2.5Hz；巨大化 400ms 完成且过冲可见。
- [ ] 商店弹层 300ms 入 / 200ms 出，遮罩 200ms 同步；曲线与 §3.1 一致。
- [ ] 失败序列时序 200/400/400ms、总时长 ≈1.08s；重试 120+120ms。
- [ ] Reduce Motion：无震屏、无位移/缩放、无循环脉冲，仍能识别受击/Boss 预警/金币变化。
- [ ] canvas 在 320×568、568×320、844×390、1024×768、1440×900、1920×1080 下 16:9 居中、无裁切变形；DPR 1/2/3 无半像素缝。
- [ ] 安全区：横屏刘海机型 HUD/按钮/对话均不进入 inset；inset=0 时最小边距 8/12px 生效。
- [ ] 触控：三指同按均响应、左+右后按下者生效、滑出立即释放；弹层 200ms 内不误触、长按不弹系统菜单。
- [ ] 键盘/焦点：WASD、Space、J、E、Esc 生效且 repeat 不连跳；Tab 顺序合理、模态不逃逸、焦点环不被裁切。
- [ ] 全屏/方向锁定失败与 iOS 缺 API 均有降级；横竖屏切换 5 次状态不丢；低帧 2s 降级、切后台回来为 Pause。
## 10. 风险与待确认

1. **R1 120ms 是 off-scale 值**：房间/场景淡入固定 120ms，不随 100/200/300/400 token 缩放；如评审要求严格只用四档，可改为 100ms，但房间切换手感会变硬。**需 Lead 确认保留**。
2. **R2 canvas/DOM 分工**：本文件按「世界 canvas、UI DOM」写触控层与安全区；若 50 定为 canvas 内绘制 UI，则触控命中区需按 `1/scale` 反算，震屏将同时抖 UI，必须改回只抖世界层。
3. **R3 iOS 能力缺口**：无全屏、无方向锁定、无振动；已给降级，无法与 Android 完全一致。
4. **R4 震屏可访问性 / 低端机预算**：6px 幅度对前庭敏感用户仍可能不适（Reduce Motion 默认关闭震屏，开关放设置第 2 项）；2.4M 像素预算为估计值，需在目标机型实测，dprEff 下调可能造成轻微变糊。
5. **R5 触控键位**：80px 跳跃键在小屏横屏（568×320）与射击/交互键可能拥挤，已用 compact 56/64/48 兜底，需真机确认拇指舒适度。
## 11. 与其他模块的接口汇总

| 对方模块 | 它给我 | 我给它 |
|---|---|---|
| M0 Lead / 数据契约 | 逻辑分辨率、事件表、`settings` 字段 | 动效 token、降级规则、安全区/DPR 参数 |
| M1 核心玩法 | 受击/金币/道具事件与数值 | 闪红/震屏/滚动/无敌闪烁表现与时长 |
| M2 关卡与 Boss | 房间号、Boss 阶段与预警时机 | 房间淡入 120ms、预警脉冲、巨大化/冲击波表现 |
| M3 叙事/音频 | 对话行/过场阶段、音频逻辑 ID | 打字机节奏、转场时间点、失败音效触发帧 |
| M5 工程/测试 | 渲染层、rAF/resize/全屏封装、构建约束 | canvas/DPR/安全区/触控键位/输入抽象的验收项 |
## 附录 A · 设计稿索引（程序化动效资源槽）

首版全部由代码生成（图形变换 + 色块切换 + 闪白），下列槽位为可选替换，不引入位图依赖。

| 资源槽 | 用途 | 首版实现 | 可选替换 |
|---|---|---|---|
| `fx/flash` | 受击/开枪/巨大化闪白 | 全屏/局部矩形 α 过渡 | 无（保持代码绘制） |
| `fx/vignette` `fx/hatch` | 暴露暗角 / 斜线排 | CSS 径向遮罩 / `repeating-linear-gradient` | `ui/fx/vignette` 贴图 |
| `fx/shake` | 震屏参数组（幅度/时长/轴向） | 参数化，无文件 | 无需替换 |
| `art/fx/coin-spark` | 金币拾取火花 | 小圆点 6 个、200ms 扩散 | 可选精灵图 |
| `art/fx/dust` | 落地/巨大化尘土 | 矩形碎块 8 个、400ms | 可选精灵图 |
| `art/fx/laser` | 激光条 | 矩形 scaleX + 白闪 | 可选贴图 |
| `ui/fx/scrim` | 弹层/失败遮罩 | CSS 纯色 α | 无需替换 |
命名规则：`fx/<名字>`（代码参数）或 `art/fx/<名字>`（可选贴图）；替换不得改变时长 token、命中区与碰撞。
