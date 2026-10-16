---
title: dsh-sudoku — 术语表
type: reference
tags: [glossary]
status: active
version: 1.0.0
date: 2026-10-08
---

# dsh-sudoku — 术语表

## 本插件专有术语

| 术语 | 全称 / 英文 | 定义 |
|---|---|---|
| guide order | — | 右侧栏标签的排序号。本插件固定 **42**（紧接 `dsh-minesweeper` 的 41）；改动前须在插件间核对占用（`src/client/entry.ts:60`）。 |
| keyed slot | — | 标签主体注册的插槽 `sidebar.right.pane.tab`，key = `dsh-sudoku`（`src/client/entry.ts:80`）。 |
| 不自动打开 | — | 注册只声明标签类型，不调 `openTab`；用户经右侧栏指南/标签手动点入（决策 D2）。 |
| 目标提示数 | target clues | 难度档位声明的提示格数：入门 40 / 进阶 30 / 专家 22（`src/shared/difficulties.ts`）。 |
| 挖洞 | remove clues | 从完整解盘按 180° 旋转对称**成对**挖除提示格（i 与 80−i 同时挖）；每步以 `countUpTo(puzzle, 2) === 1` 校验唯一解，不唯一即回滚；≤4 轮重排逼近目标提示数。搜索空间耗尽时提前停 → **实际提示数 ≥ 目标**（不承诺精确值）。 |
| 首填安全 | first-fill safety | 本局第一个填入的数字若错误，引擎自动修正为解值并置 `firstFillCorrected`，UI 出 toast（`fillDigit`）。 |
| 铅笔笔记 | pencil notes | 单元格 9 位 bitmask 的候选数；任一格填入数字后自动清除其 8 邻域对应位（`toggleNote` / `clearNotes`）。 |
| 显式开始 | `startArmed` | v0.1.2（C8）起：填数/提示须先点「▶ 开始」解锁，未点前计时恒 00:00；新一局回到未开始态。 |
| 无败局 | — | 填错不判负，盘面可撤销/修正到正解；`PuzzleState` 只有 `"playing"` / `"won"`。 |
| 环境支持矩阵 | — | 插件 README 中的双端支持度表（`ubuntu-4090` 源码树 + systemd 3082 / `windows-lite` 官方桌面版），含各端验证状态。 |

## 通用工艺术语

工程活动工艺全流程的通用术语（BRD / SAD / FTR / CTR 等交付物缩写、七阶段定义）
以标准真源为唯一权威，本文不复制：

`dsh-agent-presets/modes/engineering/standards/documentation.md`（§3 交付物前缀表）

## 相关

- [[README|docs 总览]] ｜ [[FILE_INDEX|文件索引]]
