// dsh-sudoku UI 验证（headless playwright）
// 用法: node test/ui-verify.mjs [端口=3084] [token] [截图目录]
// 依赖: deepseek-harness/node_modules 的 playwright-core + 本机 chromium（chromium-1223）
// 流程: 打开 DSH(3084) → 过 onboarding → 选工作区 → 发消息进会话视图
//       → 展开右侧栏 → 点「数独」入口 → 验证 .sdk-root 渲染
//       → v0.1.2 交互: 默认折叠简介 / 四侧数字键 / 显式开始 / 全屏 / 方向高亮
//       → 笔记 / 撤销 / 提示 / 新一局 / 切难度 → 截图存档 + console 错误
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// --- 跨平台路径解析（codemod 注入；不含机器专属绝对路径）---
import { buildFallbackDirs } from "../scripts/paths.mjs";
import { existsSync as __existsSync } from "node:fs";
const __TOOL_DIRS = buildFallbackDirs({ importMetaUrl: import.meta.url, envKeys: ["SUD_TOOLS_DIR"] });
const TOOL_ANCHOR = (__TOOL_DIRS[0] || ".") + "/x.js";
function resolveHarness() {
  for (const d of __TOOL_DIRS) {
    const h = d.replace(/[\\/]node_modules$/, "");
    if (__existsSync(h + "/vendor/schemastery")) return h;
  }
  return __TOOL_DIRS[0] || ".";
}


const require = createRequire(TOOL_ANCHOR);
const { chromium } = require("playwright-core");

const PORT = process.argv[2] || "3084";
const TOKEN = process.argv[3] || "";
const OUT =
  process.argv[4] ||
  process.env.SUD_SHOT_DIR ||
  // 相对插件根解析（跨平台，不写死机器路径）
  join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "screenshots");
mkdirSync(OUT, { recursive: true });
// 浏览器可执行文件：仅在显式设置 SUD_CHROME 时使用，否则交给 Playwright 自动探测
const EXE = process.env.SUD_CHROME || "";

