import Phaser from 'phaser';
import { CELL } from '../../config/GameConfig';

export interface BulletFx {
  sx: number; sy: number; ex: number; ey: number;
  t: number; speed: number;
}

export interface Effect {
  type: 'explosion' | 'damage';
  x: number; y: number;
  t: number; dur: number;
  r?: number;
}

/**
 * EffectRenderer — 子弹飞行动画 + 爆炸/受伤特效
 */
export class EffectRenderer {
  private gfxBullet:  Phaser.GameObjects.Graphics;
  private gfxEffect:  Phaser.GameObjects.Graphics;

  bullets: BulletFx[] = [];
  effects: Effect[]   = [];

  constructor(scene: Phaser.Scene, bulletDepth = 7, effectDepth = 5) {
    this.gfxBullet = scene.add.graphics().setDepth(bulletDepth);
    this.gfxEffect = scene.add.graphics().setDepth(effectDepth);
  }

  spawnBullet(fromGX: number, fromGY: number, toGX: number, toGY: number): void {
    const sx = fromGX * CELL + CELL / 2, sy = fromGY * CELL + CELL / 2;
    const ex = toGX   * CELL + CELL / 2, ey = toGY   * CELL + CELL / 2;
    const dist = Math.hypot(ex - sx, ey - sy) || 1;
    this.bullets.push({ sx, sy, ex, ey, t: 0, speed: (5 * CELL) / dist });
  }

  spawnExplosion(px: number, py: number): void {
    this.effects.push({ type: 'explosion', x: px, y: py, t: 0, dur: 0.5, r: CELL * 0.9 });
  }

  spawnDamage(px: number, py: number): void {
    this.effects.push({ type: 'damage', x: px, y: py, t: 0, dur: 0.25 });
  }

  update(dt: number): void {
    for (const b of this.bullets) b.t += b.speed * dt;
    this.bullets = this.bullets.filter(b => b.t < 1.0);
    for (const ef of this.effects) ef.t += dt;
    this.effects = this.effects.filter(ef => ef.t < ef.dur);
  }

  render(): void {
    this.renderBullets();
    this.renderEffects();
  }

  private renderBullets(): void {
    const g = this.gfxBullet;
    g.clear();
    for (const blt of this.bullets) {
      const t = Math.min(blt.t, 1);
      const x = blt.sx + (blt.ex - blt.sx) * t;
      const y = blt.sy + (blt.ey - blt.sy) * t;
      g.fillStyle(0xFFD700, 1);
      g.fillCircle(x, y, 4);
      if (t > 0.08) {
        const t2 = Math.max(0, t - 0.12);
        g.lineStyle(2, 0xFFE066, 0.5);
        g.lineBetween(x, y, blt.sx + (blt.ex - blt.sx) * t2, blt.sy + (blt.ey - blt.sy) * t2);
      }
    }
  }

  private renderEffects(): void {
    const g = this.gfxEffect;
    g.clear();
    for (const ef of this.effects) {
      if (ef.type === 'explosion') {
        const p = ef.t / ef.dur;
        const alpha = 1 - p;
        const r = (ef.r ?? CELL) * p;
        g.fillStyle(0xFF6B00, alpha * 0.8); g.fillCircle(ef.x, ef.y, r);
        g.fillStyle(0xFFFF00, alpha * 0.5); g.fillCircle(ef.x, ef.y, r * 0.5);
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + p * 3;
          g.fillStyle(0xFF8C00, alpha * 0.7);
          g.fillCircle(ef.x + Math.cos(ang) * r * 0.8, ef.y + Math.sin(ang) * r * 0.8, 3 * (1 - p));
        }
      } else {
        const alpha = (1 - ef.t / ef.dur) * 0.9;
        const r = CELL / 2 - 4;
        g.lineStyle(3, 0xFF0000, alpha);
        g.strokeRect(ef.x - r, ef.y - r, r * 2, r * 2);
      }
    }
  }

  clearAll(): void {
    this.bullets = []; this.effects = [];
    this.gfxBullet.clear(); this.gfxEffect.clear();
  }

  destroy(): void { this.gfxBullet.destroy(); this.gfxEffect.destroy(); }
}
