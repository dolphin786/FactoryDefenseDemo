/** 全局像素/网格常量 */
export const CELL = 50;
export const GRID_W = 10;
export const GRID_H = 10;
export const CANVAS_W = CELL * GRID_W;
export const CANVAS_H = CELL * GRID_H;

/** 核心建筑固定位置 */
export const CORE_X = 9;
export const CORE_Y = 7;

/** 传送带速度（格/秒） */
export const BELT_SPEED = 1.5;

/** 机器输入缓冲上限（每种资源） */
export const INPUT_BUF_MAX = 4;

/** 方向编码：0=右 1=下 2=左 3=上 */
export const DIR_DX = [1, 0, -1, 0];
export const DIR_DY = [0, 1, 0, -1];
export const DIR_ARROWS = ['→', '↓', '←', '↑'];
export const DIR_NAMES = ['向右', '向下', '向左', '向上'];

/** 敌人预设路径（格坐标节点） */
export const ENEMY_PATH: { x: number; y: number }[] = [
  { x: 0, y: 5 },
  { x: 3, y: 5 },
  { x: 3, y: 2 },
  { x: 7, y: 2 },
  { x: 7, y: 7 },
  { x: 9, y: 7 },
];
