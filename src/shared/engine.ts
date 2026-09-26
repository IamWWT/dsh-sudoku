/**
 * dsh-sudoku 游戏引擎（纯函数，零依赖，零 DOM）。
 *
 * 约定：
 *  - 9×9 棋盘行优先展开为 81 格，idx = row * 9 + col；
 *  - grid: number[81]，0 = 空，1–9 = 数字（提示格与玩家填数混排）；
 *  - givens: boolean[81] 提示格掩码（不可修改）；
 *  - notes: number[81] 位掩码，bit (d-1) = 1 表示该格记有候选 d（铅笔笔记）；
 *  - 所有变更函数原地修改 Puzzle 并返回结构化结果；UI 层以 tick 计数触发重渲染；
 *  - 随机源可注入（Puzzle.rng / 各生成函数 rng 参数），缺省 Math.random，
 *    引擎内部禁止直调 Math.random（确定性回放依赖此约定）；
 *  - 「首填安全」：玩家首次填数若与解不符，引擎自动修正为正确值并回报
 *    corrected=true（对应扫雷「首点安全」的数独语义：首个填入的数字保证正确）。
 */

import { getDifficulty } from "./difficulties.ts";

export type Rng = () => number;

export class EngineError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "EngineError";
  }
}

export type PuzzleState = "playing" | "won";

export interface Puzzle {
  difficultyId: string;
  /** 当前盘面（提示 + 玩家数字，0 = 空）。 */
  grid: number[];
  /** 提示格掩码（不可改）。 */
  givens: boolean[];
  /** 铅笔笔记位掩码。 */
  notes: number[];
  /** 完整解。 */
  solution: number[];
  state: PuzzleState;
  /** 已填数字格数（含错误填写）。 */
  filled: number;
  /** 首填安全是否已消耗。 */
  firstFillUsed: boolean;
  /** 首填安全是否实际触发过修正。 */
  firstFillCorrected: boolean;
  undoStack: UndoEntry[];
  /** 随机源（生成用；玩法期不再随机）。 */
  rng: Rng;
}

interface UndoEntry {
  kind: "fill";
  idx: number;
  prevValue: number;
  prevNotes: number;
}

/** 每格的 20 个同行/列/宫邻居（模块加载时预计算）。 */
export const PEERS: number[][] = (() => {
  const peers: number[][] = [];
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9);
    const c = i % 9;
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    const s = new Set<number>();
    for (let x = 0; x < 9; x++) {
      if (x !== c) s.add(r * 9 + x);
      if (x !== r) s.add(x * 9 + c);
    }
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
          const j = (br + dr) * 9 + (bc + dc);
          if (j !== i) s.add(j);
        }
    }
    peers.push([...s]);
  }
  return peers;
})();

export function shuffleRng<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 格 d 在 grid 中是否与 idx 的某邻居冲突。 */
function conflictsAt(grid: number[], idx: number, d: number): boolean {
  for (const q of PEERS[idx]) if (grid[q] === d) return true;
  return false;
}

function candidatesAt(grid: number[], idx: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) {
    if (grid[idx] === d) continue;
    let ok = true;
    for (const q of PEERS[idx]) {
      if (grid[q] === d) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(d);
  }
  return out;
}

/** 数解个数（上界 limit，找到 limit 个即停；入参 grid 不被修改）。 */
export function countSolutions(gridIn: number[], limit = 2): number {
  const grid = gridIn.slice();
  return countUpTo(grid, limit);
}

/** 就地版：回溯过程中保证退出时 grid 复原（供挖洞唯一解校验高频调用）。 */
function countUpTo(grid: number[], limit: number): number {
  if (limit <= 0) return 0;
  let best = -1;
  let bestLen = 10;
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    const len = candidatesAt(grid, i).length;
    if (len < bestLen) {
      bestLen = len;
      best = i;
      if (len <= 1) break;
    }
  }
  if (best === -1) return 1;
  if (bestLen === 0) return 0;
  let count = 0;
  for (const d of candidatesAt(grid, best)) {
    grid[best] = d;
    count += countUpTo(grid, limit - count);
    grid[best] = 0;
    if (count >= limit) break;
  }
  return count;
}

