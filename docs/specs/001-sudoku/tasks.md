# 任务计划 — spec 001（dsh-sudoku v0.1）

> 状态图例：✅ 完成 / ▶ 进行中 / ⏸ 等待外部条件

| # | 任务 | 状态 | 证据/备注 |
|---|------|------|-----------|
| T1 | 需求澄清（Phase 0 七问 → 全部按推荐确认；v0.1.1/v0.1.2 中途变更见 request.md） | ✅ | spec.md §2 D1–D9 |
| T2 | 脚手架：package.json / cordis.patch.yml / tsconfig 双份 / build 门禁 / 空壳 host | ✅ | `scripts/build.mjs` 全门禁 |
| T3 | 引擎 `src/shared/engine.ts` + 难度表 | ✅ | 生成/挖洞/唯一解/首填安全/笔记/撤销/提示/胜负 |
| T4 | 引擎测试（确定性 rng 回放） | ✅ | `test/engine-test.mjs` 79 项 |
| T5 | client：entry 注册 / ui.ts 全功能 / css token | ✅ | guide order=42；`sdk-*` 类；无 6 位 hex |
| T6 | 产物冒烟 + 双端 typecheck | ✅ | `test/smoke-test.mjs` 23 项；`scripts/build.mjs` 绿 |
| T7 | 临时实例（3084）安装 + UI 验证 + 截图 | ✅ | v0.1.0 全链路 + v0.1.1/v0.1.2 复验（`docs/screenshots/`）；test-home 手工播种 workspace（TROUBLESHOOTING §3） |
| T8 | 3082 link 安装 + `verify-installed.mjs` | ✅（装）/⏸（用户验收） | 2026-09-14 用户确认后 `install-to-dsh.sh`：12/12 验证过；link 安装 → v0.1.2 客户端改动刷新页面即生效 |
| T9 | 文档补齐（request/spec/tasks/REQUIREMENTS/PROGRESS/README/CHANGELOG/TROUBLESHOOTING） | ✅ | 随 v0.1 交付；v0.1.1/v0.1.2 变更已同步 |
| T10 | 根 `progress.md` 增加 dsh-sudoku 条目 | ✅ | 2026-09-14 已更新（v0.1.2 行已回写） |
| T11 | （v0.1.1）难度改 `<select>` 下拉（C2/A8） | ✅ | `ui.ts` `.sdk-diff-select` + `onChange→newGame`；验证 `value=expert` |
| T12 | （v0.1.1）顶部「玩法简介」可折叠区（C1/A7） | ✅ | `ui.ts` `.sdk-help`（v0.1.2 起默认折叠，5 条规则）；验证折叠/展开 |
| T13 | （v0.1.1）行/列/宫方向差异化柔和高亮（C3/A9） | ✅ | `peerClasses`→`sdk-hl-r/-c/-b`；`color-mix` 8–12% 淡染，级联 宫>列>行，冲突压顶；三向类计数 8/8/8 |
| T14 | （v0.1.1）修复 `newGame` 缺 `re()` 导致新一局/切难度后 UI 不刷新 | ✅ | `newGame` 末尾补 `re()`；`ui-verify` 盘面指纹断言 |
| T15 | （v0.1.2）中途变更二登记 + spec D9 + A10–A16 | ✅ | `request.md` 用户原话 + C4–C10；spec D9/A10–A16（已翻 ✅） |
| T16 | （v0.1.2 C4/C5/C8）简介默认折叠 + 「⛶ 全屏」+ 「▶ 开始」显式起表（未点前锁定填数、计时 00:00，新一局重置） | ✅ | `helpOpen:false` / `sdk-fsbtn`+`sdk-fs` / `startArmed` 门控 + `onStart`；3084 实测：默认折叠 ✓、全屏开/退 ✓（二轮：棋盘按屏幕最大化 + 整体放大）、开始前锁定 ✓、开始后 ⏱ 计时中 ✓ |
| T17 | （v0.1.2 C6/C7）用户填数=link 色；竖线=品牌淡染/横线=link 淡染（宫线同向加宽） | ✅ | `css.ts` `color-mix` 分色（`sdk-c2`/`sdk-r2` 加宽同色）；截图 04d/05c 可辨 |
| T18 | （v0.1.2 C10）棋盘四侧数字键盘（上下横排/左右竖排各 1–9，四边四色） | ✅ | `.sdk-boardzone` 3×3 grid 布局 + 上品牌/右 link/下绿/左琥珀 `color-mix` 淡染；ui-verify 四侧键数各 9 ✓ |
| T19 | （v0.1.2 C9）成绩行字面 `<b>` 乱码修复（改 `h("b")` 元素） | ✅ | ui-verify `stats 字面量 <b> 残留: 无 ✓` |
| T20 | （v0.1.2）版本五处同步 0.1.2 + 构建/引擎/冒烟/3084 全链路复验 | ✅ | build 门禁绿、engine 79 ✓、smoke 23 ✓、ui-verify 全绿（截图 12 张）；3082 用户刷新页面即得新版 |

## v0.2 候选（未排期）

- host 侧成绩文件持久化（`inject` 不再为空）
- 自定义尺寸/提示数、每日挑战、分享棋谱
- 专家档更贴近 17 提示的深挖（多轮重排预算加大）