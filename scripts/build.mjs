#!/usr/bin/env node
/**
 * dsh-sudoku 构建脚本：
 *   Host   → lib/index.js（Node ESM；node:* 与 @deepseek-ai/* external）
 *   Client → lib/client.js（浏览器 IIFE，经 window.__ModuleLoader__ 注册）
 * 用法：node scripts/build.mjs [--no-typecheck]
 *
 * 产物门禁（构建后立即执行，任一不过 → exit 1）：
 *   - 顶层布局卫生（禁止旧扁平残留 / node_modules 软链）
 *   - lib/index.js 动态 import 断言导出（name/inject/VERSION，v0.1 inject 必须为 []）
 *   - lib/client.js 断言 __ModuleLoader__ 注册 + 插件 id + 侧栏注册面 + 无第二份 React + 无 6 位 hex
 */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { buildFallbackDirs, findEsbuild, findTypeRoots } from "./paths.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

/* ---- 自举：host 产物 external 引用 @deepseek-ai/*（运行时由 DSH profile 提供）；
   从插件目录直跑门禁时解析不到 → 无法本地解析则带 --import 预载钩子重跑自己。 ---- */
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
      ["--import", pathToFileURL(resolve(here, "../test/external-preload.mjs")).href, ...process.argv.slice(1)],
      { stdio: "inherit", env: { ...process.env, __DSH_SUD_PRELOAD: "1" } },
    );
    if (r.error) {
      console.error(`[gate] ✘ 无法带预载钩子重跑：${r.error.message}`);
      process.exit(1);
    }
    process.exit(r.status ?? 0);
  }
}

/* ---- 工具定位（跨平台）：见 scripts/paths.mjs。
   优先 env 覆盖 → 同级/上级 harness → 真实 HOME 下的 profile → 历史回退。 ---- */
const FALLBACK_DIRS = buildFallbackDirs({
  importMetaUrl: import.meta.url,
  envKeys: ["SUD_TOOLS_DIR"],
});

function loadTool(name) {
  const anchors = [
    here + "/x.js",
    root + "/x.js",
    ...FALLBACK_DIRS.map((d) => (d.endsWith("node_modules") ? d + "/x.js" : d + "/node_modules/x.js")),
  ];
  for (const a of anchors) {
    try {
      return createRequire(a)(name);
    } catch {
      /* 下一个锚点 */
    }
  }
  if (name === "esbuild") {
    const eb = findEsbuild(FALLBACK_DIRS);
    if (eb) return eb;
  }
  throw new Error(`找不到 ${name}（需可解析 esbuild/typescript；请设 SUD_TOOLS_DIR 或在同级放置 deepseek-harness 并 pnpm install）`);
}

const fail = (msg) => {
  console.error(`[gate] ✗ ${msg}`);
  process.exit(1);
};

/** 顶层布局卫生：禁止会污染 link 安装的旧扁平残留。 */
function checkLayoutHygiene() {
  const forbidden = [
    { path: root + "/index.ts", why: "顶层 index.ts（旧扁平布局残留；正确位置是 src/index.ts）" },
    { path: root + "/client.js", why: "顶层 client.js（旧扁平布局残留；正确位置是 lib/）" },
    { path: root + "/build.mjs", why: "顶层 build.mjs（旧扁平布局残留；正确位置是 scripts/）" },
    { path: root + "/client", why: "顶层 client/ 目录残留（旧扁平布局）" },
    { path: root + "/node_modules", why: "顶层 node_modules（会遮蔽 profile 依赖）" },
  ];
  const bad = forbidden.filter((f) => existsSync(f.path));
  for (const f of bad) {
    let kind = "文件/目录";
    try {
      if (statSync(f.path).isSymbolicLink()) kind = "软链";
    } catch {
      /* ignore */
    }
    console.error(`[gate] ✗ 顶层布局卫生：发现${kind} ${f.path}`);
    console.error(`      ${f.why}`);
  }
  if (bad.length > 0) {
    console.error("[gate] 请先清理残留再构建（link 安装会把它们带进 profile）。");
    process.exit(1);
  }
  console.log("[gate] 顶层布局卫生 ✔");
}

