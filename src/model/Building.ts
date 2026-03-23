import type { BuildingType, ResourceType } from '../config/BuildingConfig';
import { AMMO_BOX_CAPACITY } from '../config/BalanceConfig';
import type { CardData } from './Card';

/** 传送带槽位 */
export interface BeltItem {
  type: ResourceType;
  progress: number; // 0.0 → 1.0
  qty?: number;     // 批量（子弹5发作为1个item传输）
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

  // ── 生产 ─────────────────────────────────────────────────────
  prodTimer  = 0;
  lastOutput: string | null = null;

  // ── 传送带槽位 ───────────────────────────────────────────────
  item:  BeltItem | null = null;

  // ── 多格建筑 ─────────────────────────────────────────────────
  /**
   * 副格（multiblock_body）指向其锚点建筑 id。
   * 锚点格本身为 null。
   */
  anchorId: number | null = null;

  /** 地下传送带 in↔out 配对 id */
  pairId: number | null = null;

  /**
   * 分流器：
   *   itemB    — 副格的输入槽，由锚点格统一管理
   *   outToggle — 下次优先输出到哪个出口（0/1 交替）
   */
  itemB:     BeltItem | null = null;
  outToggle  = 0;

  // ── 机器输入缓冲 ─────────────────────────────────────────────
  inputBuf: InputBuf = {};

  // ── 炮塔 ─────────────────────────────────────────────────────
  fireCooldown = 0;
  noAmmo       = false;

  // ── 弹药箱 ───────────────────────────────────────────────────
  ammo   = 0;
  readonly ammoMax = AMMO_BOX_CAPACITY;

  constructor(
    id: number, x: number, y: number,
    type: BuildingType, dir: number,
    health: number, sourceCard: CardData | null,
  ) {
    this.id = id; this.x = x; this.y = y;
    this.type = type; this.dir = dir;
    this.health = health; this.maxHealth = health;
    this.sourceCard = sourceCard;
  }

  get isDead(): boolean { return this.health <= 0; }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }
}
