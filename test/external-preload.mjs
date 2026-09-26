/**
 * dsh-sudoku — ESM 外部包解析钩子（--import 预载）。
 *
 * 背景：host 产物 `lib/index.js` 以 external 方式 import `@deepseek-ai/*`
 * （运行时由 DSH profile 的 node_modules 提供）。构建门禁/冒烟从**插件目录**
 * 直接 `import(lib/index.js)` 时，Node 从插件目录向上解析不到这些包
 * （本插件按布局红线不放 node_modules）。此钩子把 `@deepseek-ai/*` 的解析
 * 固定到一个确定含该包的 node_modules（默认 3082 主力 profile，pnpm 布局下
 * profile 顶层 node_modules 才有完整解析链；可用 DSH_SUD_NODE_MODULES 覆盖）。
 *
 * 用法：`node --import <本文件> <script>`；build.mjs / smoke-test.mjs
 * 会自动 re-exec 自己（见各自文件头），无需手工加参数。
 */
import { register } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";

// DSH profile 的 node_modules：env 显式指定 → DSH_HOME → ~/.dsh-dev → ~/.dsh
// （不写死任何机器专属路径；取第一个实际存在的候选）
const BASE = (() => {
  if (process.env.DSH_SUD_NODE_MODULES) return process.env.DSH_SUD_NODE_MODULES;
  const homes = [];
  if (process.env.DSH_HOME) homes.push(process.env.DSH_HOME.replace(/^~(?=[\\/]|$)/, homedir()));
  homes.push(join(homedir(), ".dsh-dev"), join(homedir(), ".dsh"));
  for (const h of homes) {
    const nm = join(h, "profiles", "web", "node_modules");
    if (existsSync(nm)) return nm;
  }
  return join(homedir(), ".dsh-dev", "profiles", "web", "node_modules");
})();

register(
  `data:text/javascript,
    import { createRequire } from "node:module";
    import { pathToFileURL } from "node:url";
    const BASE = ${JSON.stringify(BASE)};
    const req = createRequire(BASE + "/package.json");
    export async function resolve(specifier, context, next) {
      if (specifier.startsWith("@deepseek-ai/")) {
        try {
          return { url: pathToFileURL(req.resolve(specifier)).href, shortCircuit: true };
        } catch {
          /* 解析不到 → 走默认解析（报错语义保持原样） */
        }
      }
      return next(specifier, context);
    }
  `,
  import.meta.url,
);