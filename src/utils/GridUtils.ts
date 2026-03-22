import { DIR_DX, DIR_DY, ENEMY_PATH } from '../config/GameConfig';
import type { Building } from '../model/Building';
import type { GameState } from '../model/GameState';

/** 获取建筑输出方向的下游格坐标 */
export function beltNextPos(b: Building): { x: number; y: number } {
  return { x: b.x + DIR_DX[b.dir], y: b.y + DIR_DY[b.dir] };
}

/** 获取路径两节点之间所有格子（不含起点，含终点） */
export function getSegmentCells(
  fromIdx: number,
  toIdx: number,
): { x: number; y: number }[] {
  const s = ENEMY_PATH[fromIdx];
  const e = ENEMY_PATH[toIdx];
  const cells: { x: number; y: number }[] = [];
  if (s.x === e.x) {
    const step = e.y > s.y ? 1 : -1;
    for (let y = s.y + step; y !== e.y + step; y += step) cells.push({ x: s.x, y });
  } else {
    const step = e.x > s.x ? 1 : -1;
    for (let x = s.x + step; x !== e.x + step; x += step) cells.push({ x, y: s.y });
  }
  return cells;
}

/** 获取整条敌人路径覆盖的所有格子（去重） */
export function getPathCells(): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
    cells.push(...getSegmentCells(i, i + 1));
  }
  return cells;
}

/** 查找敌人前方路径上最近的阻挡建筑（不含核心） */
export function findBlockingBuilding(
  gs: GameState,
  pathIndex: number,
  gx: number,
  gy: number,
): Building | null {
  if (pathIndex >= ENEMY_PATH.length) return null;
  const fromIdx = Math.max(0, pathIndex - 1);
  const toIdx = pathIndex;
  const segCells = getSegmentCells(fromIdx, toIdx);
  const tg = ENEMY_PATH[toIdx];
  const src = ENEMY_PATH[fromIdx];

  for (const c of segCells) {
    // 跳过已经走过的格
    const passedX = tg.x !== src.x ? (tg.x > src.x ? c.x <= gx : c.x >= gx) : false;
    const passedY = tg.y !== src.y ? (tg.y > src.y ? c.y <= gy : c.y >= gy) : false;
    if (passedX || passedY) continue;
    const b = gs.getCell(c.x, c.y);
    if (b && b.type !== 'core') return b;
  }
  return null;
}
