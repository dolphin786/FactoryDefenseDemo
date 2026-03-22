import Phaser from 'phaser';
import { CELL } from '../../config/GameConfig';
import { BUILDING_CONFIGS, HAS_OUTPUT_DIR } from '../../config/BuildingConfig';
import { DIR_NAMES } from '../../config/GameConfig';
import type { GameState } from '../../model/GameState';
import { drawBuildingIcon, drawDirArrow, drawConveyor } from './PixelIcons';

/**
 * HoverRenderer — 鼠标悬停时的预览高亮（像素风）
 */
export class HoverRenderer {
  private gfx:        Phaser.GameObjects.Graphics;
  private scene:      Phaser.Scene;
  private previewGfx: Phaser.GameObjects.Graphics | null = null; // 建筑预览图标
  private lastPtr:    Phaser.Input.Pointer | null = null;

  constructor(scene: Phaser.Scene, depth = 8) {
    this.scene = scene;
    this.gfx = scene.add.graphics().setDepth(depth);
  }

  onPointerMove(ptr: Phaser.Input.Pointer, gs: GameState): void {
    this.lastPtr = ptr;
    this._render(ptr.x, ptr.y, gs);
  }

  refresh(gs: GameState): void {
    if (this.lastPtr) this._render(this.lastPtr.x, this.lastPtr.y, gs);
  }

  private _render(ptrX: number, ptrY: number, gs: GameState): void {
    const g = this.gfx;
    g.clear();
    this.previewGfx?.destroy(); this.previewGfx = null;

    const gx = Math.floor(ptrX / CELL);
    const gy = Math.floor(ptrY / CELL);
    if (!gs.inGrid(gx, gy)) return;

    const cx = gx * CELL + CELL / 2;
    const cy = gy * CELL + CELL / 2;
    const canPlace = gs.getCell(gx, gy) == null && !(gx === gs.corePosX && gy === gs.corePosY);

    if (gs.beltMode || gs.selectedCard) {
      // 格子高亮边框（琥珀=可放，红=不可放）
      const frameColor = canPlace ? 0xFFB000 : 0xFF3030;
      g.lineStyle(2, frameColor, 1);
      g.strokeRect(gx * CELL + 1, gy * CELL + 1, CELL - 2, CELL - 2);
      // 像素风：在角落加2×2亮点
      g.fillStyle(frameColor, 0.9);
      [[0,0],[CELL-4,0],[0,CELL-4],[CELL-4,CELL-4]].forEach(([ox,oy]) => {
        g.fillRect(gx * CELL + 1 + ox, gy * CELL + 1 + oy, 4, 4);
      });

      if (canPlace) {
        // 半透明底色
        g.fillStyle(0xFFFFFF, 0.08);
        g.fillRect(gx * CELL + 2, gy * CELL + 2, CELL - 4, CELL - 4);

        if (gs.beltMode) {
          // 传送带像素预览
          this.previewGfx = this.scene.add.graphics().setDepth(19);
          drawConveyor(this.previewGfx, cx, cy, CELL * 0.72, gs.selectedDir);
          this.previewGfx.setAlpha(0.75);
          this.updateHintBar(`BELT [${DIR_NAMES[gs.selectedDir]}]  R:ROTATE  RMB:EXIT`);

        } else if (gs.selectedCard) {
          const card = gs.selectedCard;
          const btype = card.type === 'resource'
            ? (card.resourceType === 'iron' ? 'iron_ore_node' : 'copper_ore_node')
            : card.buildingType!;
          const cfg = BUILDING_CONFIGS[btype];

          // 底色（建筑主色，低透明度）
          g.fillStyle(cfg.color, 0.35);
          g.fillRect(gx * CELL + 2, gy * CELL + 2, CELL - 4, CELL - 4);

          // 像素建筑预览图标（半透明）
          this.previewGfx = drawBuildingIcon(
            this.scene,
            { type: btype, x: gx, y: gy, dir: gs.selectedDir },
            CELL, 19,
          );
          this.previewGfx.setAlpha(0.7);

          // 有方向的建筑：额外叠加方向箭头
          const hasDir = HAS_OUTPUT_DIR.includes(btype);
          if (hasDir) {
            const arrowGfx = this.scene.add.graphics().setDepth(20);
            drawDirArrow(arrowGfx, cx + 10, cy + 10, gs.selectedDir, 12, 0xFFCC00);
            arrowGfx.setAlpha(0.9);
            // 把 arrowGfx 合并到 previewGfx 的生命周期（销毁时一起销毁）
            // 简化：直接加入场景，_render 下次调用时 previewGfx?.destroy() 只销毁 icon
            // 把 arrowGfx 也挂到 previewGfx 的 scene.events 解决：用 once 延迟销毁
            this.scene.events.once('update', () => {
              // 下帧如果 previewGfx 已被销毁，箭头也销毁
              if (!this.previewGfx) arrowGfx.destroy();
            });
            // 保存引用，下次清除
            (this.previewGfx as Phaser.GameObjects.Graphics & { _extra?: Phaser.GameObjects.Graphics })._extra = arrowGfx;
            this.updateHintBar(`DIR: ${DIR_NAMES[gs.selectedDir]}  R:ROTATE  RMB:CANCEL`);
          }

          // 炮塔射程圈
          if (btype === 'gun_tower') {
            g.lineStyle(1, 0xFF4040, 0.25);
            // 像素化：用点状虚线近似圆
            g.strokeCircle(cx, cy, 3 * CELL);
          }
        }
      }
    }

    // 悬停已放置机枪塔：射程圈
    const cell = gs.getCell(gx, gy);
    if (cell?.type === 'gun_tower' && !gs.selectedCard && !gs.beltMode) {
      g.lineStyle(1, 0xFF4040, 0.45);
      g.strokeCircle(cx, cy, 3 * CELL);
    }
  }

  private updateHintBar(text: string): void {
    const el = document.getElementById('hint-bar');
    if (el) { el.textContent = text; el.style.display = 'block'; }
  }

  clearAll(): void {
    this.gfx.clear();
    if (this.previewGfx) {
      const extra = (this.previewGfx as Phaser.GameObjects.Graphics & { _extra?: Phaser.GameObjects.Graphics })._extra;
      extra?.destroy();
      this.previewGfx.destroy();
      this.previewGfx = null;
    }
  }

  destroy(): void { this.clearAll(); this.gfx.destroy(); }
}
