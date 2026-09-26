/**
 * dsh-sudoku — 样式。
 *
 * 主题策略（对齐 dsh-minesweeper 约定）：
 * - 语义色（品牌/状态/文字）一律走 `--dsw-alias-*` token，禁 6 位 hex（构建门禁会扫）；
 * - 网格线用 `--dsw-alias-border-l2` 混色：细线 0.5px（格线），3×3 宫线 2px 加宽（同色更深）；
 *   v0.1.2：竖线偏品牌色、横线偏 link 色，横竖一眼可辨（C7）；
 * - 中性光影 rgba 为纯亮度通道例外；语义淡染一律 `color-mix(in srgb, <token> N%, transparent)`。
 * - v0.1.2：四侧数字键（上下左右各 9 键，四边不同淡色）、全屏覆盖层、显式开始按钮。
 */
export const CSS_TEXT = `
.sdk-root{
  display:flex; flex-direction:column; gap:10px;
  padding:12px; width:100%;
  font-family:inherit;
  color:var(--dsw-alias-label-primary);
  background:var(--dsw-alias-bg-layer-1);
  box-sizing:border-box;
}
/* v0.1.2：全屏覆盖层（C5）——铺满视口并整体放大（2026-09-14 二轮反馈：视野占满屏幕） */
.sdk-root.sdk-fs{
  position:fixed; inset:0; z-index:9999;
  width:100vw; height:100vh;
  padding:12px 16px; overflow:hidden;
  gap:6px;
  box-shadow:0 0 0 9999px rgba(0,0,0,0.35);
  background:var(--dsw-alias-bg-layer-1);
}
/* 棋盘区撑满全宽；棋盘取「可用宽」与「视口高」的较小者 → 尽量大且不滚动 */
.sdk-root.sdk-fs .sdk-boardzone{
  max-width:none; width:100%;
  grid-template-columns:auto minmax(0,1fr) auto;
}
.sdk-root.sdk-fs .sdk-board-wrap{ width:100%; display:flex; justify-content:center; }
.sdk-root.sdk-fs .sdk-board{
  width:100%;
  max-width:calc(100vh - 360px);
  margin:0 auto;
}
/* 上下键排随棋盘区全宽铺满，左右键列随棋盘等高拉伸 */
.sdk-root.sdk-fs .sdk-pad-top,
.sdk-root.sdk-fs .sdk-pad-bottom{ width:100%; }
/* 全屏下的胜利浮层覆盖整个视口；提示行收起，把高度让给棋盘 */
.sdk-root.sdk-fs .sdk-winlayer{ position:fixed; inset:0; border-radius:0; }
.sdk-root.sdk-fs .sdk-toast{ display:none; }
/* 放大友好：文字/按键整体加大 */
.sdk-root.sdk-fs .sdk-title h1{ font-size:22px; }
.sdk-root.sdk-fs .sdk-badge{ font-size:13px; }
.sdk-root.sdk-fs .sdk-fsbtn{ font-size:13px; padding:4px 12px; }
.sdk-root.sdk-fs .sdk-help-head{ font-size:14px; padding:8px 12px; }
.sdk-root.sdk-fs .sdk-help-list li{ font-size:14px; }
.sdk-root.sdk-fs .sdk-dbtn{ font-size:18px; min-height:34px; }
.sdk-root.sdk-fs .sdk-pad-left .sdk-dbtn,
.sdk-root.sdk-fs .sdk-pad-right .sdk-dbtn{ font-size:22px; min-height:0; }
.sdk-root.sdk-fs .sdk-dbtn{ padding:6px 0; }
.sdk-root.sdk-fs .sdk-meter-val{ font-size:20px; }
.sdk-root.sdk-fs .sdk-meter-cap{ font-size:12px; }
.sdk-root.sdk-fs .sdk-cell{ font-size:clamp(18px, 2.4vh, 26px); }
.sdk-root.sdk-fs .sdk-note{ font-size:12px; }
.sdk-root.sdk-fs .sdk-acts .sdk-btn{ font-size:15px; padding:9px 18px; }
.sdk-root.sdk-fs .sdk-ticking{ font-size:15px; }
.sdk-root.sdk-fs .sdk-stats{ font-size:14px; }
.sdk-root.sdk-fs .sdk-toast{ font-size:14px; }
.sdk-title{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.sdk-title h1{ font-size:14px; font-weight:600; margin:0; color:var(--dsw-alias-label-primary); }
.sdk-badge{ font-size:11px; color:var(--dsw-alias-label-tertiary); }
/* v0.1.2：全屏切换按钮（C5） */
.sdk-fsbtn{
  font:inherit; font-size:11px; padding:2px 8px; cursor:pointer;
  border:0.5px solid var(--dsw-alias-border-l3); border-radius:6px;
  background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-secondary);
}
.sdk-fsbtn:hover{ background:var(--dsw-alias-interactive-bg-hover); }
.sdk-fsbtn:active{ background:var(--dsw-alias-interactive-bg-active); }

/* v0.1.1：玩法简介（可折叠；v0.1.2 起默认折叠） */
.sdk-help{
  border:0.5px solid var(--dsw-alias-border-l3); border-radius:8px;
  background:var(--dsw-alias-bg-layer-2); overflow:hidden;
}
.sdk-help-head{
  display:flex; align-items:center; justify-content:space-between; gap:8px;
  width:100%; padding:6px 10px; font:inherit; font-size:12px; font-weight:600;
  text-align:left; cursor:pointer; border:none; background:transparent;
  color:var(--dsw-alias-label-primary);
}
.sdk-help-caret{ font-size:11px; font-weight:400; color:var(--dsw-alias-label-tertiary); }
.sdk-help-body{ padding:2px 10px 8px; }
.sdk-help-list{ margin:0; padding-left:16px; display:flex; flex-direction:column; gap:3px; }
.sdk-help-list li{ font-size:12px; line-height:1.55; color:var(--dsw-alias-label-secondary); }

/* v0.1.1：难度 = 下拉（随时可见当前档位） */
.sdk-diff{ display:flex; align-items:center; gap:8px; }
.sdk-diff-label{ font-size:12px; color:var(--dsw-alias-label-secondary); white-space:nowrap; }
.sdk-diff-select{
  flex:1; font:inherit; font-size:12px; padding:4px 8px; cursor:pointer;
  border:0.5px solid var(--dsw-alias-border-l3); border-radius:7px;
  background:var(--dsw-alias-bg-layer-2);
  color:var(--dsw-alias-label-primary);
}

.sdk-meters{ display:flex; gap:8px; align-items:stretch; flex-wrap:wrap; }
.sdk-meter{
  flex:1; min-width:64px; padding:3px 8px 4px; text-align:center;
  border:0.5px solid var(--dsw-alias-border-l3);
  border-radius:6px;
  background:var(--dsw-alias-bg-layer-2);
  box-shadow:0 1px 2px rgba(0,0,0,0.12);
}
.sdk-meter-cap{ display:block; font-size:10px; line-height:14px; color:var(--dsw-alias-label-tertiary); }
.sdk-meter-val{
  display:block; font-variant-numeric:tabular-nums;
  font-size:15px; font-weight:600;
  font-family:ui-monospace, SFMono-Regular, Menlo, monospace;
}

/* ---- 棋盘：9×9；竖线=品牌色、横线=link 色（v0.1.2 C7），细线 0.5px（格），2px（3×3 宫线），外框容器承担 ---- */
.sdk-board-wrap{ position:relative; }
.sdk-board{
  display:grid; grid-template-columns:repeat(9,1fr);
  border:1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, var(--dsw-alias-border-l2));
  border-radius:8px; overflow:hidden;
  background:var(--dsw-alias-bg-layer-2);
}
.sdk-cell{
  position:relative; aspect-ratio:1/1; min-width:0;
  display:flex; align-items:center; justify-content:center;
  font-size:13px; user-select:none; -webkit-user-select:none;
  cursor:pointer; touch-action:manipulation;
  border-right:0.5px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, var(--dsw-alias-border-l2));
  border-bottom:0.5px solid color-mix(in srgb, var(--dsw-alias-link) 35%, var(--dsw-alias-border-l2));
  background:transparent;
}
.sdk-cell.sdk-c2{ border-right:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 85%, var(--dsw-alias-border-l2)); }
.sdk-cell.sdk-r2{ border-bottom:2px solid color-mix(in srgb, var(--dsw-alias-link) 85%, var(--dsw-alias-border-l2)); }
.sdk-cell.sdk-edge-r{ border-right:none; }
.sdk-cell.sdk-edge-b{ border-bottom:none; }
.sdk-cell:hover{ background:var(--dsw-alias-interactive-bg-hover); }

.sdk-val{ font-weight:600; }
.sdk-given .sdk-val{ color:var(--dsw-alias-label-primary); font-weight:700; }
/* v0.1.2 C6：用户填的数字用 link 色（区别于题目提示的 label-primary 加粗） */
.sdk-filled .sdk-val{ color:var(--dsw-alias-link); font-weight:600; }
/* v0.1.1：方向差异化高亮（行=品牌色 / 列=link 色 / 宫=中性色，8–12% 淡染柔和不刺眼）。
   同一格可命中多方向（如同宫必同列），同级联后者胜 → 宫 > 列 > 行。 */
.sdk-cell.sdk-hl-r{ background:color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent); }
.sdk-cell.sdk-hl-c{ background:color-mix(in srgb, var(--dsw-alias-link) 12%, transparent); }
.sdk-cell.sdk-hl-b{ background:color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent); }
/* 冲突态压过方向高亮（放其后，同特异性后者胜） */
.sdk-conflict{ background:var(--dsw-alias-state-error-secondary); }
.sdk-conflict .sdk-val{ color:var(--dsw-alias-state-error-primary); }
.sdk-same{ color:var(--dsw-alias-brand-primary); }
.sdk-same .sdk-val{ color:var(--dsw-alias-brand-primary); }
.sdk-sel{
  box-shadow:inset 0 0 0 2px var(--dsw-alias-brand-primary);
  background:var(--dsw-alias-interactive-bg-hover);
}

/* 铅笔笔记：3×3 迷你格 */
.sdk-notes{
  position:absolute; inset:1px;
  display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr);
}
.sdk-note{ font-size:7px; line-height:1; color:var(--dsw-alias-label-tertiary);
  display:flex; align-items:center; justify-content:center; overflow:hidden; }
.sdk-note-sdk-off{ visibility:hidden; }

/* ---- 四侧数字键（v0.1.2 C10）：上下横排 9 键、左右竖排 9 键，四边各一淡色 ----
   布局：grid 3 列（左键 | 棋盘 | 右键）× 3 行（上键 | 棋盘 | 下键） */
.sdk-boardzone{
  display:grid;
  grid-template-columns:auto auto auto;
  grid-template-rows:auto 1fr auto;
  gap:5px;
  align-items:stretch;
}
.sdk-pad{ gap:3px; }
.sdk-pad-top{ grid-column:2; grid-row:1; display:grid; grid-template-columns:repeat(9,1fr); }
.sdk-pad-left{ grid-column:1; grid-row:2; display:grid; grid-template-rows:repeat(9,1fr); }
.sdk-board-wrap{ grid-column:2; grid-row:2; min-width:0; }
.sdk-pad-right{ grid-column:3; grid-row:2; display:grid; grid-template-rows:repeat(9,1fr); }
.sdk-pad-bottom{ grid-column:2; grid-row:3; display:grid; grid-template-columns:repeat(9,1fr); }
/* 各侧淡色（品牌 / link / 成功绿 / 警示琥珀，token 混合淡染） */
.sdk-pad-top .sdk-dbtn{ background:color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent); border-color:color-mix(in srgb, var(--dsw-alias-brand-primary) 38%, transparent); }
.sdk-pad-right .sdk-dbtn{ background:color-mix(in srgb, var(--dsw-alias-link) 14%, transparent); border-color:color-mix(in srgb, var(--dsw-alias-link) 38%, transparent); }
.sdk-pad-bottom .sdk-dbtn{ background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent); border-color:color-mix(in srgb, var(--dsw-alias-state-success-primary) 38%, transparent); }
.sdk-pad-left .sdk-dbtn{ background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 16%, transparent); border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent); }
.sdk-pad-top .sdk-dbtn:active{ background:color-mix(in srgb, var(--dsw-alias-brand-primary) 38%, transparent); }
.sdk-pad-right .sdk-dbtn:active{ background:color-mix(in srgb, var(--dsw-alias-link) 38%, transparent); }
.sdk-pad-bottom .sdk-dbtn:active{ background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 38%, transparent); }
.sdk-pad-left .sdk-dbtn:active{ background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 42%, transparent); }
.sdk-dbtn{
  font:inherit; font-size:12px; font-weight:600; padding:3px 0;
  display:flex; align-items:center; justify-content:center;
  border:0.5px solid var(--dsw-alias-border-l2); border-radius:6px;
  background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary);
  cursor:pointer; min-height:22px;
}
.sdk-dbtn:active{ background:var(--dsw-alias-interactive-bg-active); }
/* 开始按钮 / 计时中状态（v0.1.2 C8） */
.sdk-btn-start{
  background:var(--dsw-alias-button-primary-fill);
  color:var(--dsw-alias-label-primary-foreground);
  border-color:transparent;
  font-weight:600;
}
.sdk-ticking{
  font-size:12px; font-weight:600; padding:4px 6px;
  color:var(--dsw-alias-state-success-primary);
  display:inline-flex; align-items:center;
}
.sdk-acts{ display:flex; gap:6px; flex-wrap:wrap; }
.sdk-btn{
  font:inherit; font-size:12px; padding:5px 10px; cursor:pointer;
  border:0.5px solid var(--dsw-alias-border-l2); border-radius:7px;
  background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary);
}
.sdk-btn:active{ background:var(--dsw-alias-interactive-bg-active); }
.sdk-btn.sdk-on{
  background:var(--dsw-alias-button-primary-fill);
  color:var(--dsw-alias-label-primary-foreground);
  border-color:transparent;
}
.sdk-btn-primary{
  background:var(--dsw-alias-button-primary-fill);
  color:var(--dsw-alias-label-primary-foreground);
  border-color:transparent;
}

/* ---- 成绩 / 状态 / 提示 ---- */
.sdk-stats{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; font-size:12px; color:var(--dsw-alias-label-secondary); }
.sdk-stats b{ color:var(--dsw-alias-label-primary); font-weight:600; }
.sdk-link-btn{
  font:inherit; font-size:12px; cursor:pointer;
  border:none; background:none; padding:0;
  color:var(--dsw-alias-link); text-decoration:underline;
}
.sdk-toast{
  min-height:16px; font-size:12px; color:var(--dsw-alias-label-secondary);
  color:var(--dsw-alias-brand-primary);
}

/* ---- 胜利浮层 ---- */
.sdk-winlayer{
  position:absolute; inset:0; z-index:10;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;
  background:var(--dsw-alias-bg-layer-2);
  border-radius:8px;
}
.sdk-winlayer h2{ margin:0; font-size:18px; color:var(--dsw-alias-label-primary); }
.sdk-winlayer p{ margin:0; font-size:13px; color:var(--dsw-alias-label-secondary); }
`;