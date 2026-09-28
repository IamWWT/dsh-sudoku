# PROGRESS — dsh-sudoku

> **当前状态**：文档性质 = **进度真源**（谁开发谁维护，根 `progress.md` 仅做一行索引）｜
> 对应版本 = **v0.1.4**（版本以 `package.json` 为单一事实源）｜
> 状态 = **已交付并在用**｜维护者 = 本插件开发者（agent + 用户）。

> 仓库归属：`IamWWT/dsh-plugins`（private monorepo，2026-09-26 起全部自研代码的唯一仓）；
> 分支 `main`（集成）/ `ubuntu`（agent 开发）/ `windows`（用户）。
> 安装纪律：**tgz**——`npm pack` → `dsh-dev plugin --profile web add <tgz>`，装后重启 3082 再刷新页面；
> 重打包必须升版本号（同版本重打包 pnpm 按 integrity 判定「已最新」不重解压）。
> 各版本逐条变更见 [`../CHANGELOG.md`](../CHANGELOG.md)；需求原话见 [`00-request/request.md`](./00-request/request.md)；
> 需求→实现→验收映射见 [`REQUIREMENTS.md`](./REQUIREMENTS.md)；踩坑见 [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)。

## 交付与验证证据

| 项目 | 当前状态 | 证据 |
|------|----------|------|
| 需求澄清（Phase 0 七问 + v0.1.1/v0.1.2 两轮中途变更 C1–C10） | ✅ 全部确认 | 用户原话见 `00-request/request.md` |
| 脚手架 + host 空壳 + 构建门禁 | ✅ | `scripts/build.mjs` 全绿 |
| 引擎单测 79 项 | ✅ 79/79 | `node test/engine-test.mjs` |
| 客户端（entry/ui/css）+ 冒烟 23 项 | ✅ 23/23 | `node test/smoke-test.mjs` |
| 3084 临时实例真实验证（v0.1.2 复验） | ✅ | 简介默认折叠 / 全屏开关 /「▶ 开始」前锁定+开始后 ⏱ 计时 / 四侧键各 9 / 成绩行无 `<b>` 乱码 / 方向高亮 8/8/8（`docs/screenshots/` 12 张） |
| v0.1.3 跨平台构建（Windows / Ubuntu 同一份源码） | ✅ | 新增 `scripts/paths.mjs`/`paths.sh`；动态导入与预载参数改文件 URL；tsc 经当前 Node 启动；双 tsconfig 类型检查 0 错误；门禁全过；79 单测 + 23 冒烟全绿 |
| v0.1.4（页面布局 / 窄容器适配 / 键盘焦点） | 📄 已发布，**本轮未记录实测证据** | 范围见 [`specs/20260925-experience/spec.md`](./specs/20260925-experience/spec.md) 与 CHANGELOG 0.1.4 条 |
| 3082 主力环境 | ✅ v0.1.3 已安装（2026-09-24 记录，用户自行重启后试用）；**v0.1.4 是否已装入未验证** | — |
| 根 `progress.md` 索引 | ✅ 已更新 | — |

当前安装/验收命令（保持有效）：

```bash
node scripts/build.mjs          # 构建 + 产物门禁 + 双 tsconfig 类型检查
node test/engine-test.mjs       # 引擎 79 项单测
node test/smoke-test.mjs        # 产物冒烟 23 项
```

## 决策快照（长期有效契约）

- guide order = **42**（minesweeper 41 之后，改动前须核对占用）。
- 难度：入门 40 / 进阶 30 / 专家 22（目标提示数，实际 ≥ 目标，≤ target+5 容差）。
- 成绩：localStorage `dsh-sudoku/v1/<难度id>`（host 文件持久化 → v0.2）。
- 版本同步：**以 `package.json` 为单一事实源**，`scripts/build.mjs` 门禁由它推导期望值并断言
  host `VERSION`（`src/index.ts`）、客户端徽章字面量（`ui.ts`）、以及
  `src/client/entry.ts` 的 `pluginExports.VERSION`（v0.1.3 补上——此前该处无人校验，
  曾停留在 0.1.2 而门禁全绿）。
- 确定性：引擎随机源必须走 `Puzzle.rng`（`newPuzzle` 注入），禁止引擎内部直调 `Math.random`。

## 临时实例验证流程（3084，当前有效）

- 3084 实例：主 harness checkout 启动，`DSH_HOME=<插件目录>/test-home`（插件目录内，随插件走）。
- test-home 是**全新 home**：welcome 步每次新浏览器档都要点一次；工作区需手工播种
  `test-home/storages/workspace.json`（首次播种后实例需重启；细节见 [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)）。
- 测完即关：kill 3084 后台任务；test-home 保留（下次复验免重建）。
- 红线：**不碰 3082 主力环境**，装 3082 须用户显式同意。

## 历史沿革（要点，细节见 CHANGELOG）

- **v0.1.0**（2026-09-14）首发：三档难度唯一解数独 + 铅笔笔记/首填安全/冲突高亮/撤销/提示 + 胜利停表 + 按难度成绩。
- **v0.1.1 / v0.1.2**（2026-09-14）两轮用户友好性与实机反馈（C1–C10）：玩法简介折叠、难度下拉、
  方向差异化柔和高亮、全屏、用户填数配色、显式「▶ 开始」起表、成绩行 `<b>` 乱码修复、棋盘四侧数字键盘。
- **v0.1.3**（2026-09-24）跨平台构建：共享路径解析器、文件 URL 导入、tsc 经当前 Node 执行、
  测试去机器化、门禁收紧补 `entry.ts` 版本断言。引擎/玩法不变。
- **v0.1.4**（2026-09-25）插件页面布局、窄容器适配与键盘焦点（`specs/20260925-experience/`）。
- **2026-09-26** 文档对齐审计：README 安装节改 tgz、补「环境支持矩阵」与「仓库与分支」；
  CHANGELOG 头部补仓库归属；docs/ 内现行安装/环境表述同步（历史版本条目保持原样）。

## 未决 / 待办

- **安装脚本与 tgz 纪律不一致（待改脚本）**：`scripts/install-to-dsh.sh` 与
  `scripts/verify-installed.mjs` 仍按**源码目录（link）装入**实现（AGENTS.md 的「常用命令」
  也仍写 `bash scripts/install-to-dsh.sh` = 3082 link 安装）。**现行安装纪律是 tgz**，
  脚本尚未跟进；本次只改文档，脚本未动。
- v0.1.4 的实测验证证据未落入本文件（只有 CHANGELOG 的范围描述）——补验后回填上表。
- **v0.2（未排期）**：自定义尺寸/提示数、host 侧成绩文件持久化、每日挑战、分享棋谱。
