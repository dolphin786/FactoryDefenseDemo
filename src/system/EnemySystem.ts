import { ENEMY_PATH } from '../config/GameConfig';
import { resolveEnemyCfg } from '../config/EnemyConfig';
import type { EnemyType } from '../config/EnemyConfig';
import { Enemy } from '../model/Enemy';
import type { Building } from '../model/Building';
import type { GameState } from '../model/GameState';
import { findBlockingBuilding } from '../utils/GridUtils';

/** 敌人被摧毁核心的回调 */
export type OnCoreAttacked = (damage: number) => void;
/** 建筑被摧毁的回调 */
export type OnBuildingDestroyed = (b: Building) => void;

export class EnemySystem {
  private onCoreAttacked: OnCoreAttacked;
  private onBuildingDestroyed: OnBuildingDestroyed;

  constructor(onCoreAttacked: OnCoreAttacked, onBuildingDestroyed: OnBuildingDestroyed) {
    this.onCoreAttacked = onCoreAttacked;
    this.onBuildingDestroyed = onBuildingDestroyed;
  }

  spawnEnemy(gs: GameState, type: EnemyType): Enemy {
    const cfg = resolveEnemyCfg(type);  // 已乘全局倍率
    const start = ENEMY_PATH[0];
    const e = new Enemy(
      gs.nextEnemyId(), type,
      cfg.health, cfg.speed, cfg.damage, cfg.atkSpd,
      cfg.emoji, cfg.radius, cfg.color,
      start.x, start.y,
    );
    gs.addEnemy(e);
    return e;
  }

  update(gs: GameState, dt: number): Enemy[] {
    const dead: Enemy[] = [];
    for (const e of gs.enemies) {
      if (e.isDead) { dead.push(e); continue; }
      e.flashTimer = Math.max(0, e.flashTimer - dt);
      if (e.state === 'moving')    this.moveEnemy(gs, e, dt);
      else if (e.state === 'attacking') this.attackEnemy(gs, e, dt);
    }
    gs.removeDeadEnemies();
    return dead;
  }

  // ── 移动 ──

  private moveEnemy(gs: GameState, e: Enemy, dt: number): void {
    if (e.pathIndex >= ENEMY_PATH.length) {
      e.state = 'attacking';
      e.target = 'core';
      return;
    }

    // 检查路径上是否有阻挡建筑
    const blocker = findBlockingBuilding(gs, e.pathIndex, e.gx, e.gy);
    if (blocker) {
      e.state = 'attacking';
      e.target = blocker;
      return;
    }

    const tp = ENEMY_PATH[e.pathIndex];
    const dx = tp.x - e.gx, dy = tp.y - e.gy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.08) {
      e.gx = tp.x; e.gy = tp.y;
      e.pathIndex++;
      if (e.pathIndex >= ENEMY_PATH.length) {
        e.state = 'attacking';
        e.target = 'core';
      }
      return;
    }

    const move = e.speed * dt;
    e.gx += (dx / dist) * move;
    e.gy += (dy / dist) * move;
  }

  // ── 攻击 ──

  private attackEnemy(gs: GameState, e: Enemy, dt: number): void {
    e.atkCooldown -= dt;

    if (e.target === 'core') {
      if (e.atkCooldown <= 0) {
        e.atkCooldown = e.atkSpd;
        this.onCoreAttacked(e.damage);
      }
      return;
    }

    const b = e.target as Building | null;
    if (!b || !gs.buildings.find(bb => bb.id === b.id)) {
      // 目标消失，继续前进
      e.state = 'moving';
      e.target = null;
      e.atkCooldown = 0;
      return;
    }

    if (e.atkCooldown <= 0) {
      e.atkCooldown = e.atkSpd;
      b.takeDamage(e.damage);
      if (b.isDead) {
        this.onBuildingDestroyed(b);
        gs.destroyBuilding(b);
        e.state = 'moving';
        e.target = null;
        e.atkCooldown = 0;
      }
    }
  }
}