/** 产物门禁：双产物存在、host 可加载且导出齐全、client 注册面完整。 */
async function verifyArtifacts() {
  const hostFile = root + "/lib/index.js";
  const clientFile = root + "/lib/client.js";
  for (const f of [hostFile, clientFile]) {
    if (!existsSync(f)) fail(`缺少构建产物 ${f}（旧布局？请完整重建）`);
    if (statSync(f).size <= 0) fail(`构建产物为空 ${f}`);
  }

  // 版本单一事实源 = package.json。以下所有版本断言都由它推导，
  // 避免「门禁里写死一个版本号」导致漏检（v0.1.2→0.1.3 时 client entry 的
  // VERSION 就是这样漏掉的：门禁只查 host VERSION 与徽章字面量）。
  const pkgVersion = JSON.parse(readFileSync(root + "/package.json", "utf-8")).version;
  const entrySrc = readFileSync(root + "/src/client/entry.ts", "utf-8");
  if (!entrySrc.includes(`pluginExports.VERSION = "${pkgVersion}"`)) {
    fail(`src/client/entry.ts 的 pluginExports.VERSION 应与 package.json 同步为 "${pkgVersion}"`);
  }

  // host：动态 import 断言导出（loader 加载的就是这个入口）。
  try {
    const m = await import(pathToFileURL(hostFile).href + "?gate=" + Date.now());
    for (const k of ["apply", "inject", "name", "VERSION"]) {
      if (!(k in m)) fail(`lib/index.js 缺少导出 ${k}`);
    }
    if (m.name !== "sudoku") fail(`lib/index.js 的 name 应为 "sudoku"，实际 ${JSON.stringify(m.name)}`);
    if (m.VERSION !== pkgVersion) fail(`lib/index.js 的 VERSION 应为 ${pkgVersion}（= package.json），实际 ${m.VERSION}`);
    if (!Array.isArray(m.inject) || m.inject.length !== 0) {
      fail(`lib/index.js 的 inject 应为 []（v0.1 空壳），实际 ${JSON.stringify(m.inject)}`);
    }
  } catch (e) {
    fail(`lib/index.js 无法加载：${String(e)}`);
  }

  // client：注册面文本断言。
  const clientSrc = readFileSync(clientFile, "utf-8");
  if (!clientSrc.includes("__ModuleLoader__")) fail("lib/client.js 未注册 window.__ModuleLoader__");
  if (!clientSrc.includes("dsh-sudoku")) fail("lib/client.js 未包含插件 id dsh-sudoku");
  if (!clientSrc.includes("sidebarRightTabs")) fail("lib/client.js 未注册 sidebarRightTabs（右侧栏标签）");
  if (!clientSrc.includes("sidebar.right.pane.tab")) fail("lib/client.js 未注册 sidebar.right.pane.tab（标签主体）");
  if (!clientSrc.includes("guide")) fail("lib/client.js 未含标签引导 guide");
  if (!clientSrc.includes(`dsh-sudoku v${pkgVersion}`)) {
    fail(`lib/client.js 缺少版本徽章字面量 dsh-sudoku v${pkgVersion}（= package.json）`);
  }
  if (clientSrc.includes("ReactCurrentOwner")) fail("lib/client.js 打进了第二份 React（必须经 ModuleLoader require）");
  if (/#[0-9a-fA-F]{6}\b/.test(clientSrc)) fail("lib/client.js 含 6 位硬编码色值（只许 --dsw-* token / 纯亮度 rgba）");
  if (!clientSrc.includes("--dsw-alias-")) fail("lib/client.js 未使用 DSH 主题 token（--dsw-alias-*）");
  console.log("[gate] 产物可加载 ✔（host 导出齐全 + client 注册面完整 + 无第二份 React + 无硬编码色）");
}

const noTypecheck = process.argv.includes("--no-typecheck");
checkLayoutHygiene();

const esbuild = loadTool("esbuild");

await Promise.all([
  esbuild.build({
    entryPoints: [root + "/src/index.ts"],
    outfile: root + "/lib/index.js",
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    charset: "utf8",
    external: ["node:*", "@deepseek-ai/*"],
    logLevel: "warning",
  }),
  esbuild.build({
    entryPoints: [root + "/src/client/entry.ts"],
    outfile: root + "/lib/client.js",
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    charset: "utf8",
    logLevel: "warning",
  }),
]);
console.log("[build] lib/index.js + lib/client.js 已生成");

await verifyArtifacts();

if (!noTypecheck) {
  // 用 TypeScript API 在进程内做类型检查（不 spawn 子进程）：
  // 某些 Windows 环境下自 spawn 当前 node.exe 会 EBUSY，进程内调用最稳且跨平台一致。
  const ts = loadTool("typescript");
  if (!ts) fail("找不到 typescript（请设 SUD_TOOLS_DIR，或在同级放置已 pnpm install 的 deepseek-harness）");
  const typeRoots = findTypeRoots(root, FALLBACK_DIRS);
  for (const cfg of ["tsconfig.json", "tsconfig.client.json"]) {
    const cfgPath = root + "/" + cfg;
    const read = ts.readConfigFile(cfgPath, ts.sys.readFile);
    if (read.error) {
      fail(`${cfg} 读取失败：${ts.flattenDiagnosticMessageText(read.error.messageText, "\n")}`);
    }
    const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, root, {
      noEmit: true,
      ...(typeRoots.length > 0 ? { typeRoots } : {}),
    });
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    const diags = ts.getPreEmitDiagnostics(program);
    if (diags.length > 0) {
      console.error(`[typecheck] ${cfg} 失败（${diags.length} 个错误）`);
      console.error(
        ts.formatDiagnosticsWithColorAndContext(diags, {
          getCanonicalFileName: (f) => f,
          getCurrentDirectory: () => root,
          getNewLine: () => "\n",
        }),
      );
      process.exit(1);
    }
    console.log(`[typecheck] ${cfg} 通过（0 错误）`);
  }
}
console.log("[build] 完成（门禁全部通过）");