import Phaser from 'phaser';
import { CELL } from '../../config/GameConfig';
import { BUILDING_CONFIGS, HAS_OUTPUT_DIR } from '../../config/BuildingConfig';
import { DIR_NAMES } from '../../config/GameConfig';
import type { GameState } from '../../model/GameState';
import { drawBuildingIcon, drawConveyor } from './PixelIcons';
import { getOccupiedCells } from '../../utils/MultiBlockUtils';

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
    // worldX/worldY：已经过 Phaser Scale.FIT 逆变换，对应画布逻辑坐标
    this._render(ptr.worldX, ptr.worldY, gs);
  }

  refresh(gs: GameState): void {
    if (this.lastPtr) this._render(this.lastPtr.worldX, this.lastPtr.worldY, gs);
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

      if (gs.beltTool === 'splitter') {
        // 分流器预览：多格，用 getOccupiedCells 计算
        const cells = BUILDING_CONFIGS['splitter'].cells!;
        const occupied = getOccupiedCells(gx, gy, cells, gs.selectedDir);
        const allClear = occupied.every(c =>
          gs.inGrid(c.x, c.y) && gs.getCell(c.x, c.y) == null &&
          !(c.x === gs.corePosX && c.y === gs.corePosY),
        );
        const fc = allClear ? 0xFFB000 : 0xFF3030;
        for (const cell of occupied) {
          const px = cell.x * CELL, py = cell.y * CELL;
          g.lineStyle(2, fc, 1); g.strokeRect(px+1,py+1,CELL-2,CELL-2);
          g.fillStyle(0x2E6B4A, 0.3); g.fillRect(px+2,py+2,CELL-4,CELL-4);
        }
        this.updateHintBar(`SPLIT [${DIR_NAMES[gs.selectedDir]}]  R:ROTATE  RMB:EXIT`);
        // 射程圈等后续处理省略
      } else {

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
          const dir = gs.selectedDir;

          // 计算所有占用格（多格建筑）
          const cells = cfg.cells ?? [{ dx: 0, dy: 0, role: 'anchor' as const }];
          const occupied = getOccupiedCells(gx, gy, cells, dir);

          // 检查所有格是否可放置
          const allClear = occupied.every(c =>
            gs.inGrid(c.x, c.y) &&
            gs.getCell(c.x, c.y) == null &&
            !(c.x === gs.corePosX && c.y === gs.corePosY),
          );

          // 为每个占用格绘制预览
          for (const cell of occupied) {
            const px = cell.x * CELL, py = cell.y * CELL;
            const cellColor = allClear ? 0xFFB000 : 0xFF3030;

            // 格子高亮边框
            g.lineStyle(2, cellColor, 1);
            g.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
            [[0,0],[CELL-4,0],[0,CELL-4],[CELL-4,CELL-4]].forEach(([ox, oy]) => {
              g.fillStyle(cellColor, 0.9);
              g.fillRect(px + 1 + ox, py + 1 + oy, 4, 4);
            });

            if (allClear) {
              // 底色
              g.fillStyle(cfg.color, 0.25);
              g.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);

              // 锚点格绘制完整图标，body 格绘制半透明灰色填充
              if (cell.role === 'anchor') {
                const iconG = drawBuildingIcon(
                  this.scene,
                  { type: btype, x: cell.x, y: cell.y, dir },
                  CELL, 19,
                );
                iconG.setAlpha(0.7);
                this._tmpGfx.push(iconG);
              }
              // body 格用淡色标记（已有底色）
            }
          }

          if (HAS_OUTPUT_DIR.includes(btype)) {
            this.updateHintBar(`DIR: ${DIR_NAMES[dir]}  R:ROTATE  RMB:CANCEL`);
          }

          // 炮塔射程圈
          if (btype === 'gun_tower' && allClear) {
            g.lineStyle(1, 0xFF4040, 0.25);
            g.strokeCircle(gx * CELL + CELL / 2, gy * CELL + CELL / 2, 3 * CELL);
          }
        }
      }
      } // end else (non-splitter tools)
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
