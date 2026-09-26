/**
 * dsh-sudoku — Host 入口（Node 侧，v0.1 空壳）。
 *
 * v0.1 无 host 侧能力：游戏逻辑 100% 客户端（引擎跑在浏览器、成绩存 localStorage），
 * 无路由 / 无设置命名空间 / 无状态目录。v0.2 加 host 能力（成绩文件持久化等）时
 * 先改 spec（docs/specs/001-sudoku/spec.md §8 决策区）再动手。
 *
 * 注意：入口必须用具名导出（`export const name` 等），禁止 `export default`
 * （default export 会丢 inject 声明，见 dsh-minesweeper postmortem）。
 */

export const name = "sudoku";

/** v0.1 空壳：不依赖任何 host 服务。 */
export const inject = [] as string[];

/** 五处同步之一（package.json / 构建门禁 / README / ui.ts 徽章 / 本文件）。 */
export const VERSION = "0.1.4";

export function apply(_ctx: unknown, _config?: Record<string, unknown>): void {
  /* v0.1 空壳：无操作。 */
}