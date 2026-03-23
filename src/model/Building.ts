import type { BuildingType, ResourceType } from '../config/BuildingConfig';
import { AMMO_BOX_CAPACITY } from '../config/BalanceConfig';
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

  /**
   * 分流器共享状态（仅 splitter_a 使用，splitter_b 通过 pairId 查 a）
   *   itemB:          副格（splitter_b 对应位置）的输入槽
   *   outToggle:      下次优先输出到哪侧（0=a侧/上, 1=b侧/下），交替
   */
  itemB: BeltItem | null = null;
  outToggle = 0;

  // 配对 id：分流器 a↔b 互记，地下传送带 in↔out 互记
  pairId: number | null = null;

  // 弹药箱
  ammo = 0;
  readonly ammoMax = AMMO_BOX_CAPACITY;

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
