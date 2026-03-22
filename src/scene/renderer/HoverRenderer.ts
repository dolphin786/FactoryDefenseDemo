import Phaser from 'phaser';
import { CELL } from '../../config/GameConfig';
import { BUILDING_CONFIGS, HAS_OUTPUT_DIR } from '../../config/BuildingConfig';
import { DIR_ARROWS, DIR_NAMES } from '../../config/GameConfig';
import type { GameState } from '../../model/GameState';

/**
 * HoverRenderer — 鼠标悬停时的预览高亮
 *   - 传送带模式：显示方向箭头预览
 *   - 建筑卡模式：显示半透明建筑预览 + 方向箭头
 *   - 机枪塔：显示射程圈
 */
export class HoverRenderer {
  private gfx:  Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;
  private previewText: Phaser.GameObjects.Text | null = null;
  private lastPtr: Phaser.Input.Pointer | null = null;

  constructor(scene: Phaser.Scene, depth = 8) {
    this.scene = scene;
    this.gfx = scene.add.graphics().setDepth(depth);
  }

  /** 每次指针移动时调用 */
  onPointerMove(ptr: Phaser.Input.Pointer, gs: GameState): void {
    this.lastPtr = ptr;
    this._render(ptr.x, ptr.y, gs);
  }

  /** R 键旋转后强制刷新 */
  refresh(gs: GameState): void {
    if (this.lastPtr) this._render(this.lastPtr.x, this.lastPtr.y, gs);
  }

  private _render(ptrX: number, ptrY: number, gs: GameState): void {
    const g = this.gfx;
    g.clear();
    this.previewText?.destroy(); this.previewText = null;

    const gx = Math.floor(ptrX / CELL);
    const gy = Math.floor(ptrY / CELL);
    if (!gs.inGrid(gx, gy)) return;

    const cx = gx * CELL + CELL / 2, cy = gy * CELL + CELL / 2;
    const canPlace = gs.getCell(gx, gy) == null && !(gx === gs.corePosX && gy === gs.corePosY);

    if (gs.beltMode || gs.selectedCard) {
      g.lineStyle(2, canPlace ? 0xF39C12 : 0xE74C3C, 0.9);
      g.strokeRect(gx * CELL + 2, gy * CELL + 2, CELL - 4, CELL - 4);

      if (canPlace) {
        if (gs.beltMode) {
          // 传送带方向预览
          g.fillStyle(0x4A5568, 0.55);
          g.fillRect(gx * CELL + 3, gy * CELL + 3, CELL - 6, CELL - 6);
          this.previewText = this.scene.add.text(cx, cy, DIR_ARROWS[gs.selectedDir], {
            fontSize: '22px', color: '#ECF0F1',
          }).setOrigin(0.5).setDepth(20);
          this.updateHintBar(`传送带 [${DIR_NAMES[gs.selectedDir]}]  R键旋转 | 右键退出`);
        } else if (gs.selectedCard) {
          const card = gs.selectedCard;
          const btype = card.type === 'resource'
            ? (card.resourceType === 'iron' ? 'iron_ore_node' : 'copper_ore_node')
            : card.buildingType!;
          const cfg = BUILDING_CONFIGS[btype];
          g.fillStyle(cfg.color, 0.45);
          g.fillRect(gx * CELL + 3, gy * CELL + 3, CELL - 6, CELL - 6);

          const hasDir = HAS_OUTPUT_DIR.includes(btype);
          const txt = hasDir ? cfg.emoji + DIR_ARROWS[gs.selectedDir] : cfg.emoji;
          this.previewText = this.scene.add.text(cx, cy, txt, { fontSize: '14px' })
            .setOrigin(0.5).setDepth(20);

          if (hasDir) this.updateHintBar(`输出方向: [${DIR_NAMES[gs.selectedDir]}]  R键旋转 | 右键取消`);
          if (btype === 'gun_tower') {
            g.lineStyle(1, 0xFF8080, 0.3);
            g.strokeCircle(cx, cy, 3 * CELL);
          }
        }
      }
    }

    // 悬停在已放置的机枪塔上显示射程
    const cell = gs.getCell(gx, gy);
    if (cell?.type === 'gun_tower' && !gs.selectedCard && !gs.beltMode) {
      g.lineStyle(1, 0xFF8080, 0.5);
      g.strokeCircle(cx, cy, 3 * CELL);
    }
  }

  private updateHintBar(text: string): void {
    const el = document.getElementById('hint-bar');
    if (el) { el.textContent = text; el.style.display = 'block'; }
  }

  clearAll(): void {
    this.gfx.clear();
    this.previewText?.destroy(); this.previewText = null;
  }

  destroy(): void { this.clearAll(); this.gfx.destroy(); }
}
