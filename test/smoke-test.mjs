#!/usr/bin/env node
/**
 * 冒烟测试：不依赖 DSH 运行时，只验证构建产物的安装前契约。
 *   - host 产物：可加载、导出齐全（v0.1：name="sudoku"、inject=[]、apply 为函数）
 *   - client 产物：经 __ModuleLoader__ 注册、插件 id、侧栏注册面齐全、
 *     未打包第二份 React、无硬编码色值、使用 DSH 主题 token
 *   - cordis.patch.yml 声明的插件 id 与 host 导出一致
 * 用法：node test/smoke-test.mjs（需先跑过 build）
 *
 * 自举：host 产物 external 引用 @deepseek-ai/*（运行时由 DSH profile 提供）；
 * 本脚本从插件目录直跑时解析不到 → 自动以 `node --import` 重跑自己
 * （把 @deepseek-ai/* 解析固定到含该包的 node_modules，与构建工具同一约定）。
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

/* ---- 自举：外部包解析不到 → 带预载钩子重跑自己（只跳一次） ---- */
if (!process.env.__DSH_SUD_PRELOAD) {
  let local = false;
  try {
    createRequire(fileURLToPath(import.meta.url)).resolve("@deepseek-ai/schemastery");
    local = true;
  } catch {
    /* 解析不到 → 需要钩子 */
  }
  if (!local) {
    const r = spawnSync(
      process.execPath,
      ["--import", pathToFileURL(resolve(dirname(fileURLToPath(import.meta.url)), "external-preload.mjs")).href, ...process.argv.slice(1)],
      { stdio: "inherit", env: { ...process.env, __DSH_SUD_PRELOAD: "1" } },
    );
    if (r.error) {
      console.error(`✘ 无法带预载钩子重跑：${r.error.message}`);
      process.exit(1);
    }
    process.exit(r.status ?? 0);
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const hostFile = root + "/lib/index.js";
const clientFile = root + "/lib/client.js";
const pkgPath = root + "/package.json";
const patchPath = root + "/cordis.patch.yml";

let pass = 0;
let fail = 0;
function check(name, ok, extra = "") {
  if (ok) {
    pass++;
  } else {
    fail++;
    console.error(`✘ ${name}${extra ? " — " + extra : ""}`);
  }
}

/* ---- 前置：产物存在 ---- */
for (const f of [hostFile, clientFile, pkgPath, patchPath]) {
  if (!existsSync(f)) {
    console.error(`✘ 缺少 ${f}（请先运行 node scripts/build.mjs）`);
    process.exit(1);
  }
}

/* ---- host 产物 ---- */
const host = await import(pathToFileURL(hostFile).href + "?smoke=" + Date.now());
check("host: 导出 name === 'sudoku'", host.name === "sudoku", `实际 ${JSON.stringify(host.name)}`);
check("host: 导出 VERSION", typeof host.VERSION === "string" && host.VERSION.length > 0, String(host.VERSION));
check("host: inject === []（v0.1 空壳）", Array.isArray(host.inject) && host.inject.length === 0, JSON.stringify(host.inject));
check("host: apply 是函数", typeof host.apply === "function");

const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
check("host: VERSION 与 package.json 同步", host.VERSION === pkg.version, `host=${host.VERSION} pkg=${pkg.version}`);
check(
  "package.json: dsh.bundle.patch 指向 cordis.patch.yml",
  pkg.dsh && pkg.dsh.bundle && pkg.dsh.bundle.patch === "./cordis.patch.yml",
);
check(
  "package.json: dsh.client.platform === web",
  pkg.dsh && pkg.dsh.client && pkg.dsh.client.platform === "web",
);
check("package.json: main 指向 lib/index.js", pkg.main === "./lib/index.js");
check(
  "package.json: exports./client 指向 lib/client.js",
  pkg.exports && pkg.exports["./client"] === "./lib/client.js",
);

/* ---- cordis.patch.yml 与 host 的 id 一致 ---- */
const patch = readFileSync(patchPath, "utf-8");
check("cordis.patch.yml: 声明 dsh-sudoku 插件", /dsh-sudoku/.test(patch));
check("cordis.patch.yml: 声明的插件 id 为 sudoku", /\bid:\s*sudoku\b/.test(patch));

/* ---- client 产物 ---- */
const clientSrc = readFileSync(clientFile, "utf-8");
check("client: 经 __ModuleLoader__ 注册", clientSrc.includes("__ModuleLoader__"));
check("client: 含插件 id dsh-sudoku", clientSrc.includes("dsh-sudoku"));
check("client: 注册 sidebarRightTabs", clientSrc.includes("sidebarRightTabs"));
check("client: 注册 sidebar.right.pane.tab", clientSrc.includes("sidebar.right.pane.tab"));
check("client: 含标签引导 guide（order 42）", clientSrc.includes("guide") && clientSrc.includes("42"));
check(
  "client: 通过 ModuleLoader require react（未打包第二份 React）",
  /require\d*\("react"\)/.test(clientSrc),
);
check("client: 未打包 React 运行时", !clientSrc.includes("ReactCurrentOwner"));
check("client: 使用主题 token 而非硬编码色值", clientSrc.includes("--dsw-alias-") && !/#[0-9a-fA-F]{6}\b/.test(clientSrc));
check("client: 含版本徽章字面量", clientSrc.includes("dsh-sudoku v0.1.3"));
check("client: 含铅笔笔记开关", clientSrc.includes("铅笔"));
check("client: 含首填安全提示", clientSrc.includes("首填安全"));
check("client: 成绩走 localStorage（v0.1）", clientSrc.includes("localStorage") && clientSrc.includes("dsh-sudoku/v1/"));

console.log(fail === 0 ? `smoke：${pass} 项全部通过` : `smoke：${pass} 通过 / ${fail} 失败`);
process.exit(fail === 0 ? 0 : 1);