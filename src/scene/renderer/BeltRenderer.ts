import Phaser from 'phaser';
import { CELL, DIR_DX, DIR_DY } from '../../config/GameConfig';
import { RESOURCE_COLORS } from '../../config/BuildingConfig';
import type { Building } from '../../model/Building';

/**
 * BeltRenderer — 每帧绘制传送带上的资源圆点
 */
export class BeltRenderer {
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, depth = 4) {
    this.gfx = scene.add.graphics().setDepth(depth);
  }

  render(buildings: Building[]): void {
    const g = this.gfx;
    g.clear();

    const BELT_TYPES = new Set(['conveyor', 'splitter', 'underground_in', 'underground_out']);
    for (const b of buildings) {
      if (!BELT_TYPES.has(b.type) || b.item == null) continue;

      const progress = Math.min(b.item.progress, 1.0);
      const cx = b.x * CELL + CELL / 2;
      const cy = b.y * CELL + CELL / 2;

      // 物品从格子上游边缘移向下游边缘
      // progress=0 → 上游边缘；progress=1 → 下游边缘
      const upDX = -DIR_DX[b.dir];
      const upDY = -DIR_DY[b.dir];
      const ox = cx + upDX * (CELL / 2) * (1 - progress * 2);
      const oy = cy + upDY * (CELL / 2) * (1 - progress * 2);

      const col = RESOURCE_COLORS[b.item.type] ?? 0xFFFFFF;
      g.fillStyle(col, 1);
      g.fillCircle(ox, oy, 7);
      g.lineStyle(1, 0xFFFFFF, 0.5);
      g.strokeCircle(ox, oy, 7);
    }
  }

  destroy(): void { this.gfx.destroy(); }
}
