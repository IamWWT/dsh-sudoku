# dsh-sudoku
> ## ⚠️ 已归档（Archived，2026-10-24）
>
> **归档原因**：用户决定卸载全部游戏插件（扫雷 + 数独，2026-10-24），源码移出 `dsh-plugins` 工作区、独立归档保留。
>
> **状态**：本仓为只读归档，不再维护。源码于 2026-10-24 从 `dsh-plugins` 工作区移出、独立成仓，
> 保留完整提交历史，定格在 **0.1.4**。`docs/` 中原本指向 dsh-plugins 工作区的跨仓相对链接保持原样，
> 可能已失效。


## 一句话定位

DSH（DeepSeek Harness）**右侧栏里的经典 9×9 数独**：纯客户端实现——零运行时依赖、零网络请求、零后端状态（React 由宿主 `window.__ModuleLoader__` 注入，成绩只存浏览器 `localStorage`）。

## 当前能力清单

**棋盘与操作**

- **棋盘**：9×9 固定，3×3 宫格粗线分隔；提示格/玩家填入格（link 色）/选中格/冲突格语义化配色；**横/竖格线分色**（竖=品牌淡染、横=链接淡染，宫线同向加宽）；全量 DSH 主题 token，明暗自适应，无硬编码色。
- **四侧数字键盘**：棋盘上/下各一排、左/右各一列 1–9 键（四边四色），点格子后就近点数字即可填数，免视线往返。
- **显式开始**：「▶ 开始」前填数/提示被锁（toast 提示）、计时恒 00:00；点击后解锁并起表，「🎲 新一局」回到未开始态。
- **全屏**：标题行「⛶ 全屏」铺满视口，再点退出。
- **方向高亮**：选中格后行 = 品牌色淡染 / 列 = 链接色淡染 / 宫 = 中性淡染（`color-mix` 8–12%，柔和可辨、明暗自适应）；同格冲突红标优先。
- **难度下拉**：面板顶部 `<select>` 随时可见当前档位（文案含目标提示数），切换即新开局。
- **玩法简介**：面板顶部可折叠说明区（默认折叠），面向新用户。
- **版本徽章**：面板底部 `dsh-sudoku v0.1.4`。

**规则与辅助**

- **难度三档**：入门 40 提示 / 进阶 30 / 专家 22（挖洞多轮重排逼近，实际提示数 ≥ 目标）。**唯一解由构造保证**：回溯生成完整盘 → 成对（180° 旋转对称）随机挖洞 → 每步 `countSolutions≤2` 唯一解校验、不唯一即回滚。
- **铅笔笔记**：「✏️ 铅笔笔记」开关后点数字记候选（9 位 bitmask）；任一格填入数字后自动清除其 8 邻域对应笔记。
- **首填安全**：本局第一个填入的数字若错误，引擎自动修正为正确值并 toast 提示。
- **冲突高亮**：行/列/宫内重复的已填数字标红；同数字格联动高亮。
- **撤销**：操作栈（上限 500），胜利后禁撤销。
- **提示**：一键填入一个空格的正确值。
- **无败局**：填错不判负，盘面可撤销/修正到正解。
- **计时**：点「▶ 开始」起算，**胜利即停表**（mm:ss，超 1 小时显示 h:mm:ss）。
- **成绩**：按难度存 `{ 最佳, 胜局, 总局 }`（`localStorage` 键 `dsh-sudoku/v1/<难度id>`）；「清空记录」二次确认；localStorage 不可用时静默降级为内存态。

**接入方式**

- 入口 = 右侧栏标签（`sidebarRightTabs.register`，guide order **42**）+ `sidebar.right.pane.tab`（keyed slot，key `dsh-sudoku`）双注册；**标签不随页面自动打开**，需经右侧栏指南/标签点入。
- host 侧 `inject=[]`，`apply` 无操作（v0.1 空壳）；客户端产物为自包含 IIFE，无第二份 React。

## 安装

一律 **tgz 安装**（无 link 安装）：

```bash
cd dsh-plugins/dsh-sudoku
pnpm check && npm pack        # 构建 + 门禁 + 测试 → 产出 dsh-sudoku-0.1.4.tgz

cd ../../deepseek-harness
DSH_HOME=~/.dsh-dev pnpm dsh plugin --profile web add \
  /home/wwt/Downloads/aigc/proj/deepseek/dsh-plugins/dsh-sudoku/dsh-sudoku-0.1.4.tgz
```

- 装完核对 `~/.dsh-dev/profiles/web/node_modules/dsh-sudoku/lib` 真实存在。
- **重打包必须升版本号**（同版本 pnpm 按 integrity 判「已最新」，不重解压 → 缺 `lib/` 启动即 `ERR_MODULE_NOT_FOUND`）。
- 重启 3082 **需用户同意**（`systemctl --user restart dsh-dev-web`）。
- `bash scripts/install-to-dsh.sh` 是「构建→冒烟→移除旧装→装入 profile→安装后验证」的一键封装，**不自动重启**；但该脚本目前仍按**源码目录 link** 装入（脚本内 `plugin add <插件目录>`），与上面的 tgz 纪律不一致（待改脚本）。要按纪律安装请走上面的 `npm pack` + `add <tgz>`。
- 刷新 `http://127.0.0.1:3082` → 会话内展开右侧栏 → 点「🧩 数独」标签。windows-lite 用同一 tgz 流程，装完托盘退出后重开桌面应用。

