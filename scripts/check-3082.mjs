#!/usr/bin/env node
/**
 * dsh-sudoku — 3082 重启后验收助手（只读，不碰服务）
 *
 * 用法（用户重启 dsh-dev-web 之后）：
 *   node scripts/check-3082.mjs
 *
 * 做三件事：
 *  1) 从 `journalctl --user -u dsh-dev-web` 取最近一次启动时间与 URL token；
 *  2) 用该 token 探测 http://127.0.0.1:3082/ 是否 200（服务已就绪）；
 *  3) 检查 3082 profile 里 dsh-sudoku 的 link 安装是否仍在。
 * 全部通过 → 提示用户刷新页面（带新 token）并在右侧栏点「🧩 数独」完成目视验收。
 */
import { execSync } from "node:child_process";
import { existsSync, readlinkSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const sh = (cmd) => execSync(cmd, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).trim();

let ok = true;
const step = (name, pass, detail) => {
  console.log(`${pass ? "✔" : "✘"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) ok = false;
};

try {
  const log = sh(
    `XDG_RUNTIME_DIR=/run/user/$(id -u) journalctl --user -u dsh-dev-web --no-pager -n 200`,
  );
  const starts = log.split("\n").filter((l) => l.includes("Started DSH dev web UI"));
  const tokens = log.split("\n").map((l) => l.match(/http:\/\/127\.0\.0\.1:3082\/\?token=(\S+)/)?.[1]).filter(Boolean);
  const lastStart = starts.at(-1) ?? "";
  const token = tokens.at(-1) ?? "";
  console.log(`最近启动: ${lastStart ? lastStart.trim() : "(未见启动记录)"}`);
  step("服务最近有启动记录", !!lastStart);
  if (token) {
    console.log(`新 token URL: http://127.0.0.1:3082/?token=${token}`);
    // 注：3082 有 dsh-global-auth 门禁，未登录 curl 会被 302→/login；
    // 这里只验证“服务活着且门禁在响应”，页面级登录由用户浏览器完成。
    const code = sh(`curl -s -o /dev/null -w '%{http_code}' --max-time 5 'http://127.0.0.1:3082/?token=${token}'`);
    step("3082 有 HTTP 响应", code !== "000", `HTTP ${code}（302/401=登录门禁正常拦截，200=直通）`);
  } else {
    step("日志里有新 token", false);
  }

  const nm = path.join(homedir(), ".dsh-dev/profiles/web/node_modules/dsh-sudoku");
  const linked = existsSync(nm) ? readlinkSync(nm) : null;
  step("profile 内 dsh-sudoku link 存在", linked !== null, linked ?? "");
} catch (e) {
  ok = false;
  console.error("✘ 检查失败:", e.message);
}

if (ok) {
  console.log("\n✅ 服务端就绪。请：刷新浏览器（用上面的新 token URL）→ 右侧栏点「🧩 数独」→ 应见难度下拉 + 玩法简介 + 棋盘。");
} else {
  console.log("\n❌ 有检查未通过：多半是服务还没重启，先跑 systemctl --user restart dsh-dev-web");
  process.exitCode = 1;
}