/** 随机填一个合法完整解（候选序由 rng 决定 → 确定性可回放）。 */
export function generateSolvedGrid(rng: Rng = Math.random): number[] {
  const grid = new Array<number>(81).fill(0);
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const fill = (pos: number): boolean => {
    if (pos === 81) return true;
    const order = shuffleRng(digits.slice(), rng);
    for (const d of order) {
      if (conflictsAt(grid, pos, d)) continue;
      grid[pos] = d;
      if (fill(pos + 1)) return true;
      grid[pos] = 0;
    }
    return false;
  };
  if (!fill(0)) throw new EngineError("生成完整解失败（不应发生：9×9 恒有解）");
  return grid;
}

function countClues(grid: number[]): number {
  let n = 0;
  for (let i = 0; i < 81; i++) if (grid[i] !== 0) n++;
  return n;
}

/**
 * 挖洞：从完整解出发，按 rng 序成对（i 与其 180° 旋转对称格 80-i）移除，
 * 每次移除后校验唯一解，破坏唯一性则回退。达到目标提示数即停；
 * 单轮扫完仍未达标则换随机序多轮再挖（最多 4 轮），
 * 仍达不到（极少数高难盘面搜索空间耗尽）→ 提前停，实际提示数 ≥ 目标（只多不少）。
 * 返回的盘面**保证唯一解**（构造性质）且提示掩码呈 180° 旋转对称。
 */
export function removeClues(solution: number[], targetClues: number, rng: Rng = Math.random): number[] {
  if (!Number.isInteger(targetClues) || targetClues < 17 || targetClues > 81) {
    throw new EngineError(`目标提示数必须在 17–81（实际 ${targetClues}）`);
  }
  const puzzle = solution.slice();
  for (let pass = 0; pass < 4; pass++) {
    const order: number[] = [];
    for (let i = 0; i < 81; i++) order.push(i);
    shuffleRng(order, rng);
    for (const i of order) {
      if (countClues(puzzle) <= targetClues) break;
      if (puzzle[i] === 0) continue;
      const j = 80 - i;
      if (j !== i && puzzle[j] !== 0) {
        puzzle[i] = 0;
        puzzle[j] = 0;
        if (countUpTo(puzzle, 2) !== 1) {
          puzzle[i] = solution[i];
          puzzle[j] = solution[j];
        }
      } else {
        puzzle[i] = 0;
        if (countUpTo(puzzle, 2) !== 1) puzzle[i] = solution[i];
      }
    }
    if (countClues(puzzle) <= targetClues) break;
  }
  return puzzle;
}

/** 生成一盘数独（盘面 + 解），唯一解保证。 */
export function generatePuzzle(
  targetClues: number,
  rng: Rng = Math.random,
): { puzzle: number[]; solution: number[] } {
  const solution = generateSolvedGrid(rng);
  const puzzle = removeClues(solution, targetClues, rng);
  return { puzzle, solution };
}

export function newPuzzle(difficultyId: string, rng: Rng = Math.random): Puzzle {
  const d = getDifficulty(difficultyId);
  const { puzzle, solution } = generatePuzzle(d.clues, rng);
  return {
    difficultyId,
    grid: puzzle,
    givens: puzzle.map((v) => v !== 0),
    notes: new Array(81).fill(0),
    solution,
    state: "playing",
    filled: countClues(puzzle),
    firstFillUsed: false,
    firstFillCorrected: false,
    undoStack: [],
    rng,
  };
}

export function remaining(p: Puzzle): number {
  return 81 - p.filled;
}

export function isComplete(p: Puzzle): boolean {
  return p.filled === 81;
}

/** 冲突格集合：与任何同行/列/宫数字重复的格（含提示格之间互相冲突——正常盘面不会出现）。 */
export function computeConflicts(p: Puzzle): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  const mark = (i: number): void => {
    if (!seen.has(i)) {
      seen.add(i);
      out.push(i);
    }
  };
  for (let i = 0; i < 81; i++) {
    const v = p.grid[i];
    if (!v) continue;
    for (const q of PEERS[i]) {
      if (q < i && p.grid[q] === v) {
        mark(i);
        mark(q);
      }
    }
  }
  return out;
}

function checkWin(p: Puzzle): boolean {
  if (p.filled !== 81) return false;
  for (let i = 0; i < 81; i++) {
    if (p.grid[i] !== p.solution[i]) return false;
  }
  p.state = "won";
  return true;
}

