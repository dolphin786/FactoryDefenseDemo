import Phaser from 'phaser';
import { CELL } from '../../config/GameConfig';
import type { Enemy } from '../../model/Enemy';
import { drawBugFace, drawTankBugFace } from './PixelIcons';

interface EnemyVisual {
  faceGfx: Phaser.GameObjects.Graphics; // 像素脸（静态，每帧重绘位置）
  hpBg:    Phaser.GameObjects.Graphics;
  hpBar:   Phaser.GameObjects.Graphics;
}

/**
 * EnemyRenderer — 每帧绘制敌人（纯像素，无 emoji）
 *
 * 圆形底色 + 像素脸绘制于 gfxEnemy（批量，每帧 clear+redraw）
 * 血条和像素脸细节用独立 Graphics 对象跟踪位置
 */
export class EnemyRenderer {
  private gfx:   Phaser.GameObjects.Graphics; // 所有敌人圆形底色（批量清除）
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
        v.faceGfx.destroy(); v.hpBg.destroy(); v.hpBar.destroy();
        this.visuals.delete(id);
      }
    }

    for (const e of enemies) {
      const cx = e.gx * CELL + CELL / 2;
      const cy = e.gy * CELL + CELL / 2;
      const r  = e.radius;

      // ── 圆形底色（含受击闪烁） ────────────────────────────
      const bodyColor = e.flashTimer > 0 ? 0xFF2222 : e.color;
      g.fillStyle(bodyColor, 1);
      g.fillCircle(cx, cy, r);
      // 像素风：用方形外框强调边界
      g.lineStyle(2, e.flashTimer > 0 ? 0xFF8888 : 0x000000, 0.8);
      g.strokeCircle(cx, cy, r);
      // 内侧高光线（左上）
      g.lineStyle(1, 0xFFFFFF, 0.2);
      g.strokeCircle(cx - 1, cy - 1, r - 2);

      // ── 像素脸（独立 Graphics 对象，随位置更新） ──────────
      if (!this.visuals.has(e.id)) {
        const faceGfx = this.scene.add.graphics().setDepth(9);
        const hpBg    = this.scene.add.graphics().setDepth(8);
        const hpBar   = this.scene.add.graphics().setDepth(8);
        this.visuals.set(e.id, { faceGfx, hpBg, hpBar });
      }
      const v = this.visuals.get(e.id)!;

      // 清除上帧的脸，在新位置重绘
      v.faceGfx.clear();
      if (e.type === 'tank_bug') {
        drawTankBugFace(v.faceGfx, cx, cy, r);
      } else {
        drawBugFace(v.faceGfx, cx, cy, r);
      }

      // ── 血条 ─────────────────────────────────────────────
      const ratio = Math.max(0, e.health / e.maxHealth);
      const bw = r * 2, hpX = cx - r, hpY = cy - r - 7;
      v.hpBg.clear();
      v.hpBg.fillStyle(0x111111, 1);
      v.hpBg.fillRect(hpX, hpY, bw, 3);
      v.hpBar.clear();
      const hpCol = ratio > 0.5 ? 0x39FF14 : ratio > 0.25 ? 0xFFB000 : 0xFF3030;
      v.hpBar.fillStyle(hpCol, 1);
      v.hpBar.fillRect(hpX, hpY, Math.floor(bw * ratio), 3);
    }
  }

  clearAll(): void {
    for (const [, v] of this.visuals) {
      v.faceGfx.destroy(); v.hpBg.destroy(); v.hpBar.destroy();
    }
    this.visuals.clear();
    this.gfx.clear();
  }

  destroy(): void { this.clearAll(); this.gfx.destroy(); }
}
