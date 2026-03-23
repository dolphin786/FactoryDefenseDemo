/**
 * MultiBlockUtils — 多格建筑工具函数
 *
 * 坐标系：dx/dy 是**旋转前**相对锚点的偏移（列/行）。
 * 旋转后的偏移通过 rotateCells 计算。
 *
 * 旋转规则（顺时针 90°）：
 *   (dx, dy) → (−dy, dx)   // 每旋转一次
 * 旋转 n 次（dir=n）：
 *   dir=0: (dx,  dy)
 *   dir=1: (−dy, dx)   ← 顺时针90°
 *   dir=2: (−dx, −dy)  ← 180°
 *   dir=3: (dy,  −dx)  ← 270°
 */

import type { CellDef } from '../config/BuildingConfig';

/** 将一组格子定义按方向旋转，返回旋转后的偏移列表 */
export function rotateCells(cells: CellDef[], dir: number): Array<{ dx: number; dy: number; role: CellDef['role'] }> {
  return cells.map(c => {
    let dx = c.dx, dy = c.dy;
    for (let i = 0; i < dir; i++) {
      const tmp = dx;
      dx = -dy;
      dy = tmp;
    }
    return { dx, dy, role: c.role };
  });
}

/** 根据锚点坐标和格子定义，计算所有占用的世界格坐标 */
export function getOccupiedCells(
  anchorX: number,
  anchorY: number,
  cells: CellDef[],
  dir: number,
): Array<{ x: number; y: number; role: CellDef['role'] }> {
  return rotateCells(cells, dir).map(c => ({
    x: anchorX + c.dx,
    y: anchorY + c.dy,
    role: c.role,
  }));
}

/**
 * 将一个端口方向（相对建筑朝向）转为世界方向。
 * 端口方向：0=前(dir方向), 1=右, 2=后, 3=左
 * 返回绝对方向 0..3（同 DIR_DX/DY）
 */
export function resolvePortDir(relDir: number, buildingDir: number): number {
  return (relDir + buildingDir) % 4;
}
