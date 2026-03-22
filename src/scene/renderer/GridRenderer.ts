import Phaser from 'phaser';
import { CELL, GRID_W, GRID_H, CANVAS_W, CANVAS_H, ENEMY_PATH } from '../../config/GameConfig';
import { getPathCells } from '../../utils/GridUtils';
import { drawDirArrow } from './PixelIcons';

// ── 导出颜色常量，供 BuildingRenderer.remove() 还原格子时使用 ──
export const GRID_COLOR_BG   = 0x0e1015; // 普通格背景
export const GRID_COLOR_PATH = 0x2a1a0a; // 路径格背景
export const GRID_COLOR_LINE = 0x2a2a2a; // 格线颜色

/**
 * GridRenderer — 像素风网格底图和敌人路径
 *
 * 像素风设计：
 *   - 深色格子背景，细格线（1px）
 *   - 路径格用暗土色区分
 *   - 路径连线：每段路径用 4px 宽度像素实线 + 等间隔方块点缀
 *   - 路径方向：每个路径节点处画一个像素箭头
 *   - 起点：像素"入侵口"图标（方形 + 向内箭头）
 */
export class GridRenderer {
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, depth = 0) {
    this.gfx = scene.add.graphics().setDepth(depth);
  }

  draw(): void {
    const g = this.gfx;
    g.clear();

    // ── 全局背景 ─────────────────────────────────────────
    g.fillStyle(GRID_COLOR_BG, 1);
    g.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ── 路径格子背景（暗土色，先于格线绘制） ─────────────
    const pathSet = new Set(getPathCells().map(c => `${c.x},${c.y}`));
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (pathSet.has(`${x},${y}`)) {
          g.fillStyle(GRID_COLOR_PATH, 1);
          g.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }

    // ── 像素格线 ──────────────────────────────────────────
    // 主格线
    g.lineStyle(1, GRID_COLOR_LINE, 1);
    for (let x = 0; x <= GRID_W; x++) g.lineBetween(x * CELL, 0, x * CELL, CANVAS_H);
    for (let y = 0; y <= GRID_H; y++) g.lineBetween(0, y * CELL, CANVAS_W, y * CELL);
    // 格角像素点（每个格角画 2×2 暗点，强化像素感）
    g.fillStyle(0x1a1a1a, 1);
    for (let x = 0; x <= GRID_W; x++) {
      for (let y = 0; y <= GRID_H; y++) {
        g.fillRect(x * CELL - 1, y * CELL - 1, 2, 2);
      }
    }

    // ── 敌人路径 ──────────────────────────────────────────
    this.drawPath(g);
  }

  private drawPath(g: Phaser.GameObjects.Graphics): void {
    const PATH_COLOR = 0xCC2200;
    const DOT_COLOR  = 0xFF4422;

    for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
      const s = ENEMY_PATH[i], e = ENEMY_PATH[i + 1];
      const sx = s.x * CELL + CELL / 2, sy = s.y * CELL + CELL / 2;
      const ex = e.x * CELL + CELL / 2, ey = e.y * CELL + CELL / 2;
      const isHoriz = s.y === e.y;
      const segLen  = Math.abs(isHoriz ? ex - sx : ey - sy);

      // ── 像素路径线：4px 宽深红色 + 中心亮线 ─────────────
      g.fillStyle(PATH_COLOR, 0.8);
      if (isHoriz) {
        const minX = Math.min(sx, ex), maxX = Math.max(sx, ex);
        g.fillRect(minX, sy - 2, maxX - minX, 4);
      } else {
        const minY = Math.min(sy, ey), maxY = Math.max(sy, ey);
        g.fillRect(sx - 2, minY, 4, maxY - minY);
      }
      // 中心亮线（1px）
      g.fillStyle(0xFF5533, 0.6);
      if (isHoriz) {
        const minX = Math.min(sx, ex), maxX = Math.max(sx, ex);
        g.fillRect(minX, sy, maxX - minX, 1);
      } else {
        const minY = Math.min(sy, ey), maxY = Math.max(sy, ey);
        g.fillRect(sx, minY, 1, maxY - minY);
      }

      // ── 路径上的方块点缀（每 CELL 间距一个） ─────────────
      const steps = Math.floor(segLen / CELL);
      for (let k = 1; k < steps; k++) {
        const t = k / steps;
        const px = sx + (ex - sx) * t;
        const py = sy + (ey - sy) * t;
        g.fillStyle(DOT_COLOR, 0.7);
        g.fillRect(px - 2, py - 2, 4, 4);
      }

      // ── 路径节点处画像素方向箭头 ─────────────────────────
      // 确定方向：向右=0, 向下=1, 向左=2, 向上=3
      let dir = 0;
      if      (ex > sx) dir = 0;
      else if (ex < sx) dir = 2;
      else if (ey > sy) dir = 1;
      else               dir = 3;

      // 在路径中点画箭头
      const midX = (sx + ex) / 2;
      const midY = (sy + ey) / 2;
      drawDirArrow(g, midX, midY, dir, 14, 0xFF6644);
    }

    // ── 起点：像素"入侵口"标记 ───────────────────────────
    const sp = ENEMY_PATH[0];
    const spx = sp.x * CELL + CELL / 2;
    const spy = sp.y * CELL + CELL / 2;

    // 外框（红色警戒方块）
    g.fillStyle(0xCC0000, 0.9);
    g.fillRect(spx - 10, spy - 10, 20, 20);
    g.fillStyle(0x0e1015, 1);
    g.fillRect(spx - 8, spy - 8, 16, 16);
    // 内部感叹号（竖条 + 点）
    g.fillStyle(0xFF3030, 1);
    g.fillRect(spx - 2, spy - 6, 4, 8);   // 竖
    g.fillRect(spx - 2, spy + 4, 4, 3);   // 点

    // ── 终点（核心位置）不单独标记，核心建筑本身已很显眼 ──
  }

  destroy(): void { this.gfx.destroy(); }
}
