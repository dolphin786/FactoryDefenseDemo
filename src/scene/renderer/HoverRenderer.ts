import Phaser from 'phaser';
import { CELL } from '../../config/GameConfig';
import { BUILDING_CONFIGS, HAS_OUTPUT_DIR } from '../../config/BuildingConfig';
import { DIR_NAMES } from '../../config/GameConfig';
import type { GameState } from '../../model/GameState';
import { drawBuildingIcon, drawConveyor } from './PixelIcons';

/**
 * HoverRenderer — 鼠标悬停时的预览高亮（像素风）
 *
 * 所有临时 Graphics 对象统一存入 _tmpGfx 数组，
 * 每次 _render 调用开头全部销毁，彻底消除残留。
 */
export class HoverRenderer {
  private gfx:     Phaser.GameObjects.Graphics;
  private scene:   Phaser.Scene;
  private lastPtr: Phaser.Input.Pointer | null = null;
  /** 所有临时预览 Graphics（每帧清除重建） */
  private _tmpGfx: Phaser.GameObjects.Graphics[] = [];

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

  /** 创建一个临时 Graphics 并注册到管理数组 */
  private tmpGfx(depth: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics().setDepth(depth);
    this._tmpGfx.push(g);
    return g;
  }

  /** 销毁所有临时 Graphics */
  private clearTmp(): void {
    for (const g of this._tmpGfx) g.destroy();
    this._tmpGfx = [];
  }

  private _render(ptrX: number, ptrY: number, gs: GameState): void {
    // ── 每帧开头：清除上一帧所有临时预览对象 ──────────────
    this.clearTmp();
    this.gfx.clear();

    const gx = Math.floor(ptrX / CELL);
    const gy = Math.floor(ptrY / CELL);
    if (!gs.inGrid(gx, gy)) return;

    const cx = gx * CELL + CELL / 2;
    const cy = gy * CELL + CELL / 2;
    const g  = this.gfx;
    const canPlace = gs.getCell(gx, gy) == null &&
                     !(gx === gs.corePosX && gy === gs.corePosY);

    if (gs.beltMode || gs.selectedCard) {
      const frameColor = canPlace ? 0xFFB000 : 0xFF3030;
      // 格子高亮边框
      g.lineStyle(2, frameColor, 1);
      g.strokeRect(gx * CELL + 1, gy * CELL + 1, CELL - 2, CELL - 2);
      // 四角像素亮点
      g.fillStyle(frameColor, 0.9);
      [[0,0],[CELL-4,0],[0,CELL-4],[CELL-4,CELL-4]].forEach(([ox, oy]) => {
        g.fillRect(gx * CELL + 1 + ox, gy * CELL + 1 + oy, 4, 4);
      });

      if (canPlace) {
        g.fillStyle(0xFFFFFF, 0.06);
        g.fillRect(gx * CELL + 2, gy * CELL + 2, CELL - 4, CELL - 4);

        if (gs.beltMode) {
          // 传送带像素预览
          const pg = this.tmpGfx(19);
          drawConveyor(pg, cx, cy, CELL * 0.72, gs.selectedDir);
          pg.setAlpha(0.75);
          this.updateHintBar(`BELT [${DIR_NAMES[gs.selectedDir]}]  R:ROTATE  RMB:EXIT`);

        } else if (gs.selectedCard) {
          const card = gs.selectedCard;
          const btype = card.type === 'resource'
            ? (card.resourceType === 'iron' ? 'iron_ore_node' : 'copper_ore_node')
            : card.buildingType!;
          const cfg = BUILDING_CONFIGS[btype];

          // 建筑底色半透明
          g.fillStyle(cfg.color, 0.3);
          g.fillRect(gx * CELL + 2, gy * CELL + 2, CELL - 4, CELL - 4);

          // 像素建筑预览图标（用 tmpGfx 管理）
          const iconG = drawBuildingIcon(
            this.scene,
            { type: btype, x: gx, y: gy, dir: gs.selectedDir },
            CELL, 19,
          );
          iconG.setAlpha(0.7);
          this._tmpGfx.push(iconG); // 加入管理

          // 有输出方向的建筑：图标已旋转，只更新 hint bar
          if (HAS_OUTPUT_DIR.includes(btype)) {
            this.updateHintBar(`DIR: ${DIR_NAMES[gs.selectedDir]}  R:ROTATE  RMB:CANCEL`);
          }

          // 炮塔射程圈
          if (btype === 'gun_tower') {
            g.lineStyle(1, 0xFF4040, 0.25);
            g.strokeCircle(cx, cy, 3 * CELL);
          }
        }
      }
    }

    // 悬停在已放置的机枪塔上：射程圈
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
    this.clearTmp();
    this.gfx.clear();
  }

  destroy(): void { this.clearAll(); this.gfx.destroy(); }
}
