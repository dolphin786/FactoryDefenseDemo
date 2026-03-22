import Phaser from 'phaser';
import { CELL } from '../../config/GameConfig';
import { BUILDING_CONFIGS, HAS_OUTPUT_DIR } from '../../config/BuildingConfig';
import { DIR_ARROWS } from '../../config/GameConfig';
import { Building } from '../../model/Building';
import { getPathCells } from '../../utils/GridUtils';

interface BuildingVisual {
  hpBg:     Phaser.GameObjects.Graphics | null;
  hpBar:    Phaser.GameObjects.Graphics | null;
  icon:     Phaser.GameObjects.Text | null;
  dirLabel: Phaser.GameObjects.Text | null;
  ammoTxt:  Phaser.GameObjects.Text | null;
  warnTxt:  Phaser.GameObjects.Text | null;
}

/**
 * BuildingRenderer — 管理所有建筑的 Phaser 视觉对象
 */
export class BuildingRenderer {
  private scene: Phaser.Scene;
  private gfxBuilding: Phaser.GameObjects.Graphics;
  private visuals = new Map<number, BuildingVisual>();
  private pathSet: Set<string>;

  constructor(scene: Phaser.Scene, depth = 1) {
    this.scene = scene;
    this.gfxBuilding = scene.add.graphics().setDepth(depth);
    this.pathSet = new Set(getPathCells().map(c => `${c.x},${c.y}`));
  }

  add(b: Building): void {
    const cfg = BUILDING_CONFIGS[b.type];
    const px = b.x * CELL, py = b.y * CELL;
    const cx = px + CELL / 2, cy = py + CELL / 2;
    const g = this.gfxBuilding;

    // 底色
    g.fillStyle(cfg.color, 0.9);
    g.fillRect(px + 3, py + 3, CELL - 6, CELL - 6);
    if (b.type === 'core') {
      g.lineStyle(3, 0xFFD700, 1); g.strokeRect(px + 3, py + 3, CELL - 6, CELL - 6);
    } else if (b.type === 'gun_tower') {
      g.lineStyle(2, 0xFF8080, 1); g.strokeRect(px + 3, py + 3, CELL - 6, CELL - 6);
    } else {
      g.lineStyle(1, 0x566573, 0.8); g.strokeRect(px + 3, py + 3, CELL - 6, CELL - 6);
    }

    // 图标
    const iconTxt = b.type === 'conveyor' ? DIR_ARROWS[b.dir] : cfg.emoji;
    const iconY = (b.type === 'core' || b.type === 'conveyor') ? cy : cy - 3;
    const icon = this.scene.add.text(cx, iconY, iconTxt, { fontSize: '18px' }).setOrigin(0.5).setDepth(3);

    // 方向小标（矿节点/熔炉/组装机）
    let dirLabel: Phaser.GameObjects.Text | null = null;
    if (HAS_OUTPUT_DIR.includes(b.type) && b.type !== 'conveyor') {
      dirLabel = this.scene.add.text(cx + 13, cy + 13, DIR_ARROWS[b.dir], {
        fontSize: '12px', color: '#FFFF88', stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(4);
    }

    // 弹药箱数字
    let ammoTxt: Phaser.GameObjects.Text | null = null;
    if (b.type === 'ammo_box') {
      ammoTxt = this.scene.add.text(cx, cy + 12, `${b.ammo}/${b.ammoMax}`, {
        fontSize: '8px', color: '#FFD700',
      }).setOrigin(0.5).setDepth(3);
    }

    // 无弹药警告
    let warnTxt: Phaser.GameObjects.Text | null = null;
    if (b.type === 'gun_tower') {
      warnTxt = this.scene.add.text(cx, py + 4, '❌', { fontSize: '10px' })
        .setOrigin(0.5).setDepth(4).setVisible(false);
    }

    // 血条
    let hpBg: Phaser.GameObjects.Graphics | null = null;
    let hpBar: Phaser.GameObjects.Graphics | null = null;
    const showHp = !['conveyor', 'core', 'iron_ore_node', 'copper_ore_node'].includes(b.type);
    if (showHp) {
      hpBg = this.scene.add.graphics().setDepth(3);
      hpBar = this.scene.add.graphics().setDepth(3);
      hpBg.fillStyle(0x222222, 1);
      hpBg.fillRect(px + 4, py + CELL - 9, CELL - 8, 5);
      hpBar.fillStyle(0x27AE60, 1);
      hpBar.fillRect(px + 4, py + CELL - 9, CELL - 8, 5);
    }

    this.visuals.set(b.id, { hpBg, hpBar, icon, dirLabel, ammoTxt, warnTxt });
  }

  refresh(b: Building): void {
    const v = this.visuals.get(b.id);
    if (!v) return;

    // 血条
    if (v.hpBar) {
      const px = b.x * CELL, py = b.y * CELL;
      const ratio = b.health / b.maxHealth;
      v.hpBar.clear();
      const col = ratio > 0.5 ? 0x27AE60 : ratio > 0.25 ? 0xF39C12 : 0xE74C3C;
      v.hpBar.fillStyle(col, 1);
      v.hpBar.fillRect(px + 4, py + CELL - 9, Math.floor((CELL - 8) * ratio), 5);
    }

    // 弹药箱
    if (v.ammoTxt && b.type === 'ammo_box') {
      v.ammoTxt.setText(`${b.ammo}/${b.ammoMax}`);
    }

    // 无弹药警告
    if (v.warnTxt && b.type === 'gun_tower') {
      v.warnTxt.setVisible(b.noAmmo);
    }
  }

  remove(b: Building): void {
    const v = this.visuals.get(b.id);
    if (!v) return;
    v.icon?.destroy(); v.dirLabel?.destroy(); v.ammoTxt?.destroy();
    v.warnTxt?.destroy(); v.hpBg?.destroy(); v.hpBar?.destroy();
    this.visuals.delete(b.id);

    // 擦除格子并补回背景
    const px = b.x * CELL, py = b.y * CELL;
    this.gfxBuilding.fillStyle(0x263238, 1);
    this.gfxBuilding.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    if (this.pathSet.has(`${b.x},${b.y}`)) {
      this.gfxBuilding.fillStyle(0x3D2B1F, 1);
      this.gfxBuilding.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    }
    this.gfxBuilding.lineStyle(1, 0x37474F, 1);
    this.gfxBuilding.strokeRect(px, py, CELL, CELL);
  }

  clearAll(): void {
    for (const [, v] of this.visuals) {
      v.icon?.destroy(); v.dirLabel?.destroy(); v.ammoTxt?.destroy();
      v.warnTxt?.destroy(); v.hpBg?.destroy(); v.hpBar?.destroy();
    }
    this.visuals.clear();
    this.gfxBuilding.clear();
  }

  destroy(): void { this.clearAll(); this.gfxBuilding.destroy(); }
}
