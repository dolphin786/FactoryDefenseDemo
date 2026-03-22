/**
 * MapConfig — 地图结构配置
 *
 * 包含网格尺寸、像素规格、敌人路径、核心位置。
 * 修改路径只需编辑 ENEMY_PATH，其余系统自动适配。
 */

// ── 网格与像素 ──────────────────────────────────────────────────
export const CELL   = 50;               // 每格像素大小
export const GRID_W = 10;              // 网格列数
export const GRID_H = 10;              // 网格行数
export const CANVAS_W = CELL * GRID_W; // 画布宽度（px）
export const CANVAS_H = CELL * GRID_H; // 画布高度（px）

// ── 核心建筑位置（路径终点） ────────────────────────────────────
export const CORE_X = 9;
export const CORE_Y = 7;

// ── 敌人预设路径（格坐标节点，顺序即行进顺序） ─────────────────
// 修改此数组可改变敌人入侵路线，首个节点为刷新点，末节点须与核心位置一致。
export const ENEMY_PATH: { x: number; y: number }[] = [
  { x: 0, y: 5 },  // 入侵起点（地图左侧）
  { x: 3, y: 5 },  // 向右
  { x: 3, y: 2 },  // 向上
  { x: 7, y: 2 },  // 向右
  { x: 7, y: 7 },  // 向下
  { x: 9, y: 7 },  // 终点（核心）
];

// ── 方向编码（内部使用，不建议直接修改） ───────────────────────
// 0=右  1=下  2=左  3=上
export const DIR_DX     = [ 1,  0, -1,  0];
export const DIR_DY     = [ 0,  1,  0, -1];
export const DIR_ARROWS = ['→', '↓', '←', '↑'];
export const DIR_NAMES  = ['向右', '向下', '向左', '向上'];
