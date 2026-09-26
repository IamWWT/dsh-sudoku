/**
 * dsh-sudoku — Client 入口（浏览器侧，DSH ModuleLoader 握手）。
 *
 * 注册：
 *   ① `sidebarRightTabs.register`：右侧栏「🧩 数独」标签
 *      （kind=sudoku，guide order=42，紧排 dsh-minesweeper 的 41 之后）；
 *   ② `sidebar.right.pane.tab`（key `dsh-sudoku`）：标签主体（App）；
 *   ③ 不自动 openTab（与扫雷同款决策：经侧栏指南/标签点入，不打扰主对话面）。
 *
 * 硬约束：
 *   - React 只能经 factory 的 require 取得（宿主注入），禁止 bundle 第二份 React；
 *   - 禁止声明与核心同名的子插槽（会 "slot is already declared" 崩加载）；
 *   - 颜色一律走 --dsw-* 主题 token（见 css.ts），禁止写死色值。
 *
 * v0.1 不注册 settings.plugin.item（无设置键，成绩走 localStorage）。
 */
import { createSudokuUI } from "./ui.ts";
import { CSS_TEXT } from "./css.ts";

declare global {
  interface Window {
    __ModuleLoader__?: {
      load: (reg: { id: string; factory: (require: (m: string) => unknown) => unknown }) => void;
    };
  }
}

type RequireFn = (id: string) => any;

window.__ModuleLoader__?.load({
  id: "dsh-sudoku",
  factory: (require: RequireFn) => {
    const React = require("react");
    const ui = createSudokuUI(React);
    const App = ui.App as unknown as (props: Record<string, unknown>) => unknown;
    const pluginExports: Record<string, unknown> = {};

    pluginExports.name = "sudoku";
    // client 侧 ctx 依赖：slots（标签主体）+ sidebarRightTabs（标签类型）。
    // v0.1 无 settingsScope（无设置卡片）。
    pluginExports.inject = ["slots", "sidebarRightTabs"];
    pluginExports.VERSION = "0.1.3";

    pluginExports.apply = function apply(ctx: any): void {
      const get = (k: string) => (ctx && typeof ctx.get === "function" ? ctx.get(k) : undefined);
      const srt = get("sidebarRightTabs") as { register?: (def: object) => void } | undefined;
      const slots = get("slots") as
        | { inject: (name: string, f: () => unknown) => () => unknown; register: (o: object, f: (p?: unknown) => unknown) => () => unknown }
        | undefined;
      if (!srt?.register || !slots) return;

      // 阶段一：登记标签类型（必须在 apply 顶层，不进 effect）。
      srt.register({
        id: "dsh-sudoku",
        kind: "sudoku",
        priority: "extension",
        title: () => "🧩 数独",
        guide: [
          {
            order: 42,
            title: () => "数独",
            description: () => "经典 9×9：三难度唯一解 / 铅笔笔记 / 撤销 / 提示 / 冲突高亮",
          },
        ],
      });

      // 阶段二：样式 + 标签主体（effect 生命周期自动回收）。
      ctx.effect?.(() => {
        const styleEl = document.createElement("style");
        styleEl.id = "sdk-style";
        styleEl.textContent = CSS_TEXT;
        document.head.appendChild(styleEl);
        const disps: (() => void)[] = [
          () => {
            styleEl.remove();
          },
        ];
        const d = slots.inject("sidebar.right.pane.tab", () =>
          slots.register(
            { name: "sidebar.right.pane.tab", key: "dsh-sudoku", inject: () => ({}) },
            () => React.createElement(App, {}),
          ),
        );
        if (typeof d === "function") disps.push(d as () => void);
        return () => {
          for (const x of disps) x();
        };
      });
    };

    return pluginExports;
  },
});

export {};