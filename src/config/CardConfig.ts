/**
 * CardConfig — 卡牌元数据配置
 *
 * 定义游戏中所有可出现的卡牌，包括：
 *   - 基本属性（类型、建筑/资源种类、耐久）
 *   - 稀有度（影响奖励池权重和显示样式）
 *   - 解锁条件（当前 MVP 全部默认解锁，为后续扩展预留）
 *   - 展示元数据（名称、图标、描述、边框颜色）
 *
 * 奖励池和起始卡组直接引用这里的 cardId，
 * 不再在 LevelConfig 里重复写卡牌结构。
 */

import type { BuildingType } from './BuildingConfig';
import { CARD_DURABILITY_DEFAULT } from './BalanceConfig';

// ── 稀有度 ──────────────────────────────────────────────────────
export type Rarity = 'common' | 'uncommon' | 'rare';

export const RARITY_META: Record<Rarity, { label: string; color: string; weight: number }> = {
  common:   { label: '普通', color: '#95A5A6', weight: 10 },
  uncommon: { label: '精良', color: '#3498DB', weight: 5  },
  rare:     { label: '稀有', color: '#F39C12', weight: 2  },
};

// ── 解锁条件 ────────────────────────────────────────────────────
export type UnlockCondition =
  | { type: 'always' }                              // 始终可用
  | { type: 'reach_level'; level: number }          // 到达第N关后解锁
  | { type: 'win_with_core_hp'; minHp: number };    // 核心剩余血量≥N通关后解锁

// ── 卡牌定义 ────────────────────────────────────────────────────
export interface CardDef {
  /** 全局唯一 ID，奖励池和起始卡组用此引用 */
  cardId:    string;
  type:      'resource' | 'production' | 'defense' | 'storage';
  // resource 卡专属
  resourceType?: 'iron' | 'copper';
  durability?:   number;             // 关卡耐久（每过一关-1，归零后消失）
  // 建筑卡专属
  buildingType?: BuildingType;
  // 通用展示
  name:      string;
  icon:      string;                 // emoji
  desc:      string;                 // 卡牌说明文字
  rarity:    Rarity;
  unlock:    UnlockCondition;
}

// ── 卡牌注册表 ──────────────────────────────────────────────────
export const CARD_DEFS: CardDef[] = [
  // ── 资源卡 ──
  {
    cardId: 'iron_mine',
    type: 'resource', resourceType: 'iron',
    durability: CARD_DURABILITY_DEFAULT,
    name: '铁矿', icon: '⛏️',
    desc: `放置后每秒产出1铁矿石，耐久${CARD_DURABILITY_DEFAULT}关`,
    rarity: 'common', unlock: { type: 'always' },
  },
  {
    cardId: 'copper_mine',
    type: 'resource', resourceType: 'copper',
    durability: CARD_DURABILITY_DEFAULT,
    name: '铜矿', icon: '🪨',
    desc: `放置后每秒产出1铜矿石，耐久${CARD_DURABILITY_DEFAULT}关`,
    rarity: 'common', unlock: { type: 'always' },
  },

  // ── 生产建筑卡 ──
  {
    cardId: 'furnace',
    type: 'production', buildingType: 'furnace',
    name: '熔炉', icon: '🔥',
    desc: '矿石→板材，2秒/次，需传送带连接',
    rarity: 'common', unlock: { type: 'always' },
  },
  {
    cardId: 'assembler',
    type: 'production', buildingType: 'assembler',
    name: '组装机', icon: '⚙️',
    desc: '铁板+铜板→子弹×5，1秒/次，需传送带连接',
    rarity: 'uncommon', unlock: { type: 'always' },
  },

  // ── 防御建筑卡 ──
  {
    cardId: 'gun_tower',
    type: 'defense', buildingType: 'gun_tower',
    name: '机枪塔', icon: '🔫',
    desc: '自动攻击射程内敌人，需相邻弹药箱供弹',
    rarity: 'uncommon', unlock: { type: 'always' },
  },
  {
    cardId: 'wall',
    type: 'defense', buildingType: 'wall',
    name: '围墙', icon: '🧱',
    desc: '阻挡敌人，承受伤害后摧毁',
    rarity: 'common', unlock: { type: 'always' },
  },

  // ── 储存建筑卡 ──
  {
    cardId: 'ammo_box',
    type: 'storage', buildingType: 'ammo_box',
    name: '弹药箱', icon: '📦',
    desc: '储存子弹，机枪塔需相邻弹药箱才能射击',
    rarity: 'common', unlock: { type: 'always' },
  },

  // ── 稀有卡（为后续扩展预留，当前关卡暂不出现在奖励池） ──
  {
    cardId: 'assembler_mk2',
    type: 'production', buildingType: 'assembler',
    name: '精密组装机', icon: '⚙️',
    desc: '铁板+铜板→子弹×10，1.5秒/次（高产变体）',
    rarity: 'rare', unlock: { type: 'reach_level', level: 2 },
  },
];

/** 快速查找：cardId → CardDef */
export const CARD_DEF_MAP = new Map<string, CardDef>(
  CARD_DEFS.map(c => [c.cardId, c]),
);
