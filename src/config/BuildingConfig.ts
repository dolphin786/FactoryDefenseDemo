/**
 * BuildingConfig — 建筑静态数据
 */

import { AMMO_BOX_CAPACITY, TOWER_STATS } from './BalanceConfig';

// ── 建筑类型枚举 ────────────────────────────────────────────────
export type BuildingType =
  | 'iron_ore_node'
  | 'copper_ore_node'
  | 'furnace'
  | 'assembler'
  | 'gun_tower'
  | 'wall'
  | 'ammo_box'
  | 'conveyor'
  | 'splitter'          // 分流器：1入2出，交替分流到左右
  | 'underground_in'    // 地下传送带入口
  | 'underground_out'   // 地下传送带出口
  | 'core';

// ── 资源类型 ────────────────────────────────────────────────────
export type ResourceType = 'iron_ore' | 'copper_ore' | 'iron_plate' | 'copper_plate' | 'bullet';

export const RESOURCE_COLORS: Record<ResourceType, number> = {
  iron_ore:     0x8B4513,
  copper_ore:   0xCD7F32,
  iron_plate:   0x8899AA,
  copper_plate: 0xB87333,
  bullet:       0xFFD700,
};

// ── 基础外观+血量 ───────────────────────────────────────────────
export interface BuildingCfg {
  hp:    number;
  emoji: string;
  color: number;
  name:  string;
  desc:  string;
}

export const BUILDING_CONFIGS: Record<BuildingType, BuildingCfg> = {
  iron_ore_node:   { hp: 999, emoji: '⛏️', color: 0x6D4C41, name: '铁矿',     desc: '1铁矿/秒' },
  copper_ore_node: { hp: 999, emoji: '🪨', color: 0xAD6922, name: '铜矿',     desc: '1铜矿/秒' },
  furnace:         { hp: 80,  emoji: '🔥', color: 0xC0392B, name: '熔炉',     desc: '矿→板 2s' },
  assembler:       { hp: 80,  emoji: '⚙️', color: 0x2471A3, name: '组装机',   desc: '板→子弹×5 1s' },
  gun_tower:       { hp: 50,  emoji: '🔫', color: 0x922B21, name: '机枪塔',
    desc: `射程${TOWER_STATS.range}格，${TOWER_STATS.damagePerShot}伤/发` },
  wall:            { hp: 100, emoji: '🧱', color: 0x707B7C, name: '围墙',     desc: 'HP:100' },
  ammo_box:        { hp: 60,  emoji: '📦', color: 0xD4AC0D, name: '弹药箱',   desc: `存弹${AMMO_BOX_CAPACITY}发` },
  conveyor:        { hp: 999, emoji: '→',  color: 0x4A5568, name: '传送带',   desc: '运输资源' },
  splitter:        { hp: 999, emoji: '⑂',  color: 0x2E6B4A, name: '分流器',   desc: '交替分流至两侧' },
  underground_in:  { hp: 999, emoji: '▼',  color: 0x3A2E6A, name: '地下入口', desc: '物品入地下' },
  underground_out: { hp: 999, emoji: '▲',  color: 0x3A2E6A, name: '地下出口', desc: '物品出地下' },
  core:            { hp: 200, emoji: '💎', color: 0xE67E22, name: '核心',     desc: '守护目标' },
};

// ── 有输出方向的建筑 ─────────────────────────────────────────────
export const HAS_OUTPUT_DIR: BuildingType[] = [
  'iron_ore_node', 'copper_ore_node', 'furnace', 'assembler',
  'conveyor', 'splitter', 'underground_in', 'underground_out',
];

export const MACHINE_ACCEPTS: Partial<Record<BuildingType, ResourceType[]>> = {
  furnace:   ['iron_ore', 'copper_ore'],
  assembler: ['iron_plate', 'copper_plate'],
};

/** 地下传送带最大穿越距离（格） */
export const UNDERGROUND_MAX_DIST = 8;
