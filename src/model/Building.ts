import type { BuildingType, ResourceType } from '../config/BuildingConfig';
import type { CardData } from './Card';

/** 传送带槽位 */
export interface BeltItem {
  type: ResourceType;
  progress: number; // 0.0 → 1.0
  qty?: number;     // 批量（如子弹5发作为1个item传输）
}

/** 机器输入缓冲 */
export type InputBuf = Partial<Record<ResourceType, number>>;

export class Building {
  id: number;
  x: number;
  y: number;
  type: BuildingType;
  dir: number;        // 0=右 1=下 2=左 3=上
  health: number;
  maxHealth: number;
  sourceCard: CardData | null;

  // 生产计时器（矿节点/熔炉/组装机）
  prodTimer = 0;
  // 上次输出矿种（熔炉/多variant机器交替逻辑）
  lastOutput: string | null = null;

  // 传送带槽位
  item: BeltItem | null = null;

  // 机器输入缓冲
  inputBuf: InputBuf = {};

  // 炮塔
  fireCooldown = 0;
  noAmmo = false;

  // 弹药箱
  ammo = 0;
  readonly ammoMax = 50;

  constructor(
    id: number,
    x: number,
    y: number,
    type: BuildingType,
    dir: number,
    health: number,
    sourceCard: CardData | null,
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.type = type;
    this.dir = dir;
    this.health = health;
    this.maxHealth = health;
    this.sourceCard = sourceCard;
  }

  get isDead(): boolean { return this.health <= 0; }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }
}