## 构建与验证

`package.json` scripts：`build` / `build:notypecheck` / `check` / `typecheck` / `test` / `pack` / `verify:installed` / `install:dev`。

```bash
pnpm check        # = 构建（双端打包 + 产物门禁 + 双端 typecheck）+ 引擎单测 + 产物冒烟
pnpm typecheck    # 单独跑 host/client 类型检查
pnpm test         # 引擎单测（含生成/唯一解/玩法/确定性回放）+ 产物冒烟
pnpm verify:installed   # 安装后验证（对 profile 内真实安装目录）
node test/ui-verify.mjs 3084 <token>   # headless UI 验证（需 3084 临时实例）
```

- 产物门禁：host `lib/index.js` 导出齐全；client `lib/client.js` 含 `__ModuleLoader__` + 插件 id + 插槽名、无顶层 import/export、无第二份 `ReactCurrentOwner`、无 6 位 hex 硬编码色；版本断言**从 `package.json` 推导**，并逐处核对 host `VERSION`、客户端入口 `pluginExports.VERSION`、`ui.ts` 版本徽章。
- 引擎 `src/shared/engine.ts` 为纯函数模块（host/client 共享）：`generatePuzzle`（对称挖洞 + 唯一解回退）、`fillDigit`（含首填安全/给定格保护）、`toggleNote`（邻域联动清除）、`undo`（≤500 栈）、`hint`、`computeConflicts`、`isComplete`；随机源走 `Puzzle.rng`（`newPuzzle` 注入），引擎内部禁直调 `Math.random`。

## 环境支持矩阵

| 环境 | 支持度 | 验证状态 |
|---|---|---|
| `ubuntu-4090`（源码树 + systemd 3082，验证走 3084 临时实例） | 全量 | `pnpm check` 全绿；3084 临时实例实测通过（后续布局/窄容器改动后的实机复测**未记录 → 未验证**） |
| `windows-lite`（官方桌面版 profile `desktop`，无 systemd） | 全量 | 同一 tgz 流程；**未验证** |

- 双环境一致性来自「零环境依赖」：host 侧为空壳（`inject=[]`、`apply` 无操作），游戏逻辑全在浏览器执行，成绩存 `localStorage`——不触碰 MySQL/SQLite、Python/venv、本地模型服务。
- 构建脚本跨平台（`scripts/paths.mjs` / `paths.sh` 统一解析路径，动态导入走文件 URL，类型检查经当前 Node 执行，支持 Windows 盘符）。

## 文档索引

| 文件 | 一句话 |
|---|---|
| [docs/需求/BRD-目标锚定-request.md](docs/需求/BRD-目标锚定-request.md) | Phase 0 目标锚定 + 假设表 + C1–C10 中途变更原话 |
| [docs/需求/BRD-001-sudoku.md](docs/需求/BRD-001-sudoku.md) | spec 001：决策 D1–D9 + 引擎设计 + 验收 A1–A16 |
| [docs/需求/BRD-业务需求说明书.md](docs/需求/BRD-业务需求说明书.md) | spec 001 的「需求→实现→验收」映射（R1–R21 / A1–A18） |
| [docs/管理/PP-项目计划.md](docs/管理/PP-项目计划.md) | 进度真源（当前状态 / 待办 / 决策快照） |
| [docs/管理/PP-001-sudoku-任务.md](docs/管理/PP-001-sudoku-任务.md) | spec 001 的 T1–T20 任务与验证留痕 |
| [docs/管理/RMP-风险管理.md](docs/管理/RMP-风险管理.md) | 现象→根因→修复（含 3084 临时实例 onboarding/工作区播种经验） |
| [docs/需求/BRD-20260925-experience.md](docs/需求/BRD-20260925-experience.md) | v0.1.4 布局 / 窄容器适配与键盘焦点优化范围 |
| [docs/管理/PP-20260925-experience-计划.md](docs/管理/PP-20260925-experience-计划.md)、[任务](docs/管理/PP-20260925-experience-任务.md) | 同上的实施方案与任务清单 |
| [docs/测试/截图/](docs/测试/截图/) | 3084 临时实例 UI 验证截图 |
| [docs/FILE_INDEX.md](docs/FILE_INDEX.md) | 全插件文档导航 |
| [docs/history/归档-20261013.md](docs/history/归档-20261013.md) | 2026-10-13 对齐审计中被清理的过期叙述（历史证据，非现行手册） |
| [AGENTS.md](AGENTS.md) | 本插件工程纪律（红线、命令、版本同步规则） |
| [CHANGELOG.md](CHANGELOG.md) | 版本变更记录 |

## 版本号

**0.1.4**（`package.json.version` = tgz 文件名 `dsh-sudoku-0.1.4.tgz` = 客户端徽章字面量）

## 附：仓库与共用目录

唯一代码仓库 = `IamWWT/dsh-plugins`（private monorepo），本插件目录 `dsh-plugins/dsh-sudoku/`；分支 `main`（集成）/ `ubuntu`（agent 开发）/ `windows`（用户）。遵循 [DeepSeek 共用目录约定](../../dsh-agent-presets/docs/DIRECTORY-LAYOUT.md)，管理根统一写作 `<DEEPSEEK_ROOT>`（`.../deepseek/`）；`systemctl` 与 Bash 命令仅适用于 `ubuntu-4090`。
