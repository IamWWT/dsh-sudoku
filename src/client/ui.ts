/**
 * dsh-sudoku — 客户端 UI（React 由 DSH 宿主经 factory require 注入，
 * 本文件不做任何静态 react import；全部 createElement 走注入的 R）。
 *
 * 组件：App（标签主体）= 标题 + 难度切换 + 计量表（剩余/用时/最佳）+ 9×9 棋盘
 *      + 数字键盘（含铅笔笔记开关）+ 操作行（撤销/提示/新一局）+ 成绩行 + 胜利浮层。
 *
 * 交互（v0.1.1，指针优先，无键盘快捷键——非目标）：
 *  - 点格子 → 选中（行=品牌色 / 列=link 色 / 宫=中性色 三向差异化淡染 + 同数字高亮）
 *  - 点数字键 → 铅笔模式开：空格的候选笔记切换；关：填数（再点同数字 = 不变）
 *  - 顶部「难度」下拉随时可见当前档位；切换即新开局
 *  - 顶部「❓ 玩法简介」可折叠区（默认展开），面向新用户
 *  - 撤销：回退最近一步（填数/提示；提示格不可改所以无需特殊处理）
 *  - 提示：补第一个空格（无空格则改第一个错格），计为互动（起表）
 *  - 首填安全：首个填入的数字若错误会被引擎自动修正（toast 提示）
 *  - 胜利：全格正确 → 停表 + 浮层（最佳纪录/新纪录），成绩按难度存 localStorage
 */
import { DIFFICULTIES } from "../shared/difficulties.ts";
import {
  newPuzzle,
  toggleNote,
  fillDigit,
  hint,
  undo,
  remaining,
  computeConflicts,
  type Puzzle,
} from "../shared/engine.ts";

/* ---------------- 本地成绩（localStorage 权威，host 文件持久化为 v0.2） ---------------- */

interface Stats {
  bestMs: number | null;
  plays: number;
  wins: number;
}

const EMPTY_STATS: Stats = { bestMs: null, plays: 0, wins: 0 };

const statsKey = (diffId: string): string => `dsh-sudoku/v1/${diffId}`;

function loadStats(key: string): Stats {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const j = JSON.parse(raw) as Partial<Stats>;
      return {
        bestMs: typeof j.bestMs === "number" ? j.bestMs : null,
        plays: typeof j.plays === "number" ? j.plays : 0,
        wins: typeof j.wins === "number" ? j.wins : 0,
      };
    }
  } catch {
    /* localStorage 不可用（隐私模式等）时静默降级 */
  }
  return { ...EMPTY_STATS };
}

function saveStats(key: string, s: Stats): void {
  try {
    localStorage.setItem(key, JSON.stringify(s));
  } catch {
    /* 忽略配额/隐私模式失败：成绩仅尽力而为 */
  }
}

/* ---------------- 时间 ---------------- */

function fmtMs(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number): string => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}

/** v0.1.1：选中格后按方向返回应叠加的高亮类（行/列/宫 各自独立，CSS 级联 宫>列>行）。 */
function peerClasses(i: number, sel: number): string[] {
  const sr = Math.floor(sel / 9);
  const sc = sel % 9;
  const out: string[] = [];
  if (Math.floor(i / 9) === sr) out.push("sdk-hl-r");
  if (i % 9 === sc) out.push("sdk-hl-c");
  const box = (x: number): number => Math.floor(Math.floor(x / 9) / 3) * 3 + Math.floor((x % 9) / 3);
  if (box(i) === box(sel)) out.push("sdk-hl-b");
  return out;
}

/* ---------------- 可变 UI 状态（ref 持有，tick 触发重渲染） ---------------- */

interface UiData {
  p: Puzzle;
  diffId: string;
  selected: number;
  noteMode: boolean;
  stats: Record<string, Stats>;
  toastMsg: string;
  toastUntil: number;
  started: boolean;
  startedCounted: boolean;
  startWall: number;
  baseMs: number;
  wonMs: number | null;
  newBest: boolean;
  armedClear: boolean;
  helpOpen: boolean;
  startArmed: boolean;
  fullscreen: boolean;
}

function makeData(diffId: string, stats: Record<string, Stats>): UiData {
  return {
    p: newPuzzle(diffId),
    diffId,
    selected: -1,
    noteMode: false,
    stats,
    toastMsg: "",
    toastUntil: 0,
    started: false,
    startedCounted: false,
    startWall: 0,
    baseMs: 0,
    wonMs: null,
    newBest: false,
    armedClear: false,
    helpOpen: false, // v0.1.2：玩法简介默认折叠（C4）
    startArmed: false, // v0.1.2：点「▶ 开始」后才解锁填数/计时（C8）
    fullscreen: false, // v0.1.2：全屏切换（C5）
  };
}

