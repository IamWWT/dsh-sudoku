# REQUIREMENTS — dsh-sudoku（spec 001 实现 → 验收映射）

> **当前状态**：文档性质 = **规格／验收映射（当前有效）**｜对应版本 = **v0.1.4**（版本以 `package.json` 为单一事实源）｜
> 状态 = **spec 001 范围全部交付、验收通过**；v0.1.4 体验优化已发布但验收证据未回填（见文末）｜
> 维护者 = 本插件开发者（agent + 用户）。

> 决策记录见 [../需求/BRD-001-sudoku.md](../需求/BRD-001-sudoku.md) §2
> （D1–D9：Phase-0 七问 + v0.1.1 中途变更 D8 + v0.1.2 中途变更二 D9）。
> 本文件是实现侧映射与验收对照；逐版本变更史见 [`../CHANGELOG.md`](../../CHANGELOG.md)；
> 进度与当前环境状态见 [PP-项目计划.md](../管理/PP-项目计划.md)。

## 需求 → 实现

| # | 需求（spec 决策） | 实现 | 落点 |
|---|------|------|------|
| R1 | 右侧栏标签入口，guide order=42（D1） | `sidebarRightTabs.register({id:"dsh-sudoku", kind:"sudoku", guide:[{order:42,title:"数独",…}]})` + `sidebar.right.pane.tab` keyed slot（key `dsh-sudoku`） | `src/client/entry.ts` |
| R2 | 不自动打开（D2） | 注册不 `openTab`；右侧栏指南/标签手动点入 | `src/client/entry.ts` |
| R3 | 三档难度：入门40/进阶30/专家22（D3） | `DIFFICULTIES` 表 + `getDifficulty`（未知 id 抛错）；挖洞目标值=提示数 | `src/shared/difficulties.ts`、`engine.ts` |
| R4 | 唯一解保证 + 180° 对称挖洞 | `removeClues`：成对挖除（i↔80−i）、`countUpTo(2)` 校验回滚、≤4 轮重排 | `src/shared/engine.ts` |
| R5 | 铅笔笔记 + 联动清除（D4） | 单元格 9 位 bitmask 笔记；填格后 8 邻域自动清笔记；铅笔模式开关 | `engine.ts`（`toggleNote`）+ `ui.ts` |
| R6 | 冲突高亮 / 同数字高亮 / 撤销 / 提示（D5） | `computeConflicts`（行/列/宫冲突集合）；`PEERS` 预计算；undo 栈（≤500）；`hint()` 首空格填正解 | `engine.ts`、`ui.ts` |
| R7 | 计时与胜利语义（D6，v0.1.2 起被 C8 覆盖：显式「▶ 开始」起表，未点前锁定填数、计时 00:00） | 胜利（81 格==解）停表；无败局；胜利浮层（最佳/新纪录） | `engine.ts`（`state`/`wonMs`）+ `ui.ts`（`startArmed`/`onStart`） |
| R8 | 首填安全 | 首个填入数字错误时引擎自动修正 + `firstFillCorrected`，UI toast「首填安全：已自动修正为正确值」 | `engine.ts`（`fillDigit`）+ `ui.ts` |
| R9 | 成绩 localStorage 分难度键（D7） | `dsh-sudoku/v1/<diffId>` = `{bestMs, plays, wins}`；读写全程 try/catch（隐私模式降级）；清空二次确认 | `src/client/ui.ts` |
| R10 | 主题 token 化 | CSS 全量 `--dsw-alias-*` / `--dsw-elevation-*`，无 6 位 hex（构建门禁扫描） | `src/client/css.ts` |
| R11 | host 侧当前为空壳（原 v0.1 范围） | `name="sudoku"`、`inject=[]`、`apply()` 空实现、`VERSION="0.1.4"`（实测 `src/index.ts`；v0.2 加 host 能力前先改 spec） | `src/index.ts` |
| R12 | （v0.1.1）难度改 `<select>` 下拉，随时可见当前档位（D8/C2） | 难度三按钮改 `<select class="sdk-diff-select">`，选项文案「档位 · N 提示」，`value=d.diffId` 常显，`onChange→newGame(v)` 切换即新开局 | `src/client/ui.ts`、`css.ts` |
| R13 | （v0.1.1）顶部「玩法简介」可折叠说明区（v0.1.2 起默认折叠，C4/A10） | `h("div", sdk-help)` 头部按钮切 `d.helpOpen`（v0.1.2 起初值 false），内容 5 条 `li`（目标/提示格/开始填数/铅笔·撤销·提示/新一局与下拉/全屏） | `src/client/ui.ts`、`css.ts` |
| R14 | （v0.1.1）行/列/宫方向差异化柔和高亮（D8/C3） | `peerClasses(i,sel)` 返回 `sdk-hl-r/-c/-b`；CSS 用 `color-mix` 淡染（行=品牌 10% / 列=link 12% / 宫=中性 8%），同格多方向级联 宫>列>行，冲突红标压最上 | `src/client/ui.ts`、`css.ts` |
| R15 | （v0.1.2 C5）「⛶ 全屏」按钮：fixed 铺满视口，再点退出；全屏下棋盘最大化（min(可用宽, 视口高-360px)）、上下键铺满全宽、整体放大 | `.sdk-fsbtn` + `.sdk-fs` 系列规则（含 `.sdk-fs .sdk-board{max-width:calc(100vh - 360px)}`） | `src/client/ui.ts`、`css.ts` |
| R16 | （v0.1.2 C6/C7）用户填数=link 色；竖线=品牌淡染/横线=link 淡染（宫线同向加宽） | 单元格 `border-right`=品牌 35% / `border-bottom`=link 35%（宫线 85% 加宽）；`.sdk-filled .sdk-val`=link 色（与提示格 label 色、同数字联动品牌色三分） | `src/client/css.ts` |
| R17 | （v0.1.2 C8）「▶ 开始」显式起表：未点前填数/提示被锁（toast）、计时 00:00；点击后解锁+起表+计局；新一局重置 | `startArmed` 门控 `onDigit`/`onHint`，`onStart` 置位并 `startClock()`，`newGame` 重置 | `src/client/ui.ts` |
| R18 | （v0.1.2 C9）成绩行无字面 `<b>`（改 `h("b")` 元素渲染） | 成绩行 `最佳 — · 🏆 N 胜 · 共 N 局` 用 `h("b")` 子元素，`innerText` 不含 `<` | `src/client/ui.ts` |
| R19 | （v0.1.2 C10）棋盘四侧数字键盘：上/下横排、左/右竖排各 1–9 键，四边四色（品牌/link/绿/琥珀淡染），点击填数与旧底部键盘等价 | `.sdk-boardzone` 3×3 grid（上/左/棋盘/右/下）+ 四边 `color-mix` 淡染 `.sdk-dbtn` | `src/client/ui.ts`、`css.ts` |
| R20 | （v0.1.3）跨平台构建：Windows / Ubuntu 同一份源码均可 `npm run check` | 新增 `scripts/paths.mjs`/`paths.sh` 共享路径解析器；动态 `import()` 与 `--import` 预载改文件 URL；tsc 经当前 Node 执行 `lib/tsc.js`；`tsconfig.json` typeRoots 清理 + 补 devDependencies；测试去机器化（截图目录/chromium 路径走 env）；门禁版本断言改为从 `package.json` 推导并补校验 `entry.ts` 的 `pluginExports.VERSION` | `scripts/*.mjs`、`scripts/paths.sh`、`tsconfig.json`、`package.json`、`src/client/entry.ts`、`test/*.mjs` |
| R21 | （v0.1.4）体验优化：页面布局、窄容器适配、键盘焦点（**不改业务与公开扩展点**） | 范围与验收见 [../需求/BRD-20260925-experience.md](../需求/BRD-20260925-experience.md)；实现落点未在本表逐条登记 | `src/client/*`（UI 层） |

