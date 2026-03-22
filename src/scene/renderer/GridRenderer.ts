import Phaser from 'phaser';
import { CELL, GRID_W, GRID_H, CANVAS_W, CANVAS_H, ENEMY_PATH } from '../../config/GameConfig';
import { getPathCells } from '../../utils/GridUtils';

/**
 * GridRenderer — 绘制静态网格底图和敌人路径
 */
export class GridRenderer {
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, depth = 0) {
    this.gfx = scene.add.graphics().setDepth(depth);
  }

  draw(): void {
    const g = this.gfx;
    g.clear();

    // 背景
    g.fillStyle(0x263238, 1);
    g.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 路径格子背景
    const pathSet = new Set(getPathCells().map(c => `${c.x},${c.y}`));
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (pathSet.has(`${x},${y}`)) {
          g.fillStyle(0x3D2B1F, 1);
          g.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }

    // 网格线
    g.lineStyle(1, 0x37474F, 1);
    for (let x = 0; x <= GRID_W; x++) g.lineBetween(x * CELL, 0, x * CELL, CANVAS_H);
    for (let y = 0; y <= GRID_H; y++) g.lineBetween(0, y * CELL, CANVAS_W, y * CELL);

    // 路径虚线 + 箭头
    this.drawPath(g);
  }

  private drawPath(g: Phaser.GameObjects.Graphics): void {
    for (let i = 0; i < ENEMY_PATH.length - 1; i++) {
      const s = ENEMY_PATH[i], e = ENEMY_PATH[i + 1];
      const sx = s.x * CELL + CELL / 2, sy = s.y * CELL + CELL / 2;
      const ex = e.x * CELL + CELL / 2, ey = e.y * CELL + CELL / 2;

      // 虚线
      const steps = 6;
      for (let k = 0; k < steps; k++) {
        if (k % 2 === 0) {
          const t1 = k / steps, t2 = (k + 0.7) / steps;
          g.lineStyle(3, 0xE74C3C, 0.7);
          g.lineBetween(sx + (ex - sx) * t1, sy + (ey - sy) * t1, sx + (ex - sx) * t2, sy + (ey - sy) * t2);
        }
      }

      // 箭头
      const mx = (sx + ex) / 2 + (ex - sx) * 0.1;
      const my = (sy + ey) / 2 + (ey - sy) * 0.1;
      const ang = Math.atan2(ey - sy, ex - sx);
      const aLen = 9;
      g.fillStyle(0xE74C3C, 0.9);
      g.fillTriangle(
        mx + Math.cos(ang) * aLen,       my + Math.sin(ang) * aLen,
        mx + Math.cos(ang + 2.4) * 6,    my + Math.sin(ang + 2.4) * 6,
        mx + Math.cos(ang - 2.4) * 6,    my + Math.sin(ang - 2.4) * 6,
      );
    }

    // 起点标志
    const sp = ENEMY_PATH[0];
    g.fillStyle(0x27AE60, 0.9);
    g.fillCircle(sp.x * CELL + CELL / 2, sp.y * CELL + CELL / 2, 8);
    g.lineStyle(2, 0xFFFFFF, 0.7);
    g.strokeCircle(sp.x * CELL + CELL / 2, sp.y * CELL + CELL / 2, 8);
  }

  destroy(): void { this.gfx.destroy(); }
}
