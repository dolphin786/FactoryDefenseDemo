import Phaser from 'phaser';
import { CELL } from '../../config/GameConfig';
import { BUILDING_CONFIGS } from '../../config/BuildingConfig';
import { Building } from '../../model/Building';
import { drawBuildingIcon } from './PixelIcons';

interface BuildingVisual {
  bgGfx:    Phaser.GameObjects.Graphics;       // 底色 + 边框（独立对象，删除时直接 destroy）
  iconGfx:  Phaser.GameObjects.Graphics | null;
  hpBg:     Phaser.GameObjects.Graphics | null;
  hpBar:    Phaser.GameObjects.Graphics | null;
  ammoTxt:  Phaser.GameObjects.Text | null;
  warnGfx:  Phaser.GameObjects.Graphics | null;
}

/**
 * BuildingRenderer — 管理所有建筑的像素视觉
 *
 * 每个建筑的底色、边框、图标、血条均为独立 Graphics 对象。
 * 删除建筑时全部 destroy()，不往任何共享层写覆盖像素，
 * 确保下层路径（GridRenderer）始终透出。
 */
export class BuildingRenderer {
  private scene: Phaser.Scene;
  private visuals = new Map<number, BuildingVisual>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  add(b: Building): void {
    const cfg = BUILDING_CONFIGS[b.type];
    const px  = b.x * CELL, py = b.y * CELL;
    const cx  = px + CELL / 2, cy = py + CELL / 2;

    // ── 底色 + 边框（独立 Graphics，depth=1） ────────────────
    const bgGfx = this.scene.add.graphics().setDepth(1);

    bgGfx.fillStyle(cfg.color, 0.9);
    bgGfx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);

    // 外框黑，内框白（像素凸起）
    bgGfx.lineStyle(1, 0x000000, 1);
    bgGfx.strokeRect(px + 2, py + 2, CELL - 4, CELL - 4);
    bgGfx.lineStyle(1, 0xFFFFFF, 0.18);
    bgGfx.strokeRect(px + 3, py + 3, CELL - 6, CELL - 6);

    // 建筑类型专属边框
    if (b.type === 'core') {
      bgGfx.lineStyle(2, 0xFFD700, 1);
      bgGfx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
    } else if (b.type === 'gun_tower') {
      bgGfx.lineStyle(1, 0xFF4040, 0.7);
      bgGfx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
    }

    // ── 像素图标（depth=3，含旋转） ──────────────────────────
    const iconGfx = drawBuildingIcon(this.scene, b, CELL, 3);

    // ── 弹药箱存弹数字（depth=4） ────────────────────────────
    let ammoTxt: Phaser.GameObjects.Text | null = null;
    if (b.type === 'ammo_box') {
      ammoTxt = this.scene.add.text(cx, cy + 11, `${b.ammo}`, {
        fontSize: '7px',
        fontFamily: "'Press Start 2P', monospace",
        color: '#FFD700',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(4);
    }

    // ── 无弹药警告（像素 X，depth=5，默认隐藏） ─────────────
    let warnGfx: Phaser.GameObjects.Graphics | null = null;
    if (b.type === 'gun_tower') {
      warnGfx = this.scene.add.graphics().setDepth(5).setVisible(false);
      const wx = px + CELL - 10, wy = py + 3;
      warnGfx.fillStyle(0xFF3030, 1);
      for (let i = 0; i < 5; i++) {
        warnGfx.fillRect(wx + i,     wy + i, 2, 2);
        warnGfx.fillRect(wx + 4 - i, wy + i, 2, 2);
      }
    }

    // ── 血条（depth=3） ──────────────────────────────────────
    let hpBg:  Phaser.GameObjects.Graphics | null = null;
    let hpBar: Phaser.GameObjects.Graphics | null = null;
    const showHp = !['conveyor', 'core', 'iron_ore_node', 'copper_ore_node'].includes(b.type);
    if (showHp) {
      hpBg  = this.scene.add.graphics().setDepth(3);
      hpBar = this.scene.add.graphics().setDepth(3);
      hpBg.fillStyle(0x111111, 1);
      hpBg.fillRect(px + 3, py + CELL - 7, CELL - 6, 4);
      hpBar.fillStyle(0x39FF14, 1);
      hpBar.fillRect(px + 3, py + CELL - 7, CELL - 6, 4);
    }

    this.visuals.set(b.id, { bgGfx, iconGfx, hpBg, hpBar, ammoTxt, warnGfx });
  }

  refresh(b: Building): void {
    const v = this.visuals.get(b.id);
    if (!v) return;

    if (v.hpBar) {
      const px = b.x * CELL, py = b.y * CELL;
      const ratio = b.health / b.maxHealth;
      v.hpBar.clear();
      const col = ratio > 0.5 ? 0x39FF14 : ratio > 0.25 ? 0xFFB000 : 0xFF3030;
      v.hpBar.fillStyle(col, 1);
      v.hpBar.fillRect(px + 3, py + CELL - 7, Math.floor((CELL - 6) * ratio), 4);
    }

    if (v.ammoTxt && b.type === 'ammo_box') {
      v.ammoTxt.setText(`${b.ammo}`);
    }

    if (v.warnGfx && b.type === 'gun_tower') {
      v.warnGfx.setVisible(b.noAmmo);
    }
  }

  /** 移除建筑视觉：destroy 所有独立对象，不写任何覆盖像素 */
  remove(b: Building): void {
    const v = this.visuals.get(b.id);
    if (!v) return;
    v.bgGfx.destroy();
    v.iconGfx?.destroy();
    v.ammoTxt?.destroy();
    v.warnGfx?.destroy();
    v.hpBg?.destroy();
    v.hpBar?.destroy();
    this.visuals.delete(b.id);
  }

  clearAll(): void {
    for (const [, v] of this.visuals) {
      v.bgGfx.destroy();
      v.iconGfx?.destroy();
      v.ammoTxt?.destroy();
      v.warnGfx?.destroy();
      v.hpBg?.destroy();
      v.hpBar?.destroy();
    }
    this.visuals.clear();
  }

  destroy(): void { this.clearAll(); }
}
