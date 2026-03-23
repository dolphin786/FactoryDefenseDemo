import Phaser from 'phaser';
import { CELL } from '../../config/GameConfig';
import { BUILDING_CONFIGS, HAS_OUTPUT_DIR } from '../../config/BuildingConfig';

import { Building } from '../../model/Building';
import { getPathCells } from '../../utils/GridUtils';
import { drawBuildingIcon, drawDirArrow } from './PixelIcons';
import { GRID_COLOR_BG, GRID_COLOR_PATH, GRID_COLOR_LINE } from './GridRenderer';

interface BuildingVisual {
  iconGfx:  Phaser.GameObjects.Graphics | null;  // 像素图标
  dirGfx:   Phaser.GameObjects.Graphics | null;  // 输出方向箭头
  hpBg:     Phaser.GameObjects.Graphics | null;
  hpBar:    Phaser.GameObjects.Graphics | null;
  ammoTxt:  Phaser.GameObjects.Text | null;
  warnGfx:  Phaser.GameObjects.Graphics | null;  // 无弹药警告（像素X）
}

/**
 * BuildingRenderer — 管理所有建筑的像素视觉
 *
 * 完全使用 Phaser Graphics 绘制，不依赖 emoji 或系统字体。
 */
export class BuildingRenderer {
  private scene:       Phaser.Scene;
  private gfxBuilding: Phaser.GameObjects.Graphics; // 底色层（静态）
  private visuals = new Map<number, BuildingVisual>();
  private pathSet: Set<string>;

  constructor(scene: Phaser.Scene, depth = 1) {
    this.scene = scene;
    this.gfxBuilding = scene.add.graphics().setDepth(depth);
    this.pathSet = new Set(getPathCells().map(c => `${c.x},${c.y}`));
  }

  add(b: Building): void {
    const cfg  = BUILDING_CONFIGS[b.type];
    const px   = b.x * CELL, py = b.y * CELL;
    const cx   = px + CELL / 2, cy = py + CELL / 2;
    const g    = this.gfxBuilding;

    // ── 底色方块 ─────────────────────────────────────────────
    g.fillStyle(cfg.color, 0.85);
    g.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);

    // 像素风边框：外框深色，内框亮色（凸起效果）
    g.lineStyle(1, 0x000000, 1);
    g.strokeRect(px + 2,        py + 2,        CELL - 4, CELL - 4);
    g.lineStyle(1, 0xFFFFFF, 0.18);
    g.strokeRect(px + 3,        py + 3,        CELL - 6, CELL - 6);

    // 核心建筑：金色双边框
    if (b.type === 'core') {
      g.lineStyle(2, 0xFFD700, 1);
      g.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
    }
    // 炮塔：红色外框
    if (b.type === 'gun_tower') {
      g.lineStyle(1, 0xFF4040, 0.7);
      g.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
    }

    // ── 像素图标 ────────────────────────────────────────────
    const iconGfx = drawBuildingIcon(this.scene, b, CELL, 3);

    // ── 输出方向箭头（矿节点/熔炉/组装机） ─────────────────
    // 箭头固定画在格子右下角区域，箭头中心在那里，方向指向 b.dir
    let dirGfx: Phaser.GameObjects.Graphics | null = null;
    if (HAS_OUTPUT_DIR.includes(b.type) && b.type !== 'conveyor') {
      dirGfx = this.scene.add.graphics().setDepth(4);
      // 固定位置：格子右下角，不随方向偏移
      const ax = px + CELL - 10;
      const ay = py + CELL - 10;
      drawDirArrow(dirGfx, ax, ay, b.dir, 10, 0xFFCC00);
    }

    // ── 弹药箱：显示存弹量（像素字体） ─────────────────────
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

    // ── 无弹药警告（像素 X 符号） ───────────────────────────
    let warnGfx: Phaser.GameObjects.Graphics | null = null;
    if (b.type === 'gun_tower') {
      warnGfx = this.scene.add.graphics().setDepth(5).setVisible(false);
      // 2×2 像素 X 由两条对角线矩形组成
      const wx = px + CELL - 10, wy = py + 3;
      warnGfx.fillStyle(0xFF3030, 1);
      for (let i = 0; i < 5; i++) {
        warnGfx.fillRect(wx + i, wy + i, 2, 2);        // 左上→右下
        warnGfx.fillRect(wx + 4 - i, wy + i, 2, 2);   // 右上→左下
      }
    }

    // ── 血条（生产建筑和防御建筑） ──────────────────────────
    let hpBg:  Phaser.GameObjects.Graphics | null = null;
    let hpBar: Phaser.GameObjects.Graphics | null = null;
    const showHp = !['conveyor','core','iron_ore_node','copper_ore_node'].includes(b.type);
    if (showHp) {
      hpBg  = this.scene.add.graphics().setDepth(3);
      hpBar = this.scene.add.graphics().setDepth(3);
      hpBg.fillStyle(0x111111, 1);
      hpBg.fillRect(px + 3, py + CELL - 7, CELL - 6, 4);
      hpBar.fillStyle(0x39FF14, 1);
      hpBar.fillRect(px + 3, py + CELL - 7, CELL - 6, 4);
    }

    this.visuals.set(b.id, { iconGfx, dirGfx, hpBg, hpBar, ammoTxt, warnGfx });
  }

  refresh(b: Building): void {
    const v = this.visuals.get(b.id);
    if (!v) return;

    // 血条
    if (v.hpBar) {
      const px = b.x * CELL, py = b.y * CELL;
      const ratio = b.health / b.maxHealth;
      v.hpBar.clear();
      const col = ratio > 0.5 ? 0x39FF14 : ratio > 0.25 ? 0xFFB000 : 0xFF3030;
      v.hpBar.fillStyle(col, 1);
      v.hpBar.fillRect(px + 3, py + CELL - 7, Math.floor((CELL - 6) * ratio), 4);
    }

    // 弹药箱存弹量
    if (v.ammoTxt && b.type === 'ammo_box') {
      v.ammoTxt.setText(`${b.ammo}`);
    }

    // 无弹药警告
    if (v.warnGfx && b.type === 'gun_tower') {
      v.warnGfx.setVisible(b.noAmmo);
    }
  }

  remove(b: Building): void {
    const v = this.visuals.get(b.id);
    if (!v) return;
    v.iconGfx?.destroy(); v.dirGfx?.destroy(); v.ammoTxt?.destroy();
    v.warnGfx?.destroy(); v.hpBg?.destroy(); v.hpBar?.destroy();
    this.visuals.delete(b.id);

    // 擦除格子，用与 GridRenderer 完全相同的颜色还原
    const px = b.x * CELL, py = b.y * CELL;
    const isPath = this.pathSet.has(`${b.x},${b.y}`);
    this.gfxBuilding.fillStyle(isPath ? GRID_COLOR_PATH : GRID_COLOR_BG, 1);
    this.gfxBuilding.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    this.gfxBuilding.lineStyle(1, GRID_COLOR_LINE, 1);
    this.gfxBuilding.strokeRect(px, py, CELL, CELL);
  }

  clearAll(): void {
    for (const [, v] of this.visuals) {
      v.iconGfx?.destroy(); v.dirGfx?.destroy(); v.ammoTxt?.destroy();
      v.warnGfx?.destroy(); v.hpBg?.destroy(); v.hpBar?.destroy();
    }
    this.visuals.clear();
    this.gfxBuilding.clear();
  }

  destroy(): void { this.clearAll(); this.gfxBuilding.destroy(); }
}