/**
 * 填数（或替换已有数字 / 清空：digit=0）。
 *  - 提示格不可改（返回 ok=false + msg）；
 *  - 首填安全：首次填数若错误 → 自动修正为正确值（corrected=true）；
 *  - 同数字重复点按 = 空操作（不压撤销栈）；
 *  - 填入后自动清理同行/列/宫的该数字铅笔笔记。
 */
export function fillDigit(p: Puzzle, idx: number, digit: number): { ok: boolean; corrected?: boolean; won?: boolean; msg?: string } {
  if (p.state === "won") return { ok: false, msg: "已获胜：点「新一局」继续" };
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) return { ok: false, msg: "数字须为 0–9" };
  if (idx < 0 || idx > 80) return { ok: false, msg: "格子越界" };
  if (p.givens[idx]) return { ok: false, msg: "提示格不可修改" };
  if (p.grid[idx] === digit) return { ok: true };

  p.undoStack.push({ kind: "fill", idx, prevValue: p.grid[idx], prevNotes: p.notes[idx] });
  if (p.undoStack.length > 500) p.undoStack.shift();

  let value = digit;
  let corrected = false;
  if (digit !== 0 && !p.firstFillUsed) {
    p.firstFillUsed = true;
    if (digit !== p.solution[idx]) {
      value = p.solution[idx];
      corrected = true;
      p.firstFillCorrected = true;
    }
  }

  const keepBit = value !== 0 ? 1 << (value - 1) : 0;
  p.notes[idx] &= ~keepBit;
  if (value !== 0) {
    for (const q of PEERS[idx]) {
      if (p.grid[q] === 0 && (p.notes[q] & (1 << (value - 1)))) {
        p.notes[q] &= ~(1 << (value - 1));
      }
    }
  }

  const wasEmpty = p.grid[idx] === 0;
  p.grid[idx] = value;
  if (wasEmpty && value !== 0) p.filled++;
  else if (!wasEmpty && value === 0) p.filled = 81 - countClues(p.grid);

  let won = false;
  if (value !== 0) won = checkWin(p);
  return { ok: true, corrected, won };
}

/** 铅笔笔记：空格的候选切换（非空/提示格不生效）。 */
export function toggleNote(p: Puzzle, idx: number, digit: number): boolean {
  if (p.state === "won") return false;
  if (!Number.isInteger(digit) || digit < 1 || digit > 9) return false;
  if (p.grid[idx] !== 0 || p.givens[idx]) return false;
  const bit = 1 << (digit - 1);
  p.notes[idx] ^= bit;
  return true;
}

export function clearNotes(p: Puzzle, idx: number): void {
  if (p.notes[idx] !== 0) p.notes[idx] = 0;
}

/** 撤销一步（提示格填充 / 笔记切换均不可单独撤销——统一走填数栈；笔记随填数条目恢复）。 */
export function undo(p: Puzzle): boolean {
  if (p.state === "won") return false;
  const e = p.undoStack.pop();
  if (!e) return false;
  const cur = p.grid[e.idx];
  p.grid[e.idx] = e.prevValue;
  p.notes[e.idx] = e.prevNotes;
  if (e.prevValue === 0 && cur !== 0) p.filled--;
  else if (e.prevValue !== 0 && cur === 0) p.filled++;
  return true;
}

/** 提示：优先补第一个空格，其次改第一个错格；顺带清理该格笔记。 */
export function hint(p: Puzzle): { idx: number; value: number } | null {
  if (p.state === "won") return null;
  let target = -1;
  for (let i = 0; i < 81; i++) {
    if (p.grid[i] === 0) {
      target = i;
      break;
    }
  }
  if (target === -1) {
    for (let i = 0; i < 81; i++) {
      if (!p.givens[i] && p.grid[i] !== p.solution[i]) {
        target = i;
        break;
      }
    }
  }
  if (target === -1) return null;
  const value = p.solution[target];
  p.undoStack.push({ kind: "fill", idx: target, prevValue: p.grid[target], prevNotes: p.notes[target] });
  if (p.undoStack.length > 500) p.undoStack.shift();
  if (p.grid[target] === 0) p.filled++;
  p.grid[target] = value;
  p.notes[target] &= ~(1 << (value - 1));
  for (const q of PEERS[target]) {
    if (p.grid[q] === 0) p.notes[q] &= ~(1 << (value - 1));
  }
  checkWin(p);
  return { idx: target, value };
}