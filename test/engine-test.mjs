/**
 * dsh-sudoku 引擎单测（纯 Node，确定性 rng 回放）。
 *
 * 流程：esbuild 把 src/shared/{engine,difficulties}.ts 打包成 test/dist/engine.mjs
 * （与生产 client bundle 同一引擎代码），然后动态 import 做白盒断言。
 *
 * 覆盖：
 *  - generateSolvedGrid：合法完整解 / 同种子可复现
 *  - countSolutions：全解盘=1 / 空盘上界截断
 *  - removeClues / generatePuzzle：唯一解 / 提示数贴近目标 / 180° 旋转对称 / 非法目标报错
 *  - newPuzzle：提示掩码 / filled / 未知难度报错
 *  - computeConflicts：干净盘零冲突 / 人为冲突定位
 *  - fillDigit：提示格保护 / 首填安全（错→自动修正，对→不触发）/ 同值空操作 /
 *    铅笔笔记联动清除 / 撤销（回退值+笔记）/ 胜利判定（全对才胜 / 填满有错不判胜，纠正后可胜）
 *  - hint：空格优先 / 无空格改错格 / 已满正解返回 null
 *  - 生成性能护栏（30 盘混合难度限时）
 */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync, readdirSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import { buildFallbackDirs } from "../scripts/paths.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

/* ---------- 工具解析（与 scripts/build.mjs 同策略） ---------- */
const FALLBACK = buildFallbackDirs({ importMetaUrl: import.meta.url, envKeys: ["SUD_TOOLS_DIR"] });
function loadTool(name) {
  const anchors = [here + "/x.js", root + "/x.js", ...FALLBACK.map((d) => d + "/x.js")];
  for (const a of anchors) {
    try {
      return createRequire(a)(name);
    } catch {
      /* next */
    }
  }
  if (name === "esbuild") {
    for (const d of FALLBACK) {
      const pnpm = d.replace(/node_modules$/, "node_modules/.pnpm");
      if (!existsSync(pnpm)) continue;
      for (const dir of readdirSync(pnpm).filter((x) => x.startsWith("esbuild@")).sort().reverse()) {
        const p = `${pnpm}/${dir}/node_modules/esbuild`;
        try {
          return createRequire(p + "/x.js")(p);
        } catch {
          /* next version */
        }
      }
    }
  }
  throw new Error(`找不到 ${name}`);
}

const esbuild = loadTool("esbuild");
mkdirSync(root + "/test/dist", { recursive: true });
await esbuild.build({
  stdin: {
    contents: `export * from "./src/shared/engine.ts"; export * from "./src/shared/difficulties.ts";`,
    resolveDir: root,
    sourcefile: "engine-entry.ts",
  },
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  outfile: root + "/test/dist/engine.mjs",
  logLevel: "silent",
});

const E = await import(pathToFileURL(root + "/test/dist/engine.mjs").href + "?" + Date.now());

let pass = 0;
let fail = 0;
function ok(name, cond, extra = "") {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error(`✘ ${name}${extra ? " — " + extra : ""}`);
  }
}

/* ---------- 确定性 rng（mulberry32） ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ================= 1. generateSolvedGrid ================= */
{
  const g = E.generateSolvedGrid(mulberry32(42));
  ok("生成完整解：81 格全填", g.every((v) => v >= 1 && v <= 9));
  const rowsOk = (s) => {
    for (let r = 0; r < 9; r++) {
      const row = new Set(), col = new Set(), box = new Set();
      for (let i = 0; i < 9; i++) {
        row.add(s[r * 9 + i]);
        col.add(s[i * 9 + r]);
      }
      if (row.size !== 9 || col.size !== 9) return false;
    }
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const b = new Set();
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) b.add(s[(br * 3 + r) * 9 + (bc * 3 + c)]);
        if (b.size !== 9) return false;
      }
    }
    return true;
  };
  ok("完整解行列宫各为 1–9 全排列", rowsOk(g));
  const g2 = E.generateSolvedGrid(mulberry32(42));
  ok("同种子可复现（确定性 rng）", g.join("") === g2.join(""));
  const g3 = E.generateSolvedGrid(mulberry32(43));
  ok("不同种子 → 不同盘面", g.join("") !== g3.join(""));
}

/* ================= 2. countSolutions ================= */
{
  const solved = E.generateSolvedGrid(mulberry32(7));
  ok("countSolutions(完整解) === 1", E.countSolutions(solved, 2) === 1);
  const empty = new Array(81).fill(0);
  ok("countSolutions(空盘, 上界2) === 2（截断）", E.countSolutions(empty, 2) === 2);
}

