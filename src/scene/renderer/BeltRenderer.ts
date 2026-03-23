import Phaser from 'phaser';
import { CELL, DIR_DX, DIR_DY } from '../../config/GameConfig';
import { RESOURCE_COLORS } from '../../config/BuildingConfig';
import type { Building } from '../../model/Building';

/**
 * BeltRenderer — 每帧绘制传送带类建筑上的资源圆点
 *
 * splitter_a 有两个槽：item（a格）和 itemB（b格对应位置）
 * 两个槽各自按其所在格的位置渲染圆点
 */
export class BeltRenderer {
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, depth = 4) {
    this.gfx = scene.add.graphics().setDepth(depth);
  }

  render(buildings: Building[]): void {
    const g = this.gfx;
    g.clear();

    const BELT_TYPES = new Set([
      'conveyor', 'splitter', 'multiblock_body',
      'underground_in', 'underground_out',
    ]);

    for (const b of buildings) {
      if (!BELT_TYPES.has(b.type)) continue;

      // 渲染主槽（b.item）
      if (b.item != null) {
        this.drawItem(g, b.x, b.y, b.dir, b.item.progress, b.item.type);
      }

      // splitter_a 的副槽（b.itemB）：渲染在 b 格位置
      // 分流器锚点格：itemB 对应 body 格的输入，渲染在 body 格位置
      if (b.type === 'splitter' && b.itemB != null) {
        // body 格相对锚点的偏移：dir=右/左→下方(+y)，dir=下/上→右侧(+x)
        const [bx, by] = (b.dir === 0 || b.dir === 2)
          ? [b.x, b.y + 1]
          : [b.x + 1, b.y];
        this.drawItem(g, bx, by, b.dir, b.itemB.progress, b.itemB.type);
      }
    }
  }

  private drawItem(
    g: Phaser.GameObjects.Graphics,
    gx: number, gy: number,
    dir: number,
    progress: number,
    resType: string,
  ): void {
    const p  = Math.min(progress, 1.0);
    const cx = gx * CELL + CELL / 2;
    const cy = gy * CELL + CELL / 2;
    const upDX = -DIR_DX[dir];
    const upDY = -DIR_DY[dir];
    const ox = cx + upDX * (CELL / 2) * (1 - p * 2);
    const oy = cy + upDY * (CELL / 2) * (1 - p * 2);

    const col = (RESOURCE_COLORS as Record<string, number>)[resType] ?? 0xFFFFFF;
    g.fillStyle(col, 1);
    g.fillCircle(ox, oy, Math.max(3, CELL * 0.22));
    g.lineStyle(1, 0xFFFFFF, 0.5);
    g.strokeCircle(ox, oy, Math.max(3, CELL * 0.22));
  }

  destroy(): void { this.gfx.destroy(); }
}
