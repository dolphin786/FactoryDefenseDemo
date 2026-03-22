import { CORE_X, CORE_Y } from '../config/GameConfig';
import type { Building } from '../model/Building';
import type { Enemy } from '../model/Enemy';
import type { GameState } from '../model/GameState';
import { logger } from '../utils/DebugLogger';

export type OnBulletFired = (fromX: number, fromY: number, toX: number, toY: number) => void;

/**
 * DefenseSystem — 机枪塔自动攻击
 *
 * 职责：
 *   - 查找相邻弹药箱
 *   - 在射程内寻找优先目标（最接近核心的敌人）
 *   - 消耗弹药，立即结算伤害，触发子弹动画回调
 */
export class DefenseSystem {
  private readonly range = 3;        // 射程（格）
  private readonly damagePerShot = 10;
  private readonly fireRate = 1.0;   // 秒/发

  private onBulletFired: OnBulletFired;

  constructor(onBulletFired: OnBulletFired) {
    this.onBulletFired = onBulletFired;
  }

  update(gs: GameState, dt: number): void {
    for (const b of gs.buildings) {
      if (b.type === 'gun_tower') this.updateTower(gs, b, dt);
    }
  }

  private updateTower(gs: GameState, tower: Building, dt: number): void {
    tower.fireCooldown -= dt;

    const ammoBox = this.findNearbyAmmoBox(gs, tower.x, tower.y);
    if (!ammoBox || ammoBox.ammo < 1) {
      if (!tower.noAmmo) {
        const hasBox = this.hasNearbyAmmoBox(gs, tower.x, tower.y);
        if (hasBox) logger.log('tower', `炮塔(${tower.x},${tower.y}) 弹药箱空`, `tower-noammo-${tower.id}`);
        else         logger.log('warn',  `炮塔(${tower.x},${tower.y}) 周围无弹药箱`, `tower-nobox-${tower.id}`);
      }
      tower.noAmmo = true;
      return;
    }
    tower.noAmmo = false;

    if (tower.fireCooldown > 0) return;

    const target = this.pickTarget(gs, tower);
    if (!target) return;

    ammoBox.ammo--;
    tower.fireCooldown = this.fireRate;
    logger.log('tower', `炮塔(${tower.x},${tower.y}) 🔫 射击 剩余弹药=${ammoBox.ammo}`, `tower-fire-${tower.id}`);

    this.onBulletFired(tower.x, tower.y, target.gx, target.gy);
    target.takeDamage(this.damagePerShot);
  }

  private pickTarget(gs: GameState, tower: Building): Enemy | null {
    const inRange = gs.enemies.filter(e => {
      if (e.isDead) return false;
      const dx = e.gx - tower.x, dy = e.gy - tower.y;
      return Math.sqrt(dx * dx + dy * dy) <= this.range;
    });
    if (inRange.length === 0) return null;

    inRange.sort((a, b) => {
      if (b.pathIndex !== a.pathIndex) return b.pathIndex - a.pathIndex;
      const da = Math.hypot(a.gx - CORE_X, a.gy - CORE_Y);
      const db = Math.hypot(b.gx - CORE_X, b.gy - CORE_Y);
      return da - db;
    });
    return inRange[0];
  }

  private findNearbyAmmoBox(gs: GameState, x: number, y: number): Building | null {
    for (const d of [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }]) {
      const nb = gs.getCell(d.x, d.y);
      if (nb?.type === 'ammo_box' && nb.ammo > 0) return nb;
    }
    return null;
  }

  private hasNearbyAmmoBox(gs: GameState, x: number, y: number): boolean {
    for (const d of [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }]) {
      if (gs.getCell(d.x, d.y)?.type === 'ammo_box') return true;
    }
    return false;
  }
}
