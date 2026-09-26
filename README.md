# dsh-sudoku

DSH（DeepSeek Harness）右侧栏里的经典数独。纯客户端实现：零运行时依赖、零网络请求、零后端状态——React 由宿主 `window.__ModuleLoader__` 注入，成绩只存浏览器 `localStorage`。

## 功能

- **棋盘**：9×9 固定（v0.1）；3×3 宫格粗线分隔；提示格/玩家填入格（link 色）/选中格/冲突格语义化配色；**横/竖格线分色**（竖=品牌淡染、横=链接淡染，宫线同向加宽）；全量 DSH 主题 token，明暗主题自适应，无硬编码色。
- **四侧数字键盘（v0.1.2）**：棋盘上/下各一排、左/右各一列 1–9 键（四边四色），点格子后点就近数字即可填数，免视线往返。
- **显式开始（v0.1.2）**：「▶ 开始」前填数/提示被锁（toast 提示）、计时恒 00:00；点击后解锁并起表，「🎲 新一局」回到未开始态。
- **全屏（v0.1.2）**：标题行「⛶ 全屏」铺满视口，再点退出。
- **难度三档**：入门 40 提示 / 进阶 30 / 专家 22（目标提示数，挖洞多轮重排逼近，实际提示数 ≥ 目标）。**唯一解由构造保证**：回溯生成完整盘 → 成对（180° 旋转对称）随机挖洞 → 每步 `countSolutions≤2` 唯一解校验、不唯一即回滚。
- **铅笔笔记**：「✏️ 铅笔笔记」开关后点数字记候选（9 位 bitmask）；任一格填入数字后自动清除其 8 邻域对应笔记。
- **安全与辅助**：
  - **首填安全**：本局第一个填入的数字若错误，引擎自动修正为正确值并 toast 提示；
  - **冲突高亮**：行/列/宫内重复的已填数字标红；选中格同行/列/宫按方向差异化淡染、同数字格联动高亮；
  - **撤销**：操作栈（上限 500），胜利后禁撤销；
  - **提示**：一键填入一个空格的正确值；
  - **无败局**：填错不判负，盘面可撤销/修正到正解。
- **计时**：点「▶ 开始」起算（v0.1.2 前为首次填格/提示起算），**胜利即停表**（mm:ss，超 1 小时显示 h:mm:ss）。
- **成绩**：按难度存 `{ 最佳, 胜局, 总局 }`（`localStorage` 键 `dsh-sudoku/v1/<难度id>`）；「清空记录」二次确认；localStorage 不可用时静默降级为内存态。
- **难度下拉**：面板顶部 `<select>` 随时可见当前档位（文案含目标提示数）；切换即新开局。
- **玩法简介**：面板顶部可折叠说明区（v0.1.2 起默认折叠），面向新用户。
- **方向高亮（v0.1.1）**：选中格后，行 = 品牌色淡染 / 列 = 链接色淡染 / 宫 = 中性淡染，三种方向视觉可辨、柔和不刺眼（`color-mix` 8–12%，明暗主题自适应）；同格冲突红标优先。
- **版本徽章**：面板底部 `dsh-sudoku v0.1.3`。

## 安装

一律 **tgz 安装**（2026-09-23 起，无 link 安装；每次重打包必须升版本号）：

```bash
cd dsh-plugins/dsh-sudoku
npm run check && npm pack               # 构建 + 门禁 + 测试 → 产出 dsh-sudoku-<ver>.tgz
dsh-dev plugin --profile web add /abs/path/to/dsh-sudoku-<ver>.tgz
systemctl --user restart dsh-dev-web    # 需要时由用户手动重启 3082
```

`bash scripts/install-to-dsh.sh` 是一键封装：构建 → 冒烟 → 移除旧安装 → 装入 profile → 安装后验证
（**不重启服务**）。该脚本当前装入的是**源码目录**；按 monorepo 统一纪律应改为 tgz 装入（见 gaps / `docs/PROGRESS.md`）。

刷新 `http://127.0.0.1:3082` → 会话内展开**右侧栏**（会话头部开关）→ 右侧栏指南/标签里点「🧩 数独」。

> 标签**不会**随页面自动打开（设计决策 D2）：需要时经右侧栏指南/标签点入。

## 环境支持矩阵（2026-09-26 双环境约定，总约定见 [`../docs/ENV-COMPATIBILITY.md`](../docs/ENV-COMPATIBILITY.md)）

| 环境 | 支持度 | 说明 |
|---|---|---|
| `ubuntu-4090`（本机） | **全量** | 源码树 + systemd（3082）；`npm run check` 全绿，3084 临时实例实测通过 |
| `windows-lite`（远程笔记本） | **全量** | 源码树 + dsh-dev 方式（手动启动）；纯客户端零运行时依赖，无 OS 分支、无本地模型/数据库依赖，`npm run check` 可直接跑 |

