/**
 * GameConfig — 向后兼容的重导出文件
 *
 * 原来 GameConfig 中的内容已拆分到：
 *   MapConfig.ts    → CELL, GRID_W/H, CANVAS_W/H, CORE_X/Y, ENEMY_PATH, DIR_*
 *   BalanceConfig.ts → BELT_SPEED, INPUT_BUF_MAX
 *
 * 此文件统一重导出，避免大量改动现有 import 语句。
 * 新代码请直接从 MapConfig / BalanceConfig 导入。
 */
export {
  CELL, GRID_W, GRID_H, CANVAS_W, CANVAS_H,
  CORE_X, CORE_Y,
  ENEMY_PATH,
  DIR_DX, DIR_DY, DIR_ARROWS, DIR_NAMES,
} from './MapConfig';

export {
  BELT_SPEED,
  INPUT_BUF_MAX,
} from './BalanceConfig';