function currentElapsed(d: UiData): number {
  if (d.wonMs !== null) return d.wonMs;
  if (!d.started) return 0;
  return d.baseMs + (Date.now() - d.startWall);
}

/* ---------------- 组件工厂 ---------------- */

export interface SudokuUI {
  /** 标签主体组件（经 R.createElement 渲染）。 */
  App: (props: Record<string, unknown>) => unknown;
}

export function createSudokuUI(R: any): SudokuUI {
  const h = R.createElement as (type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]) => unknown;
  const useState = R.useState as <T>(init: T) => [T, (v: T | ((prev: T) => T)) => void];
  const useRef = R.useRef as <T>(init: T | null) => { current: T | null };
  const useEffect = R.useEffect as (fn: () => void | (() => void), deps?: unknown[]) => void;

  const App = (): unknown => {
    const [, setTick] = useState(0);
    const st = useRef<UiData | null>(null);
    if (st.current === null) {
      const stats: Record<string, Stats> = {};
      for (const df of DIFFICULTIES) stats[df.id] = loadStats(statsKey(df.id));
      st.current = makeData("beginner", stats);
    }
    const d = st.current as UiData;
    const re = (): void => setTick((t: number) => t + 1);

    const toast = (msg: string): void => {
      d.toastMsg = msg;
      d.toastUntil = Date.now() + 2600;
    };

    const startClock = (): void => {
      if (d.started || d.wonMs !== null || !d.startArmed) return;
      d.started = true;
      d.startWall = Date.now();
      if (!d.startedCounted) {
        d.startedCounted = true;
        const s = d.stats[d.diffId];
        s.plays++;
        saveStats(statsKey(d.diffId), s);
      }
    };

    const onWin = (): void => {
      if (d.wonMs !== null) return;
      d.wonMs = currentElapsed(d);
      const s = d.stats[d.diffId];
      s.wins++;
      if (s.bestMs === null || d.wonMs < s.bestMs) {
        s.bestMs = d.wonMs;
        d.newBest = true;
      }
      saveStats(statsKey(d.diffId), s);
    };

    const newGame = (nextDiff?: string): void => {
      const target = nextDiff ?? d.diffId;
      if (target !== d.diffId && !DIFFICULTIES.some((x) => x.id === target)) return;
      const label = DIFFICULTIES.find((x) => x.id === target)?.label ?? target;
      const switched = target !== d.diffId;
      d.diffId = target;
      d.p = newPuzzle(target);
      d.selected = -1;
      d.started = false;
      d.startedCounted = false;
      d.startWall = 0;
      d.baseMs = 0;
      d.wonMs = null;
      d.newBest = false;
      d.armedClear = false;
      d.startArmed = false; // v0.1.2：新一局回到未开始状态（C8）
      toast(switched ? `已切换到${label}：新棋局` : "已生成新棋局");
      // v0.1.1 修复：newGame 必须触发重渲染（此前新一局/难度切换后 UI 不刷新）
      re();
    };

    const onCell = (idx: number): void => {
      d.selected = idx;
      re();
    };

    const onDigit = (digit: number): void => {
      if (d.wonMs !== null) return;
      if (!d.startArmed) {
        toast("先点「▶ 开始」再填格");
        re();
        return;
      }
      if (d.selected < 0) {
        toast("先点选一个格子，再按数字");
        re();
        return;
      }
      if (d.p.givens[d.selected]) {
        toast("提示格不可修改");
        re();
        return;
      }
      if (d.noteMode && d.p.grid[d.selected] === 0) {
        toggleNote(d.p, d.selected, digit);
        re();
        return;
      }
      startClock();
      const r = fillDigit(d.p, d.selected, digit);
      if (!r.ok) {
        toast(r.msg ?? "操作不可用");
      } else if (r.corrected) {
        toast("首填安全：已自动修正为正确值");
      } else if (r.won) {
        onWin();
      }
      re();
    };

    const onUndo = (): void => {
      if (!undo(d.p)) {
        toast("没有可撤销的操作");
      }
      re();
    };

    const onHint = (): void => {
      if (d.wonMs !== null) return;
      if (!d.startArmed) {
        toast("先点「▶ 开始」再使用提示");
        re();
        return;
      }
      startClock();
      const r = hint(d.p);
      if (!r) {
        toast("盘面已是完整正解");
      } else if (d.p.state === "won") {
        onWin();
      }
      re();
    };

    const onClearStats = (): void => {
      if (!d.armedClear) {
        d.armedClear = true;
        toast("再点一次「清空记录」确认");
        setTimeout(() => {
          d.armedClear = false;
          re();
        }, 3000);
        re();
        return;
      }
      for (const df of DIFFICULTIES) {
        const zero = { ...EMPTY_STATS };
        d.stats[df.id] = zero;
        saveStats(statsKey(df.id), zero);
      }
      d.armedClear = false;
      toast("已清空全部成绩");
      re();
    };

    /* v0.1.2：显式开始（C8）——点击后解锁填数并计时 */
    const onStart = (): void => {
      if (d.startArmed || d.wonMs !== null) return;
      d.startArmed = true;
      startClock();
      re();
    };

    /* 计时推进：仅计时中才跑定时器 */
    useEffect(() => {
      if (!d.started || d.wonMs !== null) return;
      const id = setInterval(() => {
        setTick((t) => t + 1);
      }, 500);
      return () => clearInterval(id);
    }, [d.started, d.wonMs === null]);

    /* ---------------- 渲染 ---------------- */
    const p = d.p;
    const conflicts = new Set(computeConflicts(p));
    const sel = d.selected;
    const selVal = sel >= 0 ? p.grid[sel] : 0;
    const elapsed = currentElapsed(d);
    const ss = d.stats[d.diffId];
    const toastText = d.toastMsg && Date.now() < d.toastUntil ? d.toastMsg : "";

    const boardCells: unknown[] = [];
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      const cn: string[] = ["sdk-cell"];
      if (c % 3 === 2 && c < 8) cn.push("sdk-c2");
      if (r % 3 === 2 && r < 8) cn.push("sdk-r2");
      if (c === 8) cn.push("sdk-edge-r");
      if (r === 8) cn.push("sdk-edge-b");
      const v = p.grid[i];
      if (p.givens[i]) cn.push("sdk-given");
      else if (v !== 0) cn.push("sdk-filled");
      if (conflicts.has(i)) cn.push("sdk-conflict");
      if (sel >= 0 && i !== sel) cn.push(...peerClasses(i, sel));
      if (selVal !== 0 && v === selVal && i !== sel) cn.push("sdk-same");
      if (i === sel) cn.push("sdk-sel");

      let content: unknown = null;
      if (v !== 0) {
        content = h("span", { className: "sdk-val" }, String(v));
      } else if (p.notes[i] !== 0) {
        const notes: unknown[] = [];
        for (let dg = 1; dg <= 9; dg++) {
          notes.push(
            h(
              "span",
              { key: dg, className: p.notes[i] & (1 << (dg - 1)) ? "sdk-note" : "sdk-note sdk-note-off" },
              String(dg),
            ),
          );
        }
        content = h("div", { className: "sdk-notes" }, notes);
      }
      boardCells.push(h("div", { key: i, className: cn.join(" "), onClick: () => onCell(i) }, content));
    }

    /* v0.1.2：四侧数字键（C10）——每侧各 9 键，上下横排、左右竖排，四边不同色 */
    const digitPad = (): unknown[] => {
      const arr: unknown[] = [];
      for (let dg = 1; dg <= 9; dg++) {
        arr.push(
          h(
            "button",
            { key: dg, type: "button", className: "sdk-dbtn", onClick: () => onDigit(dg) },
            String(dg),
          ),
        );
      }
      return arr;
    };

    return h(
      "div",
      { className: "sdk-root" + (d.fullscreen ? " sdk-fs" : "") },
      /* 标题 */
      h(
        "div",
        { className: "sdk-title" },
        h("h1", null, "🧩 数独"),
        h("span", { className: "sdk-badge" }, "dsh-sudoku v0.1.3"),
        /* v0.1.2：全屏切换（C5） */
        h(
          "button",
          {
            type: "button",
            className: "sdk-fsbtn",
            onClick: () => {
              d.fullscreen = !d.fullscreen;
              re();
            },
          },
          d.fullscreen ? "✕ 退出全屏" : "⛶ 全屏",
        ),
      ),
      /* v0.1.1：玩法简介（可折叠，默认展开） */
      h(
        "div",
        { className: "sdk-help" + (d.helpOpen ? " sdk-help-open" : "") },
        h(
          "button",
          {
            type: "button",
            className: "sdk-help-head",
            "aria-expanded": d.helpOpen,
            onClick: () => {
              d.helpOpen = !d.helpOpen;
              re();
            },
          },
          "❓ 玩法简介",
          h("span", { className: "sdk-help-caret" }, d.helpOpen ? "收起 ▾" : "展开 ▸"),
        ),
        d.helpOpen
          ? h(
              "div",
              { className: "sdk-help-body" },
              h(
                "ul",
                { className: "sdk-help-list" },
                h("li", null, "目标：把空格填满 1–9，让每行、每列、每个 3×3 宫内数字 1–9 各出现一次。"),
                h("li", null, "加粗的格子是题目给的提示，不能改；其余格子由你来填。"),
                h("li", null, "先点「▶ 开始」再填格并计时；四边（上下左右）各有一组 1–9 数字键，点格子选中、再点数字填入。"),
                h("li", null, "选中格按行/列/宫三种淡色高亮；✏️ 铅笔模式可记候选小数字。"),
                h("li", null, "⬅️ 撤销 / 💡 提示 / 🎲 新一局（回到未开始状态）/ ⛶ 全屏。"),
              ),
            )
          : null,
      ),
      /* v0.1.1：难度改为下拉（随时可见当前档位），切换即新开局 */
      h(
        "div",
        { className: "sdk-diff" },
        h("span", { className: "sdk-diff-label" }, "难度"),
        h(
          "select",
          {
            className: "sdk-diff-select",
            value: d.diffId,
            "aria-label": "难度",
            onChange: (ev: { target: { value: string } }) => {
              const v = ev.target.value;
              if (v && v !== d.diffId) newGame(v);
            },
          },
          ...DIFFICULTIES.map((df) =>
            h("option", { key: df.id, value: df.id }, `${df.label} · ${df.clues} 提示`),
          ),
        ),
      ),
      /* 计量表 */
      h(
        "div",
        { className: "sdk-meters" },
        h(
          "div",
          { className: "sdk-meter" },
          h("span", { className: "sdk-meter-cap" }, "剩余"),
          h("span", { className: "sdk-meter-val" }, String(remaining(p))),
        ),
        h(
          "div",
          { className: "sdk-meter" },
          h("span", { className: "sdk-meter-cap" }, "⏱ 用时"),
          h("span", { className: "sdk-meter-val" }, fmtMs(elapsed)),
        ),
        h(
          "div",
          { className: "sdk-meter" },
          h("span", { className: "sdk-meter-cap" }, "💎 最佳"),
          h("span", { className: "sdk-meter-val" }, ss.bestMs !== null ? fmtMs(ss.bestMs) : "—"),
        ),
      ),
      /* 棋盘 + 四侧数字键（v0.1.2 C10）：grid 布局 上/左/棋盘/右/下 */
      h(
        "div",
        { className: "sdk-boardzone" },
        h("div", { className: "sdk-pad sdk-pad-top" }, digitPad()),
        h("div", { className: "sdk-pad sdk-pad-left" }, digitPad()),
        h(
          "div",
          { className: "sdk-board-wrap" },
          h("div", { className: "sdk-board" }, boardCells),
          d.wonMs !== null
            ? h(
                "div",
                { className: "sdk-winlayer" },
                h("h2", null, "🎉 完成！"),
                h("p", null, `用时 ${fmtMs(d.wonMs)}${d.newBest ? " · 新纪录！" : ""}（${DIFFICULTIES.find((x) => x.id === d.diffId)?.label ?? d.diffId}）`),
                h("button", { className: "sdk-btn sdk-btn-primary", type: "button", onClick: () => newGame() }, "再来一局"),
              )
            : null,
        ),
        h("div", { className: "sdk-pad sdk-pad-right" }, digitPad()),
        h("div", { className: "sdk-pad sdk-pad-bottom" }, digitPad()),
      ),
      /* 操作行（v0.1.2：首位为显式开始按钮，C8） */
      h(
        "div",
        { className: "sdk-acts" },
        d.startArmed
          ? h("span", { className: "sdk-ticking" }, d.wonMs !== null ? "🏆 已完成" : "⏱ 计时中")
          : h("button", { type: "button", className: "sdk-btn sdk-btn-start", onClick: onStart }, "▶ 开始"),
        h(
          "button",
          {
            type: "button",
            className: "sdk-btn" + (d.noteMode ? " sdk-on" : ""),
            onClick: () => {
              d.noteMode = !d.noteMode;
              toast(d.noteMode ? "铅笔模式：点数字记候选笔记" : "铅笔模式已关：点数字填格");
              re();
            },
          },
          "✏️ 铅笔笔记",
        ),
        h("button", { type: "button", className: "sdk-btn", onClick: onUndo }, "⬅️ 撤销"),
        h("button", { type: "button", className: "sdk-btn", onClick: onHint }, "💡 提示"),
        h("button", { type: "button", className: "sdk-btn sdk-btn-primary", onClick: () => newGame() }, "🎲 新一局"),
      ),
      /* 成绩行（v0.1.2 C9：真实 <b> 元素，修复字面量尖括号乱码） */
      h(
        "div",
        { className: "sdk-stats" },
        h(
          "span",
          null,
          "最佳 ",
          h("b", null, ss.bestMs !== null ? fmtMs(ss.bestMs) : "—"),
          " · 🏆 ",
          h("b", null, String(ss.wins)),
          " 胜 · 共 ",
          h("b", null, String(ss.plays)),
          " 局",
        ),
        h("button", { className: "sdk-link-btn", type: "button", onClick: onClearStats }, d.armedClear ? "确认清空？" : "清空记录"),
      ),
      /* toast */
      h("div", { className: "sdk-toast" }, toastText),
    );
  };

  return { App };
}