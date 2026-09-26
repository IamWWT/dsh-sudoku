/**
 * dsh-sudoku 难度表。
 *
 * 9×9 固定，难度 = 提示格数（唯一解由引擎挖洞时的唯一解校验保证）：
 *   入门 40 / 进阶 30 / 专家 22（22 接近公认最难下限 17 附近的"高难区间"）。
 * `clues` 是**目标值**：挖洞按随机序+成对（180° 旋转对称）进行，每步用
 * 唯一解校验回退；搜索空间耗尽时允许提前停（实际提示数 ≥ 目标，只多不少）。
 */

export interface SudokuDifficulty {
  id: string;
  label: string;
  /** 目标提示格数。 */
  clues: number;
}

export const DIFFICULTIES: readonly SudokuDifficulty[] = [
  { id: "beginner", label: "入门", clues: 40 },
  { id: "intermediate", label: "进阶", clues: 30 },
  { id: "expert", label: "专家", clues: 22 },
] as const;

export function getDifficulty(id: string): SudokuDifficulty {
  const d = DIFFICULTIES.find((x) => x.id === id);
  if (!d) throw new Error(`未知难度 "${id}"（可用：${DIFFICULTIES.map((x) => x.id).join(" / ")}）`);
  return d;
}