const errors = [];
const http404 = [];
let page;
try {
  const browser = await chromium.launch({
    // 仅在显式设置 SUD_CHROME 时指定；否则交给 Playwright 自动探测
    ...(EXE ? { executablePath: EXE } : {}),
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  page = await browser.newPage({ viewport: { width: 1800, height: 950 } });
  page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`.slice(0, 200)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 200));
  });
  page.on("response", (r) => {
    if (r.status() >= 400) http404.push(`${r.status()} ${r.url().slice(0, 120)}`);
  });
  const shot = (name) => page.screenshot({ path: `${OUT}/${name}` });

  const t0 = Date.now();
  await page.goto(
    TOKEN ? `http://127.0.0.1:${PORT}/?token=${TOKEN}` : `http://127.0.0.1:${PORT}/`,
    { waitUntil: "load", timeout: 30000 }
  );
  await page.waitForTimeout(2500);
  console.log(`page load ${Date.now() - t0}ms`);
  await shot("01-loaded.png");

  // 1) onboarding 快进
  for (let r = 0; r < 6; r++) {
    const c = await page.evaluate(() => {
      for (const el of document.querySelectorAll("button,[role=button]")) {
        if (el.offsetParent === null) continue;
        const t = (el.textContent || "").trim();
        if (["继续", "稍后配置", "保存并继续"].includes(t) && !el.disabled) {
          el.click();
          return t;
        }
      }
      return null;
    });
    if (!c) break;
    console.log(`onboard[r${r}] 点击「${c}」`);
    await page.waitForTimeout(600);
  }

  // 2) 选工作区（chip 占位态时点开菜单选 dsh-sudoku）
  await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll("button,[role=button]")).find(
      (b) => (b.getAttribute("aria-label") || "").includes("选择工作区")
    );
    if (c) c.click();
  });
  await page.waitForTimeout(700);
  const wsPicked = await page.evaluate(() => {
    const it = Array.from(document.querySelectorAll("button,div,li,[role=menuitem],[role=option]")).find(
      (b) => (b.textContent || "").trim() === "dsh-sudoku"
    );
    if (it) { it.click(); return true; }
    return false;
  });
  console.log("工作区选择:", wsPicked ? "dsh-sudoku" : "(已是选中态或不可用)");
  await page.waitForTimeout(800);

  // 3) 发消息进会话视图（无 API key 时模型调用失败无妨，会话/右侧栏照常存在）
  const ce = await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll('[contenteditable="true"]')).find((e) => e.offsetParent !== null);
    if (!c) return false;
    c.focus();
    return true;
  });
  if (ce) {
    await page.keyboard.type("ok（ui-verify 探针消息，请忽略）", { delay: 8 });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("button,[role=button]")).find(
        (x) => (x.getAttribute("aria-label") || "") === "发送消息" && !x.disabled
      );
      if (b) b.click();
    });
    console.log("已发送探针消息（创建会话）");
  } else {
    console.log("WARN: 未找到 composer");
  }
  await page.waitForTimeout(5000);
  await shot("02-session.png");

  // 4) 展开右侧栏
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll("button,[role=button]")).find(
      (x) => (x.getAttribute("aria-label") || "") === "打开右侧边栏" && x.offsetParent !== null
    );
    if (b) b.click();
  });
  await page.waitForTimeout(1200);

  // 5) 点「数独」入口（右侧栏指南条目）
  const clickedSudoku = await page.evaluate(() => {
    const pick = (e) => /数独/.test(e.textContent || "") && e.offsetParent !== null;
    const b =
      Array.from(document.querySelectorAll("button,[role=button]")).find((e) => pick(e) && !/经典 9×9/.test(e.textContent || "")) ||
      Array.from(document.querySelectorAll("button,[role=button]")).find((e) => pick(e));
    if (!b) return false;
    b.click();
    return true;
  });
  await page.waitForTimeout(1000);
  console.log("数独入口点击:", clickedSudoku);
  await shot("03-tab-open.png");

  const sdkRoot = await page.locator(".sdk-root").count();
  if (sdkRoot === 0) {
    console.log("RESULT: FAIL - 无 .sdk-root（插件面板未渲染）");
    const body = await page.evaluate(() => document.body.innerText.slice(0, 400));
    console.log("body:", body.replace(/\n/g, " | "));
    process.exitCode = 1;
  } else {
    console.log(".sdk-root 渲染 OK");
  }

  const styleOk = await page.evaluate(() => !!document.getElementById("sdk-style"));
  console.log("style#sdk-style 注入:", styleOk);

  const cells = page.locator(".sdk-cell");
  const n = await cells.count();
  console.log("board cells:", n);
  if (n !== 81) console.log("WARN: 期望 81 格");
  await shot("04-board.png");

  // v0.1.2: 玩法简介默认折叠（C4），点击展开再折叠
  const helpCount = await page.locator(".sdk-help").count();
  const helpOpen0 = await page.locator(".sdk-help-body").count();
  console.log("玩法简介 .sdk-help:", helpCount, "初始折叠:", helpOpen0 === 0, helpOpen0 === 0 ? "✓（C4）" : "（WARN: 应默认折叠）");
  await shot("04b-help-collapsed.png");
  if (helpCount) {
    const head = page.locator(".sdk-help-head").first();
    await head.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(250);
    const opened = (await page.locator(".sdk-help-body").count()) > 0;
    await head.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(250);
    const closed = (await page.locator(".sdk-help-body").count()) === 0;
    console.log("玩法简介 展开→", opened, "折叠→", closed);
    await shot("04b2-help-open.png");
  }

  // v0.1.2: 四侧数字键（C10）——上下左右各 9 键
  const padCounts = {};
  for (const side of ["top", "left", "right", "bottom"]) {
    padCounts[side] = await page.locator(`.sdk-pad-${side} .sdk-dbtn`).count();
  }
  console.log("四侧数字键键数:", JSON.stringify(padCounts), Object.values(padCounts).every((c) => c === 9) ? "（各 9 ✓ C10）" : "（WARN: 应各 9）");

  // v0.1.2: 方向差异化高亮（点中心格后应命中 行/列/宫 三类）
  await page.locator(".sdk-cell").nth(40).click({ force: true }).catch(() => {});
  await page.waitForTimeout(300);
  const hl = await page.evaluate(() => ({
    r: document.querySelectorAll(".sdk-hl-r").length,
    c: document.querySelectorAll(".sdk-hl-c").length,
    b: document.querySelectorAll(".sdk-hl-b").length,
  }));
  console.log("方向高亮类计数:", JSON.stringify(hl));
  await shot("04d-directions.png");

  // v0.1.2: 显式开始（C8）——开始前填数应被锁（toast 提示、盘面不变、计时不走）
  const boardFp = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll(".sdk-cell .sdk-val"))
        .map((e) => e.textContent)
        .join(",")
    );
  // 挑一个「非提示且当前为空」的格子做填数探针，避免点到提示格导致填数被正确拒绝
  const emptyIdx = await page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll(".sdk-cell"));
    const i = cells.findIndex(
      (c) => !c.classList.contains("sdk-given") && !c.querySelector(".sdk-val")
    );
    return i;
  });
  console.log("填数探针格(首个空格):", emptyIdx);
  const padBtn = (side, digit) =>
    page.locator(`.sdk-pad-${side} .sdk-dbtn`, { hasText: new RegExp(`^${digit}$`) }).first();
  if (emptyIdx >= 0) await page.locator(".sdk-cell").nth(emptyIdx).click({ force: true }).catch(() => {});
  await page.waitForTimeout(250);
  const preFp = await boardFp();
  if (await padBtn("top", "5").count()) {
    await padBtn("top", "5").click({ timeout: 2000 }).catch(() => {});
  }
  await page.waitForTimeout(350);
  const preFp2 = await boardFp();
  console.log("开始前填数锁定:", preFp === preFp2 ? "OK（未填数，C8 ✓）" : "WARN: 开始前就填上了");
  await shot("05a-prestart-locked.png");
  const startBtn = page.getByRole("button", { name: /开始/ }).first();
  if (await startBtn.count()) {
    await startBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(400);
    const ticking = await page.locator(".sdk-ticking").count();
    console.log("点击「▶ 开始」后计时态:", ticking > 0 ? "⏱ 计时中 ✓（C8）" : "WARN: 未见计时中");
  } else {
    console.log("WARN: 未找到「▶ 开始」按钮");
  }
  await shot("05b-started.png");

  // v0.1.2: 四侧数字键填数（C10）——上侧键填 5（仍用空格探针）
  if (emptyIdx >= 0) {
    await page.locator(".sdk-cell").nth(emptyIdx).click({ force: true }).catch(() => {});
    await page.waitForTimeout(250);
  }
  if (await padBtn("top", "5").count()) {
    await padBtn("top", "5").click({ timeout: 2000 }).catch(() => {});
  }
  await page.waitForTimeout(400);
  const postFp = await boardFp();
  console.log("开始后填数生效:", preFp !== postFp ? "OK（格值已写入）" : "WARN: 盘面未变化");
  await shot("05c-filled.png");

  // v0.1.2: 全屏切换（C5）——且棋盘应放大占屏（二轮反馈：视野占满）
  const fsBtn = page.locator(".sdk-fsbtn").first();
  if (await fsBtn.count()) {
    await fsBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(400);
    const fsOn = await page.locator(".sdk-root.sdk-fs").count();
    const boardBox = await page.locator(".sdk-board").first().boundingBox().catch(() => null);
    const vp = page.viewportSize();
    const ratio = boardBox && vp ? boardBox.width / vp.width : 0;
    console.log(
      "全屏棋盘宽:",
      boardBox ? Math.round(boardBox.width) + "px" : "?",
      "(视口宽", vp && vp.width, "，占比", ratio.toFixed(2), ")",
      boardBox && boardBox.height > 500 ? "✓ 已放大占屏" : "WARN: 棋盘偏小"
    );
    await shot("05d-fullscreen.png");
    const fsOn2 = await fsBtn.click({ timeout: 2000 }).then(() => page.locator(".sdk-root.sdk-fs").count());
    console.log("全屏切换: 开→", fsOn > 0, "退→", fsOn2 === 0, "（C5）");
  } else {
    console.log("WARN: 未找到全屏按钮 .sdk-fsbtn");
  }

  // 笔记模式
  const noteBtn = page.getByRole("button", { name: /笔记/ }).first();
  if (await noteBtn.count()) {
    await noteBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(250);
    await cells.nth(41).click({ force: true }).catch(() => {});
    if (await padBtn("right", "5").count()) {
      await padBtn("right", "5").click({ timeout: 2000 }).catch(() => {});
    }
    await page.waitForTimeout(250);
    await shot("06-note.png");
  } else {
    console.log("WARN: 未找到笔记按钮");
  }

  // 撤销
  const undoBtn = page.getByRole("button", { name: /撤销/ }).first();
  if (await undoBtn.count()) {
    await undoBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
    await shot("07-undo.png");
  }

  // 提示
  const hintBtn = page.getByRole("button", { name: /提示/ }).first();
  if (await hintBtn.count()) {
    await hintBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
    await shot("08-hint.png");
  }

  // 新一局（v0.1.1：断言盘面刷新；v0.1.2：回到未开始态，「▶ 开始」重现）
  const newBtn = page.getByRole("button", { name: /新一局/ }).first();
  if (await newBtn.count()) {
    await newBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(500);
    const startAgain = await page.getByRole("button", { name: /开始/ }).first().count();
    console.log("新一局后回到未开始态:", startAgain > 0 ? "OK（▶ 开始 重现）" : "WARN");
    await shot("09-newgame.png");
  }

  // 难度切换（专家）— select 下拉
  const diffSel = page.locator(".sdk-diff-select");
  if (await diffSel.count()) {
    await diffSel.selectOption("expert").catch(() => {});
    await page.waitForTimeout(700);
    const selVal = await diffSel.inputValue().catch(() => "?");
    console.log("难度下拉 value:", selVal, "(期望 expert)");
    await shot("10-expert.png");
  } else {
    console.log("WARN: 未找到 .sdk-diff-select（难度下拉）");
  }

  const stats = await page.locator(".sdk-stats").first().innerText().catch(() => "(stats 不可读)");
  console.log("stats:", String(stats).replace(/\n/g, " | "));
  console.log("stats 字面量 <b> 残留:", String(stats).includes("<b>") ? "WARN: 仍有尖括号乱码" : "无 ✓（C9）");

  console.log("console errors:", errors.length ? errors.slice(0, 10) : "none");
  console.log("http >=400:", http404.length ? http404.slice(0, 5) : "none");
  console.log("RESULT: UI 交互完成（截图见 docs/screenshots/）");
} catch (e) {
  console.error("RESULT: ERROR", e && e.message);
  if (page) await page.screenshot({ path: `${OUT}/99-error.png` }).catch(() => {});
  process.exitCode = 1;
}