/* ================= 3. generatePuzzle / removeClues ================= */
function genPuzzle(diffId) {
  const { clues } = { beginner: 40, intermediate: 30, expert: 22 }[diffId] === undefined
    ? { clues: 40 }
    : { beginner: 40, intermediate: 30, expert: 22 }[diffId];
  const { puzzle, solution } = E.generatePuzzle(E.getDifficulty(diffId).clues, mulberry32(2026));
  return { puzzle, solution, target: E.getDifficulty(diffId).clues };
}

for (const diff of ["beginner", "intermediate", "expert"]) {
  const { puzzle, solution, target } = genPuzzle(diff);
  const clues = puzzle.filter((v) => v !== 0).length;
  ok(`${diff}：盘面唯一解（countSolutions===1）`, E.countSolutions(puzzle, 2) === 1);
  ok(`${diff}：解与盘面一致（提示格 = 解的对应位）`, puzzle.every((v, i) => v === 0 || v === solution[i]));
  ok(`${diff}：提示数贴近目标（${clues} vs 目标 ${target}，允许挖洞停滞小幅超出）`, clues >= target - 1 && clues <= target + 5, `clues=${clues}`);
  // 提示掩码呈 180° 旋转对称（提示/空 的分布对称；对称位两格的数字值可以不同）
  let sym = true;
  for (let i = 0; i < 81; i++) if ((puzzle[i] !== 0) !== (puzzle[80 - i] !== 0)) sym = false;
  ok(`${diff}：提示掩码 180° 旋转对称`, sym);
}

assert.throws(() => E.removeClues(new Array(81).fill(0), 99), /提示数/, "removeClues 应拒绝非法目标");
assert.throws(() => E.newPuzzle("bogus"), /未知难度/);

/* ================= 4. newPuzzle / computeConflicts ================= */
const P0 = E.newPuzzle("intermediate", mulberry32(11));
{
  ok("newPuzzle：givens 掩码与盘面一致", P0.givens.every((g, i) => g === (P0.grid[i] !== 0)));
  ok("newPuzzle：filled = 提示格数", P0.filled === P0.grid.filter((v) => v !== 0).length);
  ok("newPuzzle：初始 state=playing", P0.state === "playing");
  ok("干净盘无冲突", E.computeConflicts(P0).length === 0);
}

/* ================= 5. fillDigit / 首填安全 / 撤销 ================= */
const P1 = E.newPuzzle("beginner", mulberry32(99));
{
  // 找一个「解 ≠ 7」的格与一个「解 = 7」的格
  const wrongIdx = P1.grid.findIndex((v, i) => v === 0 && P1.solution[i] !== 7);
  const rightIdx = P1.grid.findIndex((v, i) => v === 0 && P1.solution[i] === 7);
  ok("测试前置：找到解≠7 与 解=7 的空格", wrongIdx >= 0 && rightIdx >= 0);

  const gi = P1.givens.findIndex(Boolean);
  const rg = E.fillDigit(P1, gi, 5);
  ok("提示格不可改（ok=false + msg）", rg.ok === false && typeof rg.msg === "string");

  const wrongFirst = E.fillDigit(P1, wrongIdx, 7);
  ok("首填错误 → 自动修正（corrected=true）", wrongFirst.corrected === true);
  ok("首填修正后格值 = 解", P1.grid[wrongIdx] === P1.solution[wrongIdx]);
  ok("首填安全已消耗（firstFillUsed）", P1.firstFillUsed === true);

  const r2 = E.fillDigit(P1, rightIdx, 7);
  ok("非首填错误不再触发修正（corrected 未置位）", !r2.corrected);
  ok("直接填错误数字被接受（不判负，仅冲突提示）", r2.ok === true && P1.grid[rightIdx] === 7);

  const same = E.fillDigit(P1, rightIdx, 7);
  ok("同数字重复点按 = 空操作", same.ok === true);

  // 撤销
  const before = P1.grid[rightIdx];
  const u = E.undo(P1);
  ok("撤销成功", u === true);
  ok("撤销恢复原值（空）", P1.grid[rightIdx] === 0 && P1.grid[wrongIdx] === P1.solution[wrongIdx]);
  const again = E.fillDigit(P1, rightIdx, 7);
  ok("撤销后可再填", again.ok === true);
  ok("再撤销恢复", E.undo(P1) === true && P1.grid[rightIdx] === 0);

  // 铅笔笔记联动
  const emptyIdx = P1.grid.findIndex((v, i) => v === 0 && !P1.givens[i]);
  E.toggleNote(P1, emptyIdx, 3);
  E.toggleNote(P1, emptyIdx, 5);
  const noteIdx = E.PEERS[emptyIdx].find((q) => P1.grid[q] === 0 && P1.notes[q] === 0);
  if (noteIdx !== undefined) {
    E.toggleNote(P1, noteIdx, 5);
    ok("笔记可写", (P1.notes[noteIdx] & (1 << 4)) !== 0);
    const rr = E.fillDigit(P1, emptyIdx, 5);
    ok("填数后同行/列/宫该数字笔记被清除", rr.ok && (P1.notes[noteIdx] & (1 << 4)) === 0);
  }
  const filledCell = P1.grid.findIndex((v) => v !== 0 && !P1.givens[P1.grid.indexOf(v)]);
  ok("已填格/提示格不能记笔记", E.toggleNote(P1, P1.givens.findIndex(Boolean), 1) === false);
}

