# TROUBLESHOOTING — dsh-sudoku

> **当前状态**：文档性质 = **排障手册（当前有效）**｜对应版本 = **v0.1.4**｜
> 状态 = **插件本体无已知缺陷**；下列 **1–5** 为开发/验证环境（3084 临时实例、test-home、headless 自动化）
> 的**仍然适用**的处置办法，**6–8** 为**已修复**的历史缺陷（保留可复用教训）｜
> 维护者 = 本插件开发者（agent + 用户）。

> 新增条目请写「现象 → 根因 → 修复（+教训）」，并注明所属版本或标记为环境类。
> 逐版本变更史见 [`../CHANGELOG.md`](../../CHANGELOG.md)；当前验证流程见 [PP-项目计划.md](PP-项目计划.md)。

## A. 环境 / 验证流程类（仍然适用）

### 1. 全新 test-home 打开 3084 报「dsh web authentication required」

- **现象**：headless 打开 `http://127.0.0.1:3084/` 停在认证页（HTTP 401）。
- **根因**：`dsh web` 启动时打印一次性 token URL；直接访问裸域名不带 token 即被拦。
- **修复**：从实例启动日志取 token，访问 `?token=<token>`；`test/ui-verify.mjs` 第 3 个参数传 token。

### 2. 全新 test-home 停在「选择工作区」，右侧栏/标签不可达

- **现象**：onboarding 点完「继续/稍后配置」后停在 hero 的「选择工作区」；右侧栏无「数独」入口，headless 无法继续。
- **根因**（两个叠加）：
  1. 全新 home 的 `storages/workspace.json` 是空 registry（`workspaceIds: []`），hero 的工作区 chip 只能走 OS 目录选择器，headless 无 OS 对话框 → 卡死。
  2. **右侧栏的插件 tab 只在「会话视图」出现**；hero（无会话）态右侧栏只有「空面板」。会话需**在 composer 里真实发送一条消息**才会创建（点 hero 的「新会话」只武装工作区，不建会话）。
- **修复**（`test/ui-verify.mjs` 固化）：
  1. **播种工作区**：向 `test-home/storages/workspace.json` 写一条完整记录（schema 必填 `path`(realpath)/`title`/`sessionIds`/`createdAt`/`updatedAt`，缺 `createdAt/updatedAt` 启动即 `ZodError` 崩）；写后**重启实例**生效。
  2. UI 流程：onboarding → 工作区 chip 选 `dsh-sudoku` → 在 composer（`contenteditable`）敲字并点「发送消息」→ 进会话视图（无 API key 时模型调用失败无妨，会话/右侧栏照常）→ aria-label「打开右侧边栏」展开 → 点右侧栏「数独」入口。
- **教训**：DSH Web 的会话视图依赖真实会话；自动化验证无 API key 时**必须发一条探针消息**建会话，模型报错不影响右侧栏/插件标签。

### 3. 3084 实例重启后 token 变化

- **现象**：重启实例后旧 token 的 URL 失效。
- **修复**：每次重启从启动日志重新取 token（`dsh web: http://127.0.0.1:3084/?token=...`）。

### 4. ui-verify 末段 `browser.close()` 挂起

- **现象**：所有步骤完成后脚本不退出（被外部 timeout 杀掉，exit 124）。
- **根因**：DSH 页面持有到服务器的长连接（WS/长轮询），headless 页面不主动释放。
- **规避**：脚本以「打印完 RESULT 即视为完成」；跑完用 `timeout` 包裹并 `pkill -f ui-verify.mjs` 清理残留 chrome。不影响验证结论（全部断言在挂起前已打印）。

### 5. `getByRole` 命中隐藏按钮导致分支跑偏

- **现象**：onboarding 后点击「新会话」无效果，流程卡住。
- **根因**：Playwright `getByRole(...).count()` 对**隐藏**按钮也计数；`isVisible` 才是真状态。
- **修复**：一律 `count() && isVisible()` 组合判断后再点击；hero 态改用 composer 直发。

## B. 已修复的历史缺陷（保留可复用教训）

### 6. 挖洞专家档提示数停在 26 下不去

- **现象**：专家档（目标 22）单轮挖洞耗尽搜索序后提前停，实际 26 提示。
- **根因**：随机序一次性挖洞在唯一解约束下会中途全部回滚。
- **修复**：`removeClues` 改为**多轮重排**（≤4 轮，每轮重新洗牌挖除序），逼近目标；测试容差 `clues ≤ target+5`（现行行为，见 [BRD-业务需求说明书.md](../需求/BRD-业务需求说明书.md) §与 spec 的已知偏差）。

### 7.（v0.1.1）「新一局 / 难度切换」点击后 UI 不刷新

- **现象**：点「🎲 新一局」或把难度下拉切到 expert 后，DOM/截图里棋盘仍是旧盘面；`select` 的 `value` 停在 `beginner`。
- **根因**：`newGame()` 只改了可变状态 `d.*` 并调 `toast()`，却**没有触发重渲染**（本组件用 `useState` tick 驱动，状态改动后必须显式 `re()`）。受控 `<select value=d.diffId>` 在 React 重渲染时会把 DOM 值重置回旧值，于是切档「看似无效」。v0.1.0 的按钮版难度因视觉差异小被漏过，v0.1.1 切下拉时暴露。
- **修复**：`newGame()` 末尾补 `re()`；`test/ui-verify.mjs` 增加**盘面指纹断言**（对比 `.sdk-val` 文本序列，断言新一局后盘面确实变化），防止回归。
- **教训**：任何「改状态但不走事件处理器」的副作用（`toast`、`newGame`、`onClearStats` 之外）都必须自行 `re()`；验证交互时别只点按钮，要断言**结果态**（DOM 值/计数/文本），而非「没抛错即通过」。

### 8.（v0.1.2）成绩行显示字面 `<b>`「乱码」

- **现象**：成绩行渲染出「最佳 `<b>—</b>` · 🏆 `<b>0</b>` 胜 · 共 `<b>1</b>` 局」——尖括号当文字显示（用户反馈"怎么有很多乱码的b"）。
- **根因**：成绩行用模板字符串把整段 HTML（含 `<b>` 标签）作为**单个字符串子节点**传给 `h("span", null, "...")`。React 对字符串子节点按纯文本转义渲染，不会解析成元素——这是 React 的 XSS 防护，不是 bug；标签必须用 `h("b", null, text)` 这样的**元素子节点**表达。
- **修复**：成绩行改为 `h("span", null, "最佳 ", h("b", null, "—"), " · 🏆 ", h("b", null, String(wins)), …)`；ui-verify 增加断言「`stats` 文本不含 `<b>`」。
- **教训**：宿主 React（经 `__ModuleLoader__` 的 createElement）与浏览器 innerHTML 语义不同——**凡带标签的文案一律拆成元素，绝不把 HTML 当字符串传**。
