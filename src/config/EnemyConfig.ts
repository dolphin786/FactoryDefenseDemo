/**
 * EnemyConfig — 敌人静态数据
 *
 * 数值属性受 BalanceConfig.ENEMY_SCALE 全局倍率影响。
 * AI 行为通过 AiBehavior 标签声明，EnemySystem 根据标签分发逻辑。
 * 新增敌人类型：添加一条 EnemyCfg 并在 ENEMY_CONFIGS 注册即可。
 */

import { ENEMY_SCALE } from './BalanceConfig';

export type EnemyType = 'bug' | 'tank_bug';

// ── AI 行为标签 ──────────────────────────────────────────────────
// 当前只有基础行为，为后续扩展（飞行、自爆、分裂等）预留入口
export type AiBehavior =
  | 'path_follow'  // 沿预设路径前进，遇建筑停下攻击（所有当前敌人）
  | 'flying'       // 忽略地面障碍物（未实现，占位）
  | 'suicide';     // 到达目标后自爆（未实现，占位）

export interface EnemyCfg {
  // ── 基础属性（实际值 = 配置值 × ENEMY_SCALE.*） ──
  health:   number;   // 基础血量
  speed:    number;   // 基础移动速度（格/秒）
  damage:   number;   // 基础攻击伤害
  atkSpd:   number;   // 攻击间隔（秒/次）
  // ── AI ──
  behavior: AiBehavior;
  // ── 外观 ──
  emoji:    string;
  radius:   number;   // 渲染圆半径（px）
  color:    number;   // Phaser hex
  name:     string;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyCfg> = {
  bug: {
    health: 30, speed: 1.0, damage: 10, atkSpd: 1.0,
    behavior: 'path_follow',
    emoji: '🐛', radius: 16, color: 0x8E44AD, name: '小虫子',
  },
  tank_bug: {
    health: 100, speed: 0.5, damage: 20, atkSpd: 2.0,
    behavior: 'path_follow',
    emoji: '🪲', radius: 22, color: 0x5B2C6F, name: '坦克虫',
  },
};

/**
 * 获取敌人实际属性（已乘全局倍率）
 * EnemySystem.spawnEnemy 调用此函数，而非直接读 ENEMY_CONFIGS
 */
export function resolveEnemyCfg(type: EnemyType): EnemyCfg {
  const base = ENEMY_CONFIGS[type];
  return {
    ...base,
    health: Math.round(base.health * ENEMY_SCALE.healthMultiplier),
    speed:  base.speed  * ENEMY_SCALE.speedMultiplier,
    damage: Math.round(base.damage * ENEMY_SCALE.damageMultiplier),
  };
}
