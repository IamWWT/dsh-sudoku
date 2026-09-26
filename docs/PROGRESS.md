# PROGRESS — dsh-sudoku

> 本插件进度真源。工作区根 `progress.md` 仅做索引（一行）。

## 当前状态（2026-09-24）

**v0.1.3 已交付：跨平台构建（Windows / Ubuntu 同一份源码，均可 `npm run check`）。
3082 为 link 安装，用户刷新页面即得新版（无需重启服务）。**

| 阶段 | 状态 |
|------|------|
| 需求澄清（Phase 0 七问 + v0.1.1/v0.1.2 两轮中途变更 C1–C10） | ✅ 全部确认（用户原话见 request.md） |
| 脚手架 + host 空壳 + 构建门禁 | ✅ `scripts/build.mjs` 全绿 |
| 引擎 + 79 项单测 | ✅ `test/engine-test.mjs` |
| 客户端（entry/ui/css）+ 冒烟 23 项 | ✅ `test/smoke-test.mjs` |
| 3084 临时实例真实验证（v0.1.2 复验） | ✅ 简介默认折叠 / 全屏开关 / 「▶ 开始」前锁定+开始后 ⏱ 计时 / 四侧键各 9 / 成绩行无 `<b>` 乱码 / 方向高亮 8/8/8（`docs/screenshots/` 12 张） |
| v0.1.3 跨平台构建 | ✅ 新增 `scripts/paths.mjs`/`paths.sh`；动态导入与预载参数改文件 URL；tsc 经当前 Node 启动；双 tsconfig 类型检查 0 错误；门禁全过；79 单测 + 23 冒烟全绿 |
| 3082 主力环境 | ✅ 已 link 安装（用户自行重启 3082 并在实机试用中）；v0.1.3 纯构建/脚本改动 → **用户刷新页面即生效** |
| 根 progress.md 索引 | ✅ 已更新（v0.1.3 行） |

## 决策快照

- guide order=**42**（minesweeper 41 之后，改动前须核对占用）
- 难度：入门 40 / 进阶 30 / 专家 22（目标提示数，实际 ≥ 目标，≤ target+5 容差）
- 成绩：localStorage `dsh-sudoku/v1/<难度id>`（host 文件持久化 → v0.2）
- 版本同步：**以 `package.json` 为单一事实源**，`scripts/build.mjs` 门禁由它推导期望值并断言
  host `VERSION`（`src/index.ts`）、客户端徽章字面量（`ui.ts`）、以及
  `src/client/entry.ts` 的 `pluginExports.VERSION`（v0.1.3 补上——此前该处无人校验，
  曾停留在 0.1.2 而门禁全绿）

## 临时环境

- 3084 实例：主 harness checkout 启动，`DSH_HOME=<插件目录>/test-home`（插件目录内，随插件走）
- test-home 是**全新 home**：welcome 步每次新浏览器档都要点一次；工作区需手工播种 `test-home/storages/workspace.json`（首次播种后实例需重启；细节见 `docs/TROUBLESHOOTING.md`）
- 测完即关：kill 3084 后台任务；test-home 保留（下次复验免重建）

## 版本历史

- **v0.1.3**（2026-09-24）：跨平台构建（Windows / Ubuntu 双环境同一份源码）。① 新增共享路径解析器 `scripts/paths.mjs`/`paths.sh`，构建/类型检查/安装/验证脚本全部改用它，消除硬编码 Linux 目录；② 动态 `import()` 与 `--import` 预载参数改用文件 URL（Windows 上裸盘符路径被 ESM loader 拒为协议 `d:`）；③ 类型检查改为经当前 Node 执行 TypeScript 的 `lib/tsc.js`；④ `tsconfig.json` 的 `typeRoots` 清理、补 `devDependencies`；⑤ 测试去机器化（截图目录/chromium 路径改 env 覆盖）；⑥ 门禁收紧：版本断言改为从 `package.json` 推导，并补上对 `src/client/entry.ts` 的 `pluginExports.VERSION` 校验。引擎/玩法不变，79 单测 + 23 冒烟照常全绿。
- **v0.1.2**（2026-09-14）：3082 实机试用反馈落地（中途需求变更二，C4–C10，纯 UI/交互层）：① 玩法简介默认折叠；② 「⛶ 全屏」按钮（fixed 铺满视口，再点退出；二轮反馈后全屏棋盘按屏幕最大化 + 整体放大）；③ 用户填数 = link 色（与提示格 label 色、同数字联动品牌色三分）；④ 竖线=品牌淡染 / 横线=link 淡染（宫线同向加宽）；⑤ 「▶ 开始」显式起表（未点前锁定填数、计时 00:00，推翻 v0.1.0 首动自动起表；新一局重置）；⑥ 成绩行 `<b>` 字面量乱码修复（改 `h("b")` 元素）；⑦ 棋盘四侧数字键盘（上下横排/左右竖排各 1–9，四边四色）。引擎不变，79 单测 + 23 冒烟照常全绿；3084 headless 复验全绿。
- **v0.1.1**（2026-09-14）：用户友好性三改（中途需求变更，见 request.md「中途需求变更」节）：① 顶部「玩法简介」可折叠说明区（v0.1.2 起默认折叠）；② 难度三按钮改 `<select>` 下拉（随时可见当前档位）；③ 行/列/宫方向差异化柔和高亮（`color-mix` 8–12% 淡染，级联 宫>列>行，冲突红标压顶）。另修复 `newGame` 缺 `re()` 导致「新一局/切难度后 UI 不刷新」的隐患（补盘面指纹断言防回归）。引擎/玩法逻辑不变，79 项单测 + 23 冒烟照常全绿。
- **v0.1.0**（2026-09-14）：首发。三档难度唯一解数独 + 铅笔笔记/首填安全/冲突高亮/撤销/提示 + 胜利停表 + 按难度成绩。
- v0.2（未排期）：自定义尺寸/提示数、host 侧成绩文件持久化、每日挑战、分享棋谱。