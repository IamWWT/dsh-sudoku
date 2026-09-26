# AGENTS.md — dsh-sudoku

本插件的工程纪律（工作区级约定见 `../../AGENTS.md` 与 `../../PLUGIN-DEV-STANDARD.md`，此处只列本插件特有项）。

## 红线

1. **不碰 3082 主力环境**：开发/验证一律走临时实例（独立 `DSH_HOME` + 端口 3084）；
   装 3082 必须经用户显式同意，且 `install-to-dsh.sh` 永远不自动重启 `dsh-dev-web`。
2. **不修改 `deepseek-harness/` 源码**：一切扩展走 Cordis 注册面。
3. **client 侧禁止第二份 React**：React 只能来自宿主 `window.__ModuleLoader__` 的 `require("react")`；
   禁止 `import "react"` 进 bundle（门禁：产物不得含 `ReactCurrentOwner`）。
4. **禁止硬编码色值**：CSS 只用 `--dsw-alias-*` / `--dsw-elevation-*` token
   （中性光影 rgba 例外，纯亮度通道，同 dsh-minesweeper 约定）；6 位 hex 一律禁止（门禁会扫）。
5. **注册面只走公开 API**：`ctx.sidebarRightTabs.register` + `sidebar.right.pane.tab`（keyed slot）；
   不得注册与核心同名的子插槽。guide order 固定 42（改动前先在插件间核对占用）。
6. **host 侧 v0.1 保持空壳**：`inject=[]`、`apply` 无操作。v0.2 加 host 能力（成绩文件持久化等）
   时先改 spec 再动手。
7. **确定性**：引擎随机源必须走 `Puzzle.rng`（`newPuzzle` 注入），禁止引擎内部直调 `Math.random`。
8. **版本五处同步**：`package.json.version` == `src/index.ts VERSION` == `scripts/build.mjs` 门禁断言
   == README/CHANGELOG == `src/client/ui.ts` 版本徽章字面量（`dsh-sudoku v0.x.y`）。
   **sed 批量升版必须包含 `ui.ts` 的徽章字面量**（minesweeper v0.4 教训）。
   自查：`grep -rn "v0\." README.md docs CHANGELOG.md src lib package.json`。
   同版本重复打包不会刷新 pnpm 安装（integrity 判定「已最新」）——开发期一律源码 link 安装。

## 常用命令

```bash
node scripts/build.mjs            # 构建 + 门禁 + 双端 typecheck
node test/engine-test.mjs         # 引擎单测（生成/唯一解/玩法/确定性回放）
node test/smoke-test.mjs          # 产物冒烟
bash scripts/install-to-dsh.sh    # 3082 link 安装（构建→冒烟→rm 旧→add→验证；不重启）
```

## 布局约定

- `src/index.ts` host 入口 → `lib/index.js`（ESM，node:* / @deepseek-ai/* external）
- `src/client/entry.ts` → `lib/client.js`（IIFE，`__ModuleLoader__` 注册）
- `src/shared/` 双端共享（引擎、难度表）；`test/` 全部为 Node 直跑脚本，无框架。