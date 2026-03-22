import Phaser from 'phaser';
import { CELL } from '../../config/GameConfig';
import type { Enemy } from '../../model/Enemy';

interface EnemyVisual {
  icon:  Phaser.GameObjects.Text;
  hpBg:  Phaser.GameObjects.Graphics;
  hpBar: Phaser.GameObjects.Graphics;
}

/**
 * EnemyRenderer — 每帧绘制敌人圆形 + 血条
 */
export class EnemyRenderer {
  private gfx: Phaser.GameObjects.Graphics;
  private scene: Phaser.Scene;
  private visuals = new Map<number, EnemyVisual>();

  constructor(scene: Phaser.Scene, depth = 6) {
    this.scene = scene;
    this.gfx = scene.add.graphics().setDepth(depth);
  }

  render(enemies: Enemy[]): void {
    const g = this.gfx;
    g.clear();

    const alive = new Set(enemies.map(e => e.id));

    // 清理已不存在的视觉对象
    for (const [id, v] of this.visuals) {
      if (!alive.has(id)) {
        v.icon.destroy(); v.hpBg.destroy(); v.hpBar.destroy();
        this.visuals.delete(id);
      }
    }

    for (const e of enemies) {
      const cx = e.gx * CELL + CELL / 2;
      const cy = e.gy * CELL + CELL / 2;
      const r = e.radius;

      // 底色（受伤闪红）
      g.fillStyle(e.flashTimer > 0 ? 0xFF4444 : e.color, 1);
      g.fillCircle(cx, cy, r);
      g.lineStyle(2, e.flashTimer > 0 ? 0xFF8888 : 0xFFFFFF, 0.6);
      g.strokeCircle(cx, cy, r);

      // 创建或更新文字/血条对象
      if (!this.visuals.has(e.id)) {
        const icon  = this.scene.add.text(cx, cy, e.emoji, { fontSize: e.radius > 20 ? '18px' : '14px' }).setOrigin(0.5).setDepth(10);
        const hpBg  = this.scene.add.graphics().setDepth(9);
        const hpBar = this.scene.add.graphics().setDepth(9);
        this.visuals.set(e.id, { icon, hpBg, hpBar });
      }

      const v = this.visuals.get(e.id)!;
      v.icon.setPosition(cx, cy);

      const ratio = Math.max(0, e.health / e.maxHealth);
      const bw = r * 2;
      const hpX = cx - r, hpY = cy - r - 9;
      v.hpBg.clear();
      v.hpBg.fillStyle(0x333333, 1);
      v.hpBg.fillRect(hpX, hpY, bw, 4);
      v.hpBar.clear();
      const col = ratio > 0.5 ? 0x27AE60 : ratio > 0.25 ? 0xF39C12 : 0xE74C3C;
      v.hpBar.fillStyle(col, 1);
      v.hpBar.fillRect(hpX, hpY, Math.floor(bw * ratio), 4);
    }
  }

  clearAll(): void {
    for (const [, v] of this.visuals) {
      v.icon.destroy(); v.hpBg.destroy(); v.hpBar.destroy();
    }
    this.visuals.clear();
    this.gfx.clear();
  }

  destroy(): void { this.clearAll(); this.gfx.destroy(); }
}