## 验收对照（spec §4）

| 验收 | 状态 | 证据 |
|------|------|------|
| A1 构建门禁 + 双端 typecheck | ✅ | `node scripts/build.mjs`（2026-09-14 全绿：产物门禁 + tsc 双端） |
| A2 引擎单测 | ✅ | `node test/engine-test.mjs` → 79 项全部通过（生成合法性/唯一解/对称/首填安全/笔记/撤销/提示/胜负/难度/30 盘性能） |
| A3 产物冒烟 | ✅ | `node test/smoke-test.mjs` → 23 项全部通过（host 导出 / client 注册面 / 无第二份 React / 无 6 位 hex） |
| A4 临时实例（3084）真实加载 + UI 验证 | ✅ | `test/ui-verify.mjs`：`#sdk-style` 注入、右侧栏「数独」入口、81 格渲染、填格/笔记/撤销/提示/新一局/切难度全链路（`docs/测试/截图/`）；唯一 404 为宿主 open-in-app 图标 |
| A5 3082 主力安装 | ✅装/⏸验收 | 2026-09-14 用户确认 → 执行安装脚本：安装 + 12 项安装后验证全过；用户 `systemctl --user restart dsh-dev-web` + 刷新 3082 点「数独」标签验收。**注：该次走的是脚本内的源码 link 流程，与现行 tgz 纪律不一致（脚本待改，见 [PP-项目计划.md](../管理/PP-项目计划.md) 未决/待办）** |
| A6 无硬编码色 | ✅ | 构建门禁每轮扫描产物，6 位 hex 即失败 |
| A7（v0.1.1）玩法简介区 | ✅ | 3084 复验：`.sdk-help` 存在、默认展开、折叠/再展开正常（`04b-help.png`） |
| A8（v0.1.1）难度下拉 + 常显当前档位 | ✅ | 3084 复验：`selectOption("expert")` → `value=expert`（`10-expert.png`） |
| A9（v0.1.1）行/列/宫方向差异化柔和高亮 | ✅ | 3084 复验：中心格选中后 `.sdk-hl-r/-c/-b` 计数 8/8/8（`04d-directions.png`） |
| A10（v0.1.2）玩法简介默认折叠 | ✅ | ui-verify：`初始折叠: true ✓`，展开/折叠切换正常（`04b-help-collapsed.png`） |
| A11（v0.1.2）全屏按钮（占满屏幕+放大） | ✅ | ui-verify：⛶ → `.sdk-root.sdk-fs` 存在 → 棋盘宽=视口高-360px 上限（1800×950 视口实测 592px）→ 退出（`05d-fullscreen.png`） |
| A12（v0.1.2）用户填数=link 色可分 | ✅ | `css.ts` `.sdk-filled .sdk-val`=link；截图 05c 与提示格/联动色可辨 |
| A13（v0.1.2）横竖线分色 + 宫线加宽 | ✅ | `css.ts` 竖=品牌/横=link `color-mix`（宫线 85% 加宽）；截图 04d 可辨 |
| A14（v0.1.2）「▶ 开始」显式起表 | ✅ | ui-verify：开始前填数锁定（盘面指纹不变）✓、点后「⏱ 计时中」✓、新一局后「▶ 开始」重现 ✓ |
| A15（v0.1.2）成绩行无 `<b>` 乱码 | ✅ | ui-verify：`stats 字面量 <b> 残留: 无 ✓`，文案「最佳 — · 🏆 0 胜 · 共 0 局」 |
| A16（v0.1.2）棋盘四侧数字键盘 | ✅ | ui-verify：上/左/右/下各 9 键 ✓，填数/笔记经四侧键等价走通（`05c/06-note.png`） |
| A17（v0.1.3）跨平台构建门禁 + 类型检查 | ✅ | `node scripts/build.mjs --no-typecheck` 门禁全过（布局卫生/产物可加载/版本三处一致）；两个 tsconfig 直跑 tsc 均 0 错误；`node test/engine-test.mjs` 79/79、`node test/smoke-test.mjs` 23/23 |
| A18（v0.1.4）体验优化验收（构建/类型/受影响测试、隔离实例入口、明暗主题与窄容器可读） | ⚠️ **未验证** | 验收条款见 [../需求/BRD-20260925-experience.md](../需求/BRD-20260925-experience.md)；本文件未记录本轮实测输出（CHANGELOG 0.1.4 条仅有范围描述） |

## 与 spec 的已知偏差（记录在案）

- **提示数容差**：挖洞搜索空间耗尽时可提前停（实际提示数 ≥ 目标；专家 22 的测试容差为 ≤ target+5）。UI 文案按「目标提示数」表述，不承诺精确值。
- **成绩键形态**：spec 初稿写单键，实现按**难度分键** `dsh-sudoku/v1/<diffId>`（语义等价于「按难度存」，利于「清空当前难度」）。
- **安装方式**：spec/README 的现行纪律为 **tgz**，而 `scripts/install-to-dsh.sh` /
  `scripts/verify-installed.mjs` 仍按**源码目录（link）**实现（A5 那次即走该路径）。
  脚本尚未跟进，属未决项（见 [PP-项目计划.md](../管理/PP-项目计划.md) 待办）。