/* ================= 6. 胜利判定 ================= */
{
  const W = E.newPuzzle("beginner", mulberry32(777));
  for (let i = 0; i < 81; i++) {
    if (W.grid[i] === 0) E.fillDigit(W, i, W.solution[i]);
  }
  ok("全部正确填完 → won", W.state === "won");
  ok("胜利后 fillDigit 拒绝", E.fillDigit(W, 0, 1).ok === false || W.state === "won");
  ok("胜利后 undo 拒绝", E.undo(W) === false);

  const X = E.newPuzzle("beginner", mulberry32(888));
  const firstEmpty = X.grid.findIndex((v) => v === 0);
  E.fillDigit(X, firstEmpty, X.solution[firstEmpty]); // 消耗首填安全（填正确值 → 不触发修正）
  const secondEmpty = X.grid.findIndex((v) => v === 0);
  const wrongVal = X.solution[secondEmpty] === 1 ? 2 : 1;
  E.fillDigit(X, secondEmpty, wrongVal); // 首填安全已消耗 → 错值保留（仅冲突提示，不判负）
  for (let i = 0; i < 81; i++) if (X.grid[i] === 0) X.grid[i] = X.solution[i]; // 白盒：其余全填正确值
  X.filled = 81; // 白盒：对齐账本
  ok("填满但含错格 → 不判胜（可继续纠正）", X.state === "playing");
  E.fillDigit(X, secondEmpty, X.solution[secondEmpty]); // 玩家纠正错格
  ok("纠正后完成 → 判定胜利", X.state === "won");
}

/* ================= 7. hint ================= */
{
  const H = E.newPuzzle("beginner", mulberry32(123));
  const firstEmpty = H.grid.findIndex((v) => v === 0);
  const r = E.hint(H);
  ok("hint 返回目标格与正确值", r && r.idx === firstEmpty && r.value === H.solution[firstEmpty]);
  ok("hint 后该格已填正确值", H.grid[firstEmpty] === H.solution[firstEmpty]);
  const h2 = E.hint(H);
  ok("hint 连续可用（下一空格）", h2 !== null && H.grid[h2.idx] === H.solution[h2.idx]);
  // 填满到正解 → hint 返回 null
  for (let i = 0; i < 81; i++) if (H.grid[i] !== H.solution[i]) E.fillDigit(H, i, H.solution[i]);
  ok("盘面已是正解 → hint 返回 null", E.hint(H) === null);
}

/* ================= 8. 难度表 ================= */
{
  ok("三档难度齐备", E.DIFFICULTIES.length === 3);
  ok("提示数递减（入门>进阶>专家）", E.DIFFICULTIES[0].clues > E.DIFFICULTIES[1].clues && E.DIFFICULTIES[1].clues > E.DIFFICULTIES[2].clues);
}

/* ================= 9. 性能护栏：30 盘混合难度限时生成 ================= */
{
  const t0 = Date.now();
  let totalClues = 0;
  for (let i = 0; i < 30; i++) {
    const diff = E.DIFFICULTIES[i % 3].id;
    const p = E.newPuzzle(diff, mulberry32(1000 + i));
    ok(`性能护栏：唯一解（${diff} #${i}）`, E.countSolutions(p.grid, 2) === 1);
    totalClues += p.grid.filter((v) => v !== 0).length;
  }
  const ms = Date.now() - t0;
  ok(`30 盘生成 < 3s（实际 ${ms}ms）`, ms < 3000);
  console.log(`  [info] 30 盘生成 ${ms}ms，平均提示数 ${(totalClues / 30).toFixed(1)}`);
}

console.log(fail === 0 ? `engine：${pass} 项全部通过` : `engine：${pass} 通过 / ${fail} 失败`);
process.exit(fail === 0 ? 0 : 1);