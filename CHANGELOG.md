## 0.1.4 — 2026-09-25

改进插件页面布局、窄容器适配与键盘焦点；具体范围和验证见 docs/需求/BRD-20260925-experience.md。

# Changelog — dsh-sudoku

> 仓库归属：`IamWWT/dsh-plugins`（private monorepo，2026-09-26 起全部自研代码的唯一仓）；
> 分支模型 `main`（集成）/ `ubuntu`（agent 开发）/ `windows`（用户）。
> 安装一律 tgz（`npm pack` → `dsh-dev plugin --profile web add <tgz>`，重打包必须升版本号）。

## v0.1.3（2026-09-24）

跨平台构建（Windows / Ubuntu 两端同一份源码，均可 `npm run check`）：

- 新增 `scripts/paths.mjs` / `scripts/paths.sh` 共享路径解析器；`scripts/build.mjs`、
  `typecheck.mjs`、`install-to-dsh.sh`、`verify-installed.mjs` 全部改用它，
  消除对个人 Linux 目录的硬编码依赖。
- 动态 `import()` 与 `--import` 预载参数改用文件 URL：Windows 上裸盘符路径会被
  ESM loader 拒绝（`ERR_UNSUPPORTED_ESM_URL_SCHEME`，`Received protocol 'd:'`）。
- 类型检查改为用当前 Node 执行 TypeScript 的 `lib/tsc.js`，不再依赖可执行文件权限。
- `tsconfig.json` 的 `typeRoots` 清理为本项目 `node_modules`。
- `package.json` 补 `devDependencies`（`@types/node` / `esbuild` / `typescript`）。
- `test/*.mjs` 去机器化：截图目录、chromium 可执行路径改为 env 覆盖。
- 运行时依赖仍由 DSH 提供（`inject=[]`，本插件不放 `node_modules` 进版本库）。
- **门禁收紧（补漏）**：`scripts/build.mjs` 的版本断言改为从 `package.json` 推导期望值，
  并新增对 `src/client/entry.ts` 的 `pluginExports.VERSION` 同步断言。此前门禁只查
  host `VERSION` 与徽章字面量，`entry.ts` 的 `VERSION` 停留在 0.1.2 却无人报警——
  「五处同步」实际只覆盖了四处。

> 引擎与 79 项单测不变；`npm run check`（产物门禁 + 双 tsconfig 类型检查 + 引擎 79/79 + 冒烟 23/23）全绿。
> 安装按 monorepo 统一纪律走 **tgz**（`npm run check` → `npm pack` → `dsh-dev plugin --profile web add <tgz>`；重打包必须升版本号），
> 装后需重启 3082（`systemctl --user restart dsh-dev-web`）再刷新页面。

## v0.1.2（2026-09-14）

3082 实机试用反馈落地（中途需求变更二，C4–C10，纯 UI/交互层，引擎不变）：

- **玩法简介默认折叠**（C4）：面板更紧凑，点「❓ 玩法简介」展开。
- **全屏按钮**（C5）：标题行「⛶ 全屏」→ 面板 fixed 铺满整个视口，再点退出；全屏下棋盘按屏幕最大化（方形盘取「可用宽/视口高」较小者）、上下键排铺满全宽、字体按键整体放大（2026-09-14 二轮反馈：视野占满屏幕）。
- **用户填数独立配色**（C6）：自己填的格子用 link 色，与题目提示（label 色加粗）一眼可分。
- **横竖格线分色**（C7）：竖线=品牌色淡染、横线=链接色淡染（3×3 宫线同向加宽加深），横竖方向一眼可辨。
- **显式开始**（C8，推翻 v0.1.0「首动自动起表」）：「▶ 开始」之前填数/提示被锁（toast 提示）、计时恒 00:00；点击后解锁并起表计局；新一局回到未开始态。
- **成绩行乱码修复**（C9）：v0.1.0 起成绩行误把 `<b>` 当字面文本渲染（出现一堆 `<b>`），现改为真实 `<b>` 元素。
- **四侧数字键盘**（C10）：棋盘上/下各一排、左/右各一列 1–9 键（四边四种淡色），点格后就近按数，不再盯着底部单一键盘。

> 引擎与 79 项单测不变；3084 headless 全链路复验全绿（`ui-verify` 全绿 + 截图 12 张）。3082 为 link 安装：用户**刷新页面**即得新版，无需重启服务。

## v0.1.1（2026-09-14）

用户友好性三改（用户反馈：面板要有玩法简介、难度要能一眼看出当前档位、行/列/宫高亮要分方向且柔和）。

- **玩法简介**：面板顶部新增可折叠「❓ 玩法简介」说明区，默认展开，面向新用户解释目标/提示格/选格/铅笔/撤销/提示/新一局。
- **难度下拉**：三档难度由三个按钮改为 `<select>`，选项文案「档位 · N 提示」，随时可见当前档位，切换即新开局。
- **方向差异化高亮**：选中格后行/列/宫用三种不同柔和淡色区分（行=品牌色 10% / 列=链接色 12% / 宫=中性色 8%，均 `color-mix` 淡染，明暗主题自适应），级联优先级 宫>列>行，冲突红标仍压在最上。

> 引擎与玩法逻辑不变（v0.1.0 的 79 项单测/冒烟照常全绿），纯 UI 层改动。

## v0.1.0（2026-09-14）

首个可用版本。DSH 右侧栏「🧩 数独」标签：9×9 三档难度（入门 40 / 进阶 30 / 专家 22 提示，
唯一解由挖洞校验构造保证、180° 对称）、铅笔笔记（邻域联动清除）、首填安全、行/列/宫冲突高亮、
撤销（≤500）、提示、胜利停表 + 胜利浮层、按难度成绩（localStorage）、全量主题 token。

- 引擎 `src/shared/engine.ts` 纯函数 + 注入式 `rng`（确定性回放）；`test/engine-test.mjs` 79 项断言。
- 客户端 `src/client/`（`__ModuleLoader__` 注册，guide order=42，keyed slot `sidebar.right.pane.tab`）。
- 构建门禁：产物断言 + 双端 typecheck + 无第二份 React + 无 6 位 hex + 版本五处同步。
- 验收：构建/单测/冒烟全绿；3084 临时实例真实加载（`#sdk-style` 注入、0 相关 console 错误）、
  右侧栏「数独」入口可见、棋盘 81 格渲染、填格/笔记/撤销/提示/新游戏/切难度交互链路 headless 走通（`docs/测试/截图/`）。
- host 侧 v0.1 为空壳（`inject=[]`）；成绩文件持久化、全屏模式 → v0.2。

> 3082 主力环境 link 安装待用户确认（`bash scripts/install-to-dsh.sh` 后用户自行 `systemctl --user restart dsh-dev-web`）。
