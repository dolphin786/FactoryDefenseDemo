import type { EnemyType } from '../config/EnemyConfig';
import type { Building } from './Building';

export type EnemyState = 'moving' | 'attacking' | 'dead';

export class Enemy {
  id: number;
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  atkSpd: number;
  emoji: string;
  radius: number;
  color: number;

  /** 格坐标（浮点） */
  gx: number;
  gy: number;

  /** 下一个目标路径点索引 */
  pathIndex: number;

  state: EnemyState = 'moving';
  /** 攻击目标：'core' 或 Building */
  target: 'core' | Building | null = null;
  atkCooldown = 0;

  /** 受击闪红计时 */
  flashTimer = 0;

  constructor(
    id: number,
    type: EnemyType,
    health: number,
    speed: number,
    damage: number,
    atkSpd: number,
    emoji: string,
    radius: number,
    color: number,
    startX: number,
    startY: number,
  ) {
    this.id = id;
    this.type = type;
    this.health = health;
    this.maxHealth = health;
    this.speed = speed;
    this.damage = damage;
    this.atkSpd = atkSpd;
    this.emoji = emoji;
    this.radius = radius;
    this.color = color;
    this.gx = startX;
    this.gy = startY;
    this.pathIndex = 1;
  }

  get isDead(): boolean { return this.state === 'dead'; }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    this.flashTimer = 0.15;
    if (this.health <= 0) this.state = 'dead';
  }
}