- 本插件的双环境一致性来自「**零环境依赖**」：host 侧为空壳（`inject=[]`、`apply` 无操作），
  游戏逻辑全在浏览器执行，成绩存 `localStorage`——不触碰 MySQL/SQLite、Python/venv、本地模型服务。
- 构建脚本跨平台（`scripts/paths.mjs`/`paths.sh` 统一解析路径，动态导入走文件 URL，类型检查经当前 Node 执行）。

## 开发

```bash
node scripts/build.mjs          # 双端构建 + 产物门禁 + 双端 typecheck
node test/engine-test.mjs       # 引擎单测（79 项，确定性 rng 回放）
node test/smoke-test.mjs        # 产物冒烟（host 导出 / client 注册面 / 无第二份 React / 无 6 位 hex）
node test/ui-verify.mjs 3084 <token>   # headless UI 验证（需 3084 临时实例，见 docs/TROUBLESHOOTING.md）
```

- 引擎 `src/shared/engine.ts` 纯函数模块（Host/Client 共享）：`generatePuzzle`（对称挖洞+唯一解回退）、`fillDigit`（含首填安全/给定格保护）、`toggleNote`（邻域联动清除）、`undo`（≤500 栈）、`hint`、`computeConflicts`、`isComplete`；随机源经 `Puzzle.rng` 注入（`newPuzzle`），引擎内部禁直调 `Math.random`。
- 客户端 `src/client/`：`entry.ts`（`__ModuleLoader__` 注册 + `sidebarRightTabs`/`sidebar.right.pane.tab` 双注册，guide order=42）、`ui.ts`（宿主 React 写法，`createSudokuUI(R)` 工厂）、`css.ts`（全量 `--dsw-alias-*`/`--dsw-elevation-*` token）。
- host 侧 v0.1 为空壳（`inject=[]`）；成绩文件持久化等 host 能力属 v0.2。

## 文档

- `docs/00-request/request.md` — 目标锚定 + 假设表（Phase 0 澄清算定）
- `docs/specs/001-sudoku/` — spec（D1–D8 决策 + 验收 A1–A9）/ tasks
- `docs/REQUIREMENTS.md` — 需求→实现→验收映射
- `docs/PROGRESS.md` — 进度真源
- `docs/TROUBLESHOOTING.md` — 现象→根因→修复（含 3084 临时实例 onboarding/工作区播种经验）
- `docs/screenshots/` — 3084 临时实例 UI 验证截图

## 版本

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1.3 | 2026-09-24 | 跨平台构建：新增 `scripts/paths.mjs`/`paths.sh` 共享路径解析器（消除硬编码 Linux 目录）、动态导入与预载参数改文件 URL、类型检查经当前 Node 执行 `lib/tsc.js`、`tsconfig.json` typeRoots 清理、补 `devDependencies`、测试去机器化（截图目录/chromium 路径改 env 覆盖） |
| v0.1.2 | 2026-09-14 | 3082 实机反馈落地：简介默认折叠、⛶ 全屏、用户填数=link 色、横/竖格线分色、「▶ 开始」显式起表（未点前锁填数/计时 0）、成绩行 `<b>` 乱码修复、棋盘四侧数字键盘（四边四色） |
| v0.1.1 | 2026-09-14 | 用户友好三改：顶部「玩法简介」可折叠说明区、难度改 `<select>` 下拉（随时可见当前档位）、行/列/宫方向差异化柔和淡染高亮 |
| v0.1.0 | 2026-09-14 | 首发：三档难度唯一解生成、铅笔笔记、首填安全、冲突/撤销/提示、胜利停表、按难度成绩 |

> v0.2 候选：自定义尺寸/提示数、host 侧成绩文件持久化、每日挑战、分享棋谱。

## 仓库与分支

唯一代码仓库 = `IamWWT/dsh-plugins`（private monorepo，2026-09-26 起全部自研代码的唯一仓）。
分支模型：`main`（集成）/ `ubuntu`（agent 开发）/ `windows`（用户）。

## Windows / Ubuntu 本地构建

两端都先运行 `npm install`，再运行 `npm run check`。构建工具和 Node 类型由本包声明，类型检查通过当前 Node 启动，文件导入使用文件 URL，支持 Windows 盘符。运行时仍由 DSH 提供共享服务。

<!-- deepseek-shared-layout -->

## Windows / Ubuntu 共用目录

本项目遵循 [DeepSeek 共用目录约定](../dsh-agent-presets/docs/DIRECTORY-LAYOUT.md)。管理根统一写作 `<DEEPSEEK_ROOT>`（`.../deepseek/`）。
Bash 与 `systemctl` 命令只适用于 `ubuntu-4090`（源码树 + systemd，3082）；`windows-lite` 用源码树 + dsh-dev 方式手动启动（无 systemd），
配置文件中的路径须在本机解析。工作区级文档在 `dsh-plugins/docs/` 与 `dsh-plugins/` 根 